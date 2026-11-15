package com.mediaforge.backend.downloader.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import static org.assertj.core.api.Assertions.*;

class YtDlpSelectionTest {
    @Test void videoSelectorsNeverFallBackToAudioOrIgnoreResolution() {
        for (String format : new String[]{"mp4", "webm"}) {
            String selector = YtDlpProcessExecutor.buildFormatSelector(format, "1080p (Full HD)", true);
            for (String branch : selector.split("/")) {
                assertThat(branch).contains("[vcodec!=none]", "[height=1080]", "[acodec!=none]");
            }
        }
        assertThat(YtDlpProcessExecutor.buildFormatSelector("webm", "720p", true)).contains("[ext=webm]");
        assertThat(YtDlpProcessExecutor.buildFormatSelector("m4a", "source", true)).doesNotContain("bestvideo");
    }

    @Test void ignoresStoryboardsAndDrmAsVideoSources() throws Exception {
        var json = new ObjectMapper().readTree("""
                {"formats":[{"ext":"mhtml","vcodec":"none","height":1080},
                {"ext":"mp4","vcodec":"h264","has_drm":true},
                {"ext":"m4a","vcodec":"none","acodec":"aac"}]}
                """);
        assertThat(YtDlpProcessExecutor.sourceHasStream(json, "vcodec")).isFalse();
        assertThat(YtDlpProcessExecutor.sourceHasStream(json, "acodec")).isTrue();
    }

    @Test void audioSourceDoesNotAdvertiseInventedVideoResolutions() throws Exception {
        var mapper = new ObjectMapper();
        var executor = new YtDlpProcessExecutor(mapper, new com.mediaforge.backend.converter.service.FFmpegProcessExecutor());
        var parser = YtDlpProcessExecutor.class.getDeclaredMethod("parseExtractorJson", String.class, java.net.URI.class);
        parser.setAccessible(true);
        String json = """
                {"ext":"m4a","formats":[{"height":27,"ext":"mhtml","vcodec":"none"},
                {"ext":"m4a","vcodec":"none","acodec":"aac"}]}
                """;
        var result = (com.mediaforge.backend.downloader.model.MediaMetadata) parser.invoke(executor, json, java.net.URI.create("https://example.com/audio"));
        assertThat(result.getMediaType()).isEqualTo("AUDIO");
        assertThat(result.getAvailableQualities()).isEmpty();
        assertThat(result.getAvailableFormats()).extracting(com.mediaforge.backend.downloader.model.MediaFormatOption::getFormat)
                .contains("m4a", "mp3").doesNotContain("mp4", "webm");
    }
}
