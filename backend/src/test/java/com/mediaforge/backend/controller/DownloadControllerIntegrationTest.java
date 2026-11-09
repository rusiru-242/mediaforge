package com.mediaforge.backend.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.mediaforge.backend.dto.request.DownloadCreateRequest;
import com.mediaforge.backend.dto.request.DownloadValidateRequest;
import com.mediaforge.backend.dto.response.DownloadResponse;
import com.mediaforge.backend.dto.response.DownloadValidateResponse;
import com.mediaforge.backend.dto.response.JobResponse;
import com.mediaforge.backend.enums.JobStatus;
import com.mediaforge.backend.enums.JobType;
import com.mediaforge.backend.enums.SourceType;
import com.mediaforge.backend.exception.UrlSecurityException;
import com.mediaforge.backend.security.SecurityConfig;
import com.mediaforge.backend.service.DownloadService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(DownloadController.class)
@Import(SecurityConfig.class)
class DownloadControllerIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @MockitoBean
    private DownloadService downloadService;

    @Test
    @DisplayName("POST /api/v1/downloads/validate should validate URL successfully")
    void testValidateUrlEndpoint() throws Exception {
        DownloadValidateRequest request = new DownloadValidateRequest("https://example.com/video");
        DownloadValidateResponse response = new DownloadValidateResponse(true, "https://example.com/video",
                "example", List.of("mp4"), List.of("1080p"), "Validation passed");

        when(downloadService.validateUrl(any(DownloadValidateRequest.class))).thenReturn(response);

        mockMvc.perform(post("/api/v1/downloads/validate")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.valid").value(true))
                .andExpect(jsonPath("$.platform").value("example"));
    }

    @Test
    @DisplayName("POST /api/v1/downloads/validate should return 400 when SSRF detected")
    void testValidateUrlSsrfRejection() throws Exception {
        DownloadValidateRequest request = new DownloadValidateRequest("http://127.0.0.1/video");

        when(downloadService.validateUrl(any(DownloadValidateRequest.class)))
                .thenThrow(new UrlSecurityException("Loopback addresses are forbidden: 127.0.0.1"));

        mockMvc.perform(post("/api/v1/downloads/validate")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("URL_SECURITY_VIOLATION"));
    }

    @Test
    @DisplayName("POST /api/v1/downloads should return 202 Accepted and enqueue job")
    void testCreateDownloadEndpoint() throws Exception {
        DownloadCreateRequest request = new DownloadCreateRequest("https://example.com/video", "mp4", "720p");
        UUID jobId = UUID.randomUUID();
        JobResponse job = new JobResponse(jobId, null, JobType.DOWNLOAD, SourceType.URL,
                JobStatus.PENDING, 0, null, "mp4", null, OffsetDateTime.now(), null, null);
        DownloadResponse response = new DownloadResponse(jobId, job, "https://example.com/video", "example",
                "mp4", "720p", "PENDING", "Queued");

        when(downloadService.createDownload(any(DownloadCreateRequest.class), any())).thenReturn(response);

        mockMvc.perform(post("/api/v1/downloads")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isAccepted())
                .andExpect(jsonPath("$.jobId").value(jobId.toString()))
                .andExpect(jsonPath("$.platform").value("example"));
    }
}

