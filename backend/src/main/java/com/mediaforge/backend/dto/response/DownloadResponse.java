package com.mediaforge.backend.dto.response;

import java.util.UUID;

public class DownloadResponse {

    private UUID jobId;
    private JobResponse job;
    private String sourceUrl;
    private String platform;
    private String selectedFormat;
    private String selectedQuality;
    private String status;
    private String message;

    public DownloadResponse() {
    }

    public DownloadResponse(UUID jobId, JobResponse job, String sourceUrl, String platform,
                            String selectedFormat, String selectedQuality, String status, String message) {
        this.jobId = jobId;
        this.job = job;
        this.sourceUrl = sourceUrl;
        this.platform = platform;
        this.selectedFormat = selectedFormat;
        this.selectedQuality = selectedQuality;
        this.status = status;
        this.message = message;
    }

    public UUID getJobId() {
        return jobId;
    }

    public void setJobId(UUID jobId) {
        this.jobId = jobId;
    }

    public JobResponse getJob() {
        return job;
    }

    public void setJob(JobResponse job) {
        this.job = job;
    }

    public String getSourceUrl() {
        return sourceUrl;
    }

    public void setSourceUrl(String sourceUrl) {
        this.sourceUrl = sourceUrl;
    }

    public String getPlatform() {
        return platform;
    }

    public void setPlatform(String platform) {
        this.platform = platform;
    }

    public String getSelectedFormat() {
        return selectedFormat;
    }

    public void setSelectedFormat(String selectedFormat) {
        this.selectedFormat = selectedFormat;
    }

    public String getSelectedQuality() {
        return selectedQuality;
    }

    public void setSelectedQuality(String selectedQuality) {
        this.selectedQuality = selectedQuality;
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

