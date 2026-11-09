package com.mediaforge.backend.controller;

import com.mediaforge.backend.dto.response.FormatListResponse;
import com.mediaforge.backend.security.SecurityConfig;
import com.mediaforge.backend.service.FormatService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.util.List;
import java.util.Map;

import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(FormatController.class)
@Import(SecurityConfig.class)
class FormatControllerIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private FormatService formatService;

    @Test
    @DisplayName("GET /api/v1/formats should return all format maps")
    void testGetAllFormatsEndpoint() throws Exception {
        when(formatService.getAllFormats()).thenReturn(Map.of(
                "video", List.of("mp4", "webm"),
                "audio", List.of("mp3", "flac")
        ));

        mockMvc.perform(get("/api/v1/formats"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.video[0]").value("mp4"))
                .andExpect(jsonPath("$.audio[0]").value("mp3"));
    }

    @Test
    @DisplayName("GET /api/v1/formats/video should return video format list")
    void testGetVideoFormatsEndpoint() throws Exception {
        when(formatService.getVideoFormats()).thenReturn(new FormatListResponse("video", List.of("mp4", "webm")));

        mockMvc.perform(get("/api/v1/formats/video"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.category").value("video"))
                .andExpect(jsonPath("$.formats[0]").value("mp4"));
    }
}
