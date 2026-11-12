package com.mediaforge.backend.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.mediaforge.backend.dto.request.JobCreateRequest;
import com.mediaforge.backend.dto.response.JobResponse;
import com.mediaforge.backend.enums.JobStatus;
import com.mediaforge.backend.enums.JobType;
import com.mediaforge.backend.enums.SourceType;
import com.mediaforge.backend.exception.ResourceNotFoundException;
import com.mediaforge.backend.security.SecurityConfig;
import com.mediaforge.backend.service.JobService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.data.domain.PageImpl;
import org.springframework.http.MediaType;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(JobController.class)
@Import(SecurityConfig.class)
class JobControllerIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @MockitoBean
    private JobService jobService;

    @MockitoBean
    private com.mediaforge.backend.service.ConversionService conversionService;

    @MockitoBean
    private com.mediaforge.backend.converter.service.ConversionProgressService progressService;

    @Test
    @DisplayName("POST /api/v1/jobs should create and return 201 Created")
    void testCreateJobEndpoint() throws Exception {
        UUID jobId = UUID.randomUUID();
        JobCreateRequest request = new JobCreateRequest(JobType.DOWNLOAD, SourceType.URL, null, "mp4");
        JobResponse response = new JobResponse(jobId, null, JobType.DOWNLOAD, SourceType.URL,
                JobStatus.PENDING, 0, null, "mp4", null, OffsetDateTime.now(), null, null);

        when(jobService.createJob(any(JobCreateRequest.class), any())).thenReturn(response);

        mockMvc.perform(post("/api/v1/jobs")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.id").value(jobId.toString()))
                .andExpect(jsonPath("$.status").value("PENDING"))
                .andExpect(jsonPath("$.outputFormat").value("mp4"));
    }

    @Test
    @DisplayName("POST /api/v1/jobs should return 400 Bad Request when validation fails")
    void testCreateJobValidationFailure() throws Exception {
        JobCreateRequest request = new JobCreateRequest(null, null, null, ""); // Missing required fields

        mockMvc.perform(post("/api/v1/jobs")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("VALIDATION_FAILED"));
    }

    @Test
    @DisplayName("GET /api/v1/jobs/{id} should return 200 OK when found")
    void testGetJobByIdEndpoint() throws Exception {
        UUID jobId = UUID.randomUUID();
        JobResponse response = new JobResponse(jobId, null, JobType.CONVERSION, SourceType.UPLOAD,
                JobStatus.PROCESSING, 45, "avi", "mp4", null, OffsetDateTime.now(), null, null);

        when(jobService.getJobById(eq(jobId), any())).thenReturn(response);

        mockMvc.perform(get("/api/v1/jobs/" + jobId))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(jobId.toString()))
                .andExpect(jsonPath("$.status").value("PROCESSING"))
                .andExpect(jsonPath("$.progress").value(45));
    }

    @Test
    @DisplayName("GET /api/v1/jobs/{id} should return 404 Not Found when missing")
    void testGetJobNotFoundEndpoint() throws Exception {
        UUID jobId = UUID.randomUUID();
        when(jobService.getJobById(eq(jobId), any())).thenThrow(new ResourceNotFoundException("Job not found: " + jobId));

        mockMvc.perform(get("/api/v1/jobs/" + jobId))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.code").value("RESOURCE_NOT_FOUND"));
    }

    @Test
    @DisplayName("POST /api/v1/jobs/{id}/cancel should return 200 OK and cancelled status")
    void testCancelJobEndpoint() throws Exception {
        UUID jobId = UUID.randomUUID();
        JobResponse response = new JobResponse(jobId, null, JobType.DOWNLOAD, SourceType.URL,
                JobStatus.CANCELLED, 10, null, "mp4", null, OffsetDateTime.now(), null, OffsetDateTime.now());

        when(jobService.cancelJob(eq(jobId), any())).thenReturn(response);

        mockMvc.perform(post("/api/v1/jobs/" + jobId + "/cancel"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("CANCELLED"));
    }

    @Test
    @DisplayName("GET /api/v1/jobs should return paginated list")
    void testListJobsEndpoint() throws Exception {
        UUID jobId = UUID.randomUUID();
        JobResponse response = new JobResponse(jobId, null, JobType.DOWNLOAD, SourceType.URL,
                JobStatus.QUEUED, 0, null, "mp3", null, OffsetDateTime.now(), null, null);

        when(jobService.listJobs(any(), any(), any())).thenReturn(new PageImpl<>(List.of(response)));

        mockMvc.perform(get("/api/v1/jobs"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content[0].id").value(jobId.toString()));
    }
}
