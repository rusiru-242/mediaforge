package com.mediaforge.backend.entity;

import java.time.OffsetDateTime;
import java.util.UUID;

/**
 * In-memory representation of download request parameters.
 */
public class DownloadRequest {

    private UUID id;
    private MediaJob job;
    private String sourceUrl;
    private String platform;
    private String selectedFormat;
    private String selectedQuality;
    private OffsetDateTime createdAt;

    public DownloadRequest() {
        this.id = UUID.randomUUID();
        this.createdAt = OffsetDateTime.now();
    }

    public DownloadRequest(UUID id, MediaJob job, String sourceUrl, String platform, String selectedFormat, String selectedQuality) {
        this.id = id != null ? id : UUID.randomUUID();
        this.job = job;
        this.sourceUrl = sourceUrl;
        this.platform = platform;
        this.selectedFormat = selectedFormat;
        this.selectedQuality = selectedQuality;
        this.createdAt = OffsetDateTime.now();
    }

    public UUID getId() {
        return id;
    }

    public void setId(UUID id) {
        this.id = id;
    }

    public MediaJob getJob() {
        return job;
    }

    public void setJob(MediaJob job) {
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

    public OffsetDateTime getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(OffsetDateTime createdAt) {
        this.createdAt = createdAt;
    }
}
