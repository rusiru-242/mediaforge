package com.mediaforge.backend.service;

import com.mediaforge.backend.dto.response.FormatListResponse;
import com.mediaforge.backend.service.impl.FormatServiceImpl;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;

class FormatServiceTest {

    private FormatService formatService;

    @BeforeEach
    void setUp() {
        formatService = new FormatServiceImpl();
    }

    @Test
    @DisplayName("Should return all format categories")
    void testGetAllFormats() {
        Map<String, List<String>> formats = formatService.getAllFormats();
        assertNotNull(formats);
        assertTrue(formats.containsKey("video"));
        assertTrue(formats.containsKey("audio"));
        assertTrue(formats.containsKey("image"));

        assertTrue(formats.get("video").contains("mp4"));
        assertTrue(formats.get("audio").contains("mp3"));
        assertTrue(formats.get("image").contains("png"));
    }

    @Test
    @DisplayName("Should return video formats")
    void testGetVideoFormats() {
        FormatListResponse res = formatService.getVideoFormats();
        assertEquals("video", res.getCategory());
        assertTrue(res.getFormats().contains("mp4"));
        assertTrue(res.getFormats().contains("mkv"));
    }

    @Test
    @DisplayName("Should return audio formats")
    void testGetAudioFormats() {
        FormatListResponse res = formatService.getAudioFormats();
        assertEquals("audio", res.getCategory());
        assertTrue(res.getFormats().contains("mp3"));
        assertTrue(res.getFormats().contains("flac"));
    }

    @Test
    @DisplayName("Should return image formats")
    void testGetImageFormats() {
        FormatListResponse res = formatService.getImageFormats();
        assertEquals("image", res.getCategory());
        assertTrue(res.getFormats().contains("webp"));
        assertTrue(res.getFormats().contains("jpg"));
    }
}
