package com.mediaforge.backend.converter.service;

import com.mediaforge.backend.converter.model.ConversionOptions;
import com.mediaforge.backend.converter.model.ConversionResult;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;

import java.io.File;
import java.nio.file.Path;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;

class VideoConversionServiceTest {

    private VideoConversionServiceImpl videoService;

    @Mock
    private MediaProbeService probeService;

    @TempDir
    Path tempDir;

    @BeforeEach
    void setUp() {
        MockitoAnnotations.openMocks(this);
        FFmpegProcessExecutor executor = new FFmpegProcessExecutor();
        MediaProbeServiceImpl realProbe = new MediaProbeServiceImpl(new com.fasterxml.jackson.databind.ObjectMapper());
        videoService = new VideoConversionServiceImpl(executor, realProbe);
    }

    @Test
    @DisplayName("Should verify supported video formats")
    void testSupportsFormat() {
        assertTrue(videoService.supportsFormat("mp4"));
        assertTrue(videoService.supportsFormat("webm"));
        assertTrue(videoService.supportsFormat("mkv"));
        assertTrue(videoService.supportsFormat("mov"));
        assertTrue(videoService.supportsFormat("avi"));
        assertFalse(videoService.supportsFormat("mp3"));
        assertFalse(videoService.supportsFormat("xyz"));
    }

    @Test
    @DisplayName("Should convert sample MP4 to WebM using actual FFmpeg")
    void testConvertMp4ToWebm() throws Exception {
        File fixture = new File("src/test/resources/fixtures/sample.mp4");
        if (fixture.exists()) {
            File output = tempDir.resolve("output.webm").toFile();
            ConversionOptions options = new ConversionOptions();
            options.setQualityPreset("ultrafast");

            ConversionResult result = videoService.convertVideo(
                    UUID.randomUUID(),
                    fixture,
                    output,
                    "webm",
                    options,
                    null
            );

            assertNotNull(result);
            assertTrue(result.isSuccess());
            assertTrue(output.exists());
            assertTrue(output.length() > 0);
            assertEquals("video/webm", result.getMimeType());
        }
    }
}
