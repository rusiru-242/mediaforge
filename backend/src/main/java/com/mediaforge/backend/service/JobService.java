package com.mediaforge.backend.service;

import com.mediaforge.backend.dto.request.JobCreateRequest;
import com.mediaforge.backend.dto.response.JobResponse;
import com.mediaforge.backend.dto.response.PageResponse;
import com.mediaforge.backend.enums.JobStatus;

import java.util.UUID;

public interface JobService {
    JobResponse createJob(JobCreateRequest request);
    default JobResponse createJob(JobCreateRequest request, UUID unusedUserId) {
        return createJob(request);
    }

    JobResponse getJobById(UUID id);
    default JobResponse getJobById(UUID id, UUID unusedUserId) {
        return getJobById(id);
    }

    PageResponse<JobResponse> listJobs(JobStatus status, int page, int size);
    default PageResponse<JobResponse> listJobs(JobStatus status, UUID unusedUserId, int page, int size) {
        return listJobs(status, page, size);
    }

    JobResponse cancelJob(UUID id);
    default JobResponse cancelJob(UUID id, UUID unusedUserId) {
        return cancelJob(id);
    }

    JobResponse updateProgress(UUID id, int progress);
    JobResponse updateStatus(UUID id, JobStatus newStatus, String errorMessage);
}
