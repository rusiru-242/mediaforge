package com.mediaforge.backend.controller;

import com.mediaforge.backend.converter.service.ConversionProgressService;
import com.mediaforge.backend.dto.request.JobCreateRequest;
import com.mediaforge.backend.dto.response.ConversionProgressResponse;
import com.mediaforge.backend.dto.response.JobResponse;
import com.mediaforge.backend.enums.JobStatus;
import com.mediaforge.backend.service.ConversionService;
import com.mediaforge.backend.service.JobService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.util.UUID;

@RestController
@RequestMapping("/api/v1/jobs")
@Tag(name = "Job Management", description = "Endpoints for managing media processing jobs")
public class JobController {

    private final JobService jobService;
    private final ConversionService conversionService;
    private final ConversionProgressService progressService;

    public JobController(JobService jobService,
                         ConversionService conversionService,
                         ConversionProgressService progressService) {
        this.jobService = jobService;
        this.conversionService = conversionService;
        this.progressService = progressService;
    }

    @PostMapping
    @Operation(summary = "Create a new media job", description = "Initializes a media job in PENDING status")
    public ResponseEntity<JobResponse> createJob(@Valid @RequestBody JobCreateRequest request) {
        JobResponse response = jobService.createJob(request, null);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @GetMapping("/{id}")
    @Operation(summary = "Get job details by ID", description = "Retrieves current status, progress, and metadata for a job")
    public ResponseEntity<JobResponse> getJobById(
            @Parameter(description = "UUID of the media job") @PathVariable UUID id) {
        JobResponse response = jobService.getJobById(id, null);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/{id}/progress")
    @Operation(summary = "Get live conversion progress by ID", description = "Retrieves detailed progress, elapsed time, stage, and ETA for a job")
    public ResponseEntity<ConversionProgressResponse> getJobProgress(
            @Parameter(description = "UUID of the media job") @PathVariable UUID id) {
        ConversionProgressResponse response = conversionService.getConversionProgress(id);
        return ResponseEntity.ok(response);
    }

    @GetMapping(value = "/{id}/progress/sse", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    @Operation(summary = "Subscribe to live job progress via Server-Sent Events", description = "Streams real-time FFmpeg progress percentages and stage updates")
    public SseEmitter subscribeJobProgress(
            @Parameter(description = "UUID of the media job") @PathVariable UUID id) {
        return progressService.subscribe(id);
    }

    @GetMapping
    @Operation(summary = "List media jobs with pagination", description = "Returns a paginated list of media jobs, optionally filtered by status")
    public ResponseEntity<Page<JobResponse>> listJobs(
            @Parameter(description = "Optional filter by job status") @RequestParam(required = false) JobStatus status,
            @Parameter(description = "Page number (0-based)") @RequestParam(defaultValue = "0") int page,
            @Parameter(description = "Page size") @RequestParam(defaultValue = "20") int size,
            @Parameter(description = "Sort direction (ASC, DESC)") @RequestParam(defaultValue = "DESC") String direction) {

        Sort.Direction sortDir = "ASC".equalsIgnoreCase(direction) ? Sort.Direction.ASC : Sort.Direction.DESC;
        PageRequest pageRequest = PageRequest.of(Math.max(0, page), Math.min(100, Math.max(1, size)), Sort.by(sortDir, "createdAt"));
        Page<JobResponse> response = jobService.listJobs(status, null, pageRequest);
        return ResponseEntity.ok(response);
    }

    @PostMapping("/{id}/cancel")
    @Operation(summary = "Cancel an in-progress or queued job", description = "Transitions an active or pending job to CANCELLED and halts background processing")
    public ResponseEntity<JobResponse> cancelJob(
            @Parameter(description = "UUID of the job to cancel") @PathVariable UUID id) {
        JobResponse response = jobService.cancelJob(id, null);
        return ResponseEntity.ok(response);
    }
}
