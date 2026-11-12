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

class AudioConversionServiceTest {

    private AudioConversionServiceImpl audioService;

    @TempDir
    Path tempDir;

    @BeforeEach
    void setUp() {
        FFmpegProcessExecutor executor = new FFmpegProcessExecutor();
        MediaProbeServiceImpl realProbe = new MediaProbeServiceImpl(new ObjectMapper());
        audioService = new AudioConversionServiceImpl(executor, realProbe);
    }

    @Test
    @DisplayName("Should verify supported audio formats")
    void testSupportsFormat() {
        assertTrue(audioService.supportsFormat("mp3"));
        assertTrue(audioService.supportsFormat("wav"));
        assertTrue(audioService.supportsFormat("aac"));
        assertTrue(audioService.supportsFormat("flac"));
        assertTrue(audioService.supportsFormat("m4a"));
        assertTrue(audioService.supportsFormat("ogg"));
        assertFalse(audioService.supportsFormat("mp4"));
    }

    @Test
    @DisplayName("Should extract MP3 audio from MP4 video using FFmpeg")
    void testExtractMp3FromMp4() throws Exception {
        File fixture = new File("src/test/resources/fixtures/sample.mp4");
        if (fixture.exists()) {
            File output = tempDir.resolve("extracted.mp3").toFile();
            ConversionOptions options = new ConversionOptions();
            options.setAudioBitrate(192);

            ConversionResult result = audioService.convertAudio(
                    UUID.randomUUID(),
                    fixture,
                    output,
                    "mp3",
                    options,
                    null
            );

            assertNotNull(result);
            assertTrue(result.isSuccess());
            assertTrue(output.exists());
            assertTrue(output.length() > 0);
            assertEquals("audio/mpeg", result.getMimeType());
        }
    }

    @Test
    @DisplayName("Should transcode WAV to MP3 using FFmpeg")
    void testTranscodeWavToMp3() throws Exception {
        File fixture = new File("src/test/resources/fixtures/sample.wav");
        if (fixture.exists()) {
            File output = tempDir.resolve("converted.mp3").toFile();
            ConversionOptions options = new ConversionOptions();
            options.setAudioBitrate(128);

            ConversionResult result = audioService.convertAudio(
                    UUID.randomUUID(),
                    fixture,
                    output,
                    "mp3",
                    options,
                    null
            );

            assertNotNull(result);
            assertTrue(result.isSuccess());
            assertTrue(output.exists());
            assertTrue(output.length() > 0);
        }
    }
}
