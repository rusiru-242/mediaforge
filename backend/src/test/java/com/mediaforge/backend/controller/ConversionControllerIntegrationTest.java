package com.mediaforge.backend.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.mediaforge.backend.dto.request.BatchConversionRequest;
import com.mediaforge.backend.dto.request.ConversionCreateRequest;
import com.mediaforge.backend.dto.response.BatchConversionResponse;
import com.mediaforge.backend.dto.response.ConversionResponse;
import com.mediaforge.backend.dto.response.JobResponse;
import com.mediaforge.backend.enums.JobStatus;
import com.mediaforge.backend.enums.JobType;
import com.mediaforge.backend.enums.SourceType;
import com.mediaforge.backend.security.SecurityConfig;
import com.mediaforge.backend.service.ConversionService;
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
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(ConversionController.class)
@Import(SecurityConfig.class)
class ConversionControllerIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @MockitoBean
    private ConversionService conversionService;

    @Test
    @DisplayName("POST /api/v1/conversions should submit job and return 202 ACCEPTED")
    void testCreateConversion() throws Exception {
        UUID jobId = UUID.randomUUID();
        UUID inputFileId = UUID.randomUUID();
        ConversionCreateRequest request = new ConversionCreateRequest(inputFileId, "mp4", "webm", "720p", 192);

        JobResponse jobResponse = new JobResponse(jobId, null, JobType.CONVERSION, SourceType.UPLOAD,
                JobStatus.QUEUED, 0, "mp4", "webm", null, OffsetDateTime.now(), null, null);

        ConversionResponse response = new ConversionResponse(jobId, jobResponse, "webm", "720p", 192,
                JobStatus.QUEUED.name(), "Job queued successfully");

        when(conversionService.createConversion(any(ConversionCreateRequest.class), any())).thenReturn(response);

        mockMvc.perform(post("/api/v1/conversions")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isAccepted())
                .andExpect(jsonPath("$.jobId").value(jobId.toString()))
                .andExpect(jsonPath("$.status").value("QUEUED"))
                .andExpect(jsonPath("$.targetFormat").value("webm"));
    }

    @Test
    @DisplayName("POST /api/v1/conversions/batch should submit batch and return 202 ACCEPTED")
    void testCreateBatchConversion() throws Exception {
        UUID batchId = UUID.randomUUID();
        UUID inputFileId = UUID.randomUUID();
        ConversionCreateRequest item = new ConversionCreateRequest(inputFileId, "mp4", "mp3", null, 192);
        BatchConversionRequest batchReq = new BatchConversionRequest(List.of(item));

        BatchConversionResponse batchResp = new BatchConversionResponse(batchId, 1, List.of(), "QUEUED", "Batch submitted");
        when(conversionService.createBatchConversion(any(BatchConversionRequest.class), any())).thenReturn(batchResp);

        mockMvc.perform(post("/api/v1/conversions/batch")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(batchReq)))
                .andExpect(status().isAccepted())
                .andExpect(jsonPath("$.batchId").value(batchId.toString()))
                .andExpect(jsonPath("$.totalJobs").value(1));
    }

    @Test
    @DisplayName("GET /api/v1/conversions/formats should return supported catalog")
    void testGetFormats() throws Exception {
        mockMvc.perform(get("/api/v1/conversions/formats"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.videoFormats").isArray())
                .andExpect(jsonPath("$.audioFormats").isArray())
                .andExpect(jsonPath("$.imageFormats").isArray());
    }
}
