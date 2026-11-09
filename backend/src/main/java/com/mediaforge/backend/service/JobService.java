package com.mediaforge.backend.service;

import com.mediaforge.backend.dto.request.JobCreateRequest;
import com.mediaforge.backend.dto.response.JobResponse;
import com.mediaforge.backend.enums.JobStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.util.UUID;

public interface JobService {
    JobResponse createJob(JobCreateRequest request, UUID requestingUserId);
    JobResponse getJobById(UUID id, UUID requestingUserId);
    Page<JobResponse> listJobs(JobStatus status, UUID requestingUserId, Pageable pageable);
    JobResponse cancelJob(UUID id, UUID requestingUserId);
    JobResponse updateProgress(UUID id, int progress);
    JobResponse updateStatus(UUID id, JobStatus newStatus, String errorMessage);
}
