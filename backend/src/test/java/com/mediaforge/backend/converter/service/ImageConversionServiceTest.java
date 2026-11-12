package com.mediaforge.backend.converter.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.mediaforge.backend.converter.model.ConversionOptions;
import com.mediaforge.backend.converter.model.ConversionResult;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;

import java.io.File;
import java.nio.file.Path;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;

class ImageConversionServiceTest {

    private ImageConversionServiceImpl imageService;

    @TempDir
    Path tempDir;

    @BeforeEach
    void setUp() {
        FFmpegProcessExecutor executor = new FFmpegProcessExecutor();
        MediaProbeServiceImpl realProbe = new MediaProbeServiceImpl(new ObjectMapper());
        imageService = new ImageConversionServiceImpl(executor, realProbe);
    }

    @Test
    @DisplayName("Should verify supported image formats")
    void testSupportsFormat() {
        assertTrue(imageService.supportsFormat("jpg"));
        assertTrue(imageService.supportsFormat("jpeg"));
        assertTrue(imageService.supportsFormat("png"));
        assertTrue(imageService.supportsFormat("webp"));
        assertTrue(imageService.supportsFormat("avif"));
        assertFalse(imageService.supportsFormat("mp4"));
    }

    @Test
    @DisplayName("Should convert sample PNG to WebP with resize")
    void testConvertPngToWebp() throws Exception {
        File fixture = new File("src/test/resources/fixtures/sample.png");
        if (fixture.exists()) {
            File output = tempDir.resolve("output.webp").toFile();
            ConversionOptions options = new ConversionOptions();
            options.setImageWidth(160);
            options.setImageQuality(80);

            ConversionResult result = imageService.convertImage(
                    UUID.randomUUID(),
                    fixture,
                    output,
                    "webp",
                    options,
                    null
            );

            assertNotNull(result);
            assertTrue(result.isSuccess());
            assertTrue(output.exists());
            assertTrue(output.length() > 0);
            assertEquals("image/webp", result.getMimeType());
        }
    }
}
