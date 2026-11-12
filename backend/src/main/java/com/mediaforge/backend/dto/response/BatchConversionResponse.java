package com.mediaforge.backend.dto.response;

import java.util.List;
import java.util.UUID;

public class BatchConversionResponse {

    private UUID batchId;
    private int totalJobs;
    private List<JobResponse> jobs;
    private String status;
    private String message;

    public BatchConversionResponse() {
    }

    public BatchConversionResponse(UUID batchId, int totalJobs, List<JobResponse> jobs, String status, String message) {
        this.batchId = batchId;
        this.totalJobs = totalJobs;
        this.jobs = jobs;
        this.status = status;
        this.message = message;
    }

    public UUID getBatchId() {
        return batchId;
    }

    public void setBatchId(UUID batchId) {
        this.batchId = batchId;
    }

    public int getTotalJobs() {
        return totalJobs;
    }

    public void setTotalJobs(int totalJobs) {
        this.totalJobs = totalJobs;
    }

    public List<JobResponse> getJobs() {
        return jobs;
    }

    public void setJobs(List<JobResponse> jobs) {
        this.jobs = jobs;
    }

    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
    }

    public String getMessage() {
        return message;
    }

    public void setMessage(String message) {
        this.message = message;
    }
}
