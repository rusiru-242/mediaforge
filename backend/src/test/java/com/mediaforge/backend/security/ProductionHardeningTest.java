package com.mediaforge.backend.security;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.mediaforge.backend.config.MediaRuntimeHealthIndicator;
import com.mediaforge.backend.config.ProductionSafetyConfiguration;
import com.mediaforge.backend.downloader.service.MediaDownloadService;
import com.mediaforge.backend.downloader.service.MediaMetadataService;
import com.mediaforge.backend.dto.request.DownloadValidateRequest;
import com.mediaforge.backend.exception.UrlSecurityException;
import com.mediaforge.backend.mapper.JobMapper;
import com.mediaforge.backend.repository.*;
import com.mediaforge.backend.service.impl.DownloadServiceImpl;
import com.mediaforge.backend.validation.UrlSecurityValidator;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import org.springframework.mock.web.*;
import org.springframework.test.util.ReflectionTestUtils;
import java.net.URI;
import java.nio.file.Path;
import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;

class ProductionHardeningTest {
    @TempDir Path directory;
    @Test void healthAndAdmissionFailClosedWhenStorageOrToolsAreMissing() throws Exception {
        var indicator = new MediaRuntimeHealthIndicator(directory.toString(), Long.MAX_VALUE,
                "missing-ffmpeg", "missing-ffprobe", "missing-extractor", true);
        assertThat(indicator.health().getStatus().getCode()).isEqualTo("DOWN");
        var response = new MockHttpServletResponse();
        new StorageAdmissionFilter(indicator, new ObjectMapper().findAndRegisterModules()).doFilter(
                new MockHttpServletRequest("POST", "/api/v1/files/upload"), response,
                (req, res) -> { throw new AssertionError("Storage failure must reject upload"); });
        assertThat(response.getStatus()).isEqualTo(503);
        assertThat(response.getContentAsString()).contains("STORAGE_UNAVAILABLE").doesNotContain(directory.toString());
        var missing = new MediaRuntimeHealthIndicator(directory.toString(), 0,
                "missing-ffmpeg", "missing-ffprobe", "missing-extractor", true);
        assertThat(missing.health().getStatus().getCode()).isEqualTo("DOWN");
    }
    @Test void forwardingHeadersCannotCreateNewRateLimitIdentitiesAndHealthIsExempt() throws Exception {
        var filter = new RateLimitingFilter(1);
        for (int i = 0; i < 2; i++) {
            var request = new MockHttpServletRequest("POST", "/api/v1/downloads");
            request.setRemoteAddr("203.0.113.10");
            request.addHeader("X-Forwarded-For", "198.51.100." + i + ", 1.1.1.1");
            var response = new MockHttpServletResponse();
            filter.doFilter(request, response, (req, res) -> {});
            assertThat(response.getStatus()).isEqualTo(i == 0 ? 200 : 429);
        }
        for (int i = 0; i < 5; i++) {
            var response = new MockHttpServletResponse();
            filter.doFilter(new MockHttpServletRequest("GET", "/actuator/health"), response, (req, res) -> {});
            assertThat(response.getStatus()).isEqualTo(200);
        }
    }
    @Test void productionRejectsWildcardHttpAndPathBearingCors() {
        for (String origin : new String[]{"*", "http://site.example.com", "https://site.example.com/path"}) {
            var config = new ProductionSafetyConfiguration();
            ReflectionTestUtils.setField(config, "origins", origin);
            assertThatThrownBy(() -> ReflectionTestUtils.invokeMethod(config, "validateOrigins"))
                    .isInstanceOf(IllegalStateException.class);
        }
    }
    @Test void removedPlatformsCannotReachProductionExtractor() {
        var validator = mock(UrlSecurityValidator.class);
        when(validator.validate(anyString())).thenAnswer(call -> URI.create(call.getArgument(0)));
        var metadata = mock(MediaMetadataService.class);
        var service = new DownloadServiceImpl(validator, metadata, mock(MediaDownloadService.class),
                mock(MediaJobRepository.class), mock(DownloadRequestRepository.class),
                mock(JobEventRepository.class), mock(JobMapper.class));
        ReflectionTestUtils.setField(service, "allowedPlatforms", "youtube,facebook,instagram");
        for (String url : new String[]{"https://x.com/user/status/1", "https://www.tiktok.com/@user/video/1",
                "https://example.com/video.mp4"}) {
            assertThatThrownBy(() -> service.getMetadata(new DownloadValidateRequest(url)))
                    .isInstanceOf(UrlSecurityException.class);
        }
        verifyNoInteractions(metadata);
    }
}
