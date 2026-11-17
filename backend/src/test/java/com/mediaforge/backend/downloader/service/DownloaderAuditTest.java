package com.mediaforge.backend.downloader.service;

import com.mediaforge.backend.downloader.model.PlatformUrls;
import com.mediaforge.backend.converter.service.OutputSizeEstimationServiceImpl;
import com.mediaforge.backend.dto.request.SizeEstimationRequest;
import com.mediaforge.backend.validation.UrlSecurityValidator;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import java.net.URI;
import static org.assertj.core.api.Assertions.*;

class DownloaderAuditTest {
    @ParameterizedTest @CsvSource({"https://youtu.be/owned,youtube", "https://m.youtube.com/shorts/owned,youtube",
            "https://vm.tiktok.com/owned,tiktok", "https://vt.tiktok.com/owned,tiktok", "https://fb.watch/owned,facebook",
            "https://www.facebook.com/reel/123,facebook", "https://www.instagram.com/reels/owned,instagram",
            "https://x.com/owner/status/123,twitter", "https://twitter.com/owner/status/123,twitter",
            "https://t.co/owned,twitter", "https://example.com/youtube.com.mp4,direct", "https://notyoutube.com/video,direct"})
    void identifiesOnlyRealPlatformHosts(String url, String platform) { assertThat(PlatformUrls.platform(URI.create(url))).isEqualTo(platform); }

    @Test void normalizationKeepsIdentifiersAndRejectsEmbeddedCredentials() {
        assertThat(PlatformUrls.normalize(URI.create("https://example.com/video%20clip.mp4?token=a%2Fb&v=123#player")).toString())
                .isEqualTo("https://example.com/video%20clip.mp4?token=a%2Fb&v=123");
        assertThatThrownBy(() -> new UrlSecurityValidator().validate("https://user:secret@example.com/clip"))
                .hasMessageContaining("Credentials");
    }
    @Test void apiErrorsDoNotLeakInternalPathsOrSignedUrls() {
        assertThat(ExtractorErrors.redact("Failed https://host/video?token=SECRET C:\\private\\source.mp4"))
                .doesNotContain("SECRET", "private", "source.mp4").contains("[remote URL]", "[local path]");
    }

    @ParameterizedTest @CsvSource({"HTTP Error 429: Too Many Requests,RATE_LIMITED", "worker 429 started,EXTRACTOR_FAILURE",
            "private video,PRIVATE_CONTENT", "login required,LOGIN_REQUIRED",
            "Sign in to confirm your age,LOGIN_REQUIRED",
            "Sign in to confirm you're not a bot,SOURCE_ACCESS_DENIED",
            "HTTP Error 503: Service Unavailable,UPSTREAM_FAILURE",
            "not available in your country,REGION_RESTRICTED", "HTTP 404,MEDIA_UNAVAILABLE", "connection timed out,NETWORK_FAILURE",
            "unsupported URL,UNSUPPORTED_MEDIA", "Unexpected response from webpage request,SOURCE_ACCESS_DENIED", "DRM protected,DRM_PROTECTED"})
    void classifiesFailuresWithoutLeakingSecrets(String raw, String code) {
        assertThat(ExtractorErrors.describe(raw+" https://example.com/?token=SECRET C:\\private\\file"))
                .contains(code).doesNotContain("SECRET", "private\\file");
    }

    @Test void retriesOnlyTransientExtractorFailures() {
        assertThat(ExtractorErrors.isRetryable("HTTP Error 503: Service Unavailable")).isTrue();
        assertThat(ExtractorErrors.isRetryable("Read timed out")).isTrue();
        assertThat(ExtractorErrors.isRetryable("HTTP Error 429: Too Many Requests")).isFalse();
        assertThat(ExtractorErrors.isRetryable("Sign in to confirm you're not a bot")).isFalse();
        assertThat(ExtractorErrors.isRetryable("HTTP Error 403: Forbidden")).isFalse();
        assertThat(ExtractorErrors.isRetryable("CAPTCHA verification required")).isFalse();
    }

    @Test void estimatesOnlyKnownEncodingAndDuration() {
        var service = new OutputSizeEstimationServiceImpl(null,null,null);
        var request = new SizeEstimationRequest(); request.setEstimationContext("download");
        request.setMediaType("audio"); request.setOutputFormat("mp3"); request.setAudioBitrate(192);
        assertThat(service.estimateSize(request).getEstimationMethod()).isEqualTo("UNAVAILABLE");
        request.setSourceDuration(10.0);
        assertThat(service.estimateSize(request).getEstimatedBytes()).isEqualTo(244800L);
        request.setStartTime(2.0); request.setEndTime(7.0);
        assertThat(service.estimateSize(request).getEstimatedBytes()).isEqualTo(122400L);
        request.setMediaType("video"); request.setOutputFormat("mp4");
        assertThat(service.estimateSize(request).getEstimationMethod()).isEqualTo("UNAVAILABLE");
        request.setVideoBitrate("1000k");
        assertThat(service.estimateSize(request).getEstimatedBytes()).isEqualTo((long)(5 * 1192000 / 8.0 * 1.015));
        request.setCrf(23);
        assertThat(service.estimateSize(request).getEstimationMethod()).isEqualTo("UNAVAILABLE");
    }

    @Test void rejectsPrivateManifestUrlsFromExtractor() throws Exception {
        var extractor = new YtDlpProcessExecutor(new ObjectMapper(), new com.mediaforge.backend.converter.service.FFmpegProcessExecutor());
        assertThatThrownBy(() -> extractor.validateExtractedUrls(new ObjectMapper().readTree("{\"formats\":[{\"url\":\"http://127.0.0.1/secret\"}]}")))
                .hasMessageContaining("unsafe");
        assertThatThrownBy(() -> extractor.validateExtractedUrls(new ObjectMapper().readTree("{\"url\":\"file:///etc/passwd\"}")))
                .hasMessageContaining("unsafe");
    }
    @Test void metadataDoesNotPresentLargestSeparateStreamAsCompleteFileSize() throws Exception {
        var extractor=new YtDlpProcessExecutor(new ObjectMapper(),new com.mediaforge.backend.converter.service.FFmpegProcessExecutor());
        var method=YtDlpProcessExecutor.class.getDeclaredMethod("parseExtractorJson",String.class,URI.class);method.setAccessible(true);
        String json="""
            {"title":"Owned clip","ext":"mp4","duration":10,"formats":[
            {"format_id":"video","ext":"mp4","vcodec":"h264","acodec":"none","height":720,"filesize":100000},
            {"format_id":"audio","ext":"m4a","vcodec":"none","acodec":"aac","filesize":15000}]}
            """;
        var metadata=(com.mediaforge.backend.downloader.model.MediaMetadata)method.invoke(extractor,json,URI.create("https://instagram.com/reel/owned"));
        assertThat(metadata.getTitle()).isEqualTo("Owned clip");
        assertThat(metadata.getFileSize()).isNull();
        assertThat(metadata.getSourceName()).isEqualTo("instagram");
        assertThat(metadata.getAvailableQualities()).containsExactly("720p (HD)");
    }

    @Test void invalidExtractorJsonDoesNotExposeRawSourceDetails() throws Exception {
        var extractor = new YtDlpProcessExecutor(new ObjectMapper(), new com.mediaforge.backend.converter.service.FFmpegProcessExecutor());
        var method = YtDlpProcessExecutor.class.getDeclaredMethod("parseExtractorJson", String.class, URI.class);
        method.setAccessible(true);
        var metadata = (com.mediaforge.backend.downloader.model.MediaMetadata) method.invoke(extractor,
                "https://example.com/watch?token=SECRET", URI.create("https://www.youtube.com/watch?v=owned"));

        assertThat(metadata.getMessage()).contains("EXTRACTOR_FAILURE").doesNotContain("SECRET", "example.com");
    }
}
