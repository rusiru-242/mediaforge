package com.mediaforge.backend.converter.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.mediaforge.backend.converter.model.MediaProbeResult;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.io.File;

import static org.junit.jupiter.api.Assertions.*;

class MediaProbeServiceTest {

    private MediaProbeServiceImpl probeService;

    @BeforeEach
    void setUp() {
        probeService = new MediaProbeServiceImpl(new ObjectMapper());
    }

    @Test
    @DisplayName("Should detect FFprobe binary availability")
    void testAvailability() {
        assertTrue(probeService.isAvailable(), "FFprobe should be available on the environment");
    }

    @Test
    @DisplayName("Should accurately probe sample MP4 fixture")
    void testProbeMp4Fixture() {
        File fixture = new File("src/test/resources/fixtures/sample.mp4");
        if (fixture.exists()) {
            MediaProbeResult result = probeService.probe(fixture);
            assertNotNull(result);
            assertTrue(result.hasVideo());
            assertTrue(result.hasAudio());
            assertEquals(320, result.getWidth());
            assertEquals(240, result.getHeight());
            assertTrue(result.getDurationSeconds() > 0.5);
        }
    }

    @Test
    @DisplayName("Should accurately probe sample WAV fixture")
    void testProbeWavFixture() {
        File fixture = new File("src/test/resources/fixtures/sample.wav");
        if (fixture.exists()) {
            MediaProbeResult result = probeService.probe(fixture);
            assertNotNull(result);
            assertFalse(result.hasVideo());
            assertTrue(result.hasAudio());
            assertEquals(1, result.getAudioStreams().size());
        }
    }
}
