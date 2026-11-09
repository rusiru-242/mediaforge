package com.mediaforge.backend.entity;

import jakarta.persistence.*;
import java.time.OffsetDateTime;
import java.util.UUID;

@Entity
@Table(name = "download_requests")
public class DownloadRequest {

    @Id
    @Column(name = "id", nullable = false, updatable = false)
    private UUID id;

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "job_id", nullable = false)
    private MediaJob job;

    @Column(name = "source_url", nullable = false, columnDefinition = "TEXT")
    private String sourceUrl;

    @Column(name = "platform", nullable = false, length = 50)
    private String platform;

    @Column(name = "selected_format", nullable = false, length = 20)
    private String selectedFormat;

    @Column(name = "selected_quality", nullable = false, length = 20)
    private String selectedQuality;

    @Column(name = "created_at", nullable = false, updatable = false)
    private OffsetDateTime createdAt;

    public DownloadRequest() {
    }

    public DownloadRequest(UUID id, MediaJob job, String sourceUrl, String platform, String selectedFormat, String selectedQuality) {
        this.id = id != null ? id : UUID.randomUUID();
        this.job = job;
        this.sourceUrl = sourceUrl;
        this.platform = platform;
        this.selectedFormat = selectedFormat;
        this.selectedQuality = selectedQuality;
    }

    @PrePersist
    protected void onCreate() {
        if (id == null) {
            id = UUID.randomUUID();
        }
        if (createdAt == null) {
            createdAt = OffsetDateTime.now();
        }
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

