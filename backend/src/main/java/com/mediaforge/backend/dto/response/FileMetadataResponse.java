package com.mediaforge.backend.dto.response;

import java.time.OffsetDateTime;
import java.util.UUID;

public class FileMetadataResponse {

    private UUID id;
    private UUID jobId;
    private String originalFilename;
    private String storedFilename;
    private String mimeType;
    private Long fileSize;
    private OffsetDateTime createdAt;
    private OffsetDateTime expiresAt;

    public FileMetadataResponse() {
    }

    public FileMetadataResponse(UUID id, UUID jobId, String originalFilename, String storedFilename,
                                String mimeType, Long fileSize, OffsetDateTime createdAt, OffsetDateTime expiresAt) {
        this.id = id;
        this.jobId = jobId;
        this.originalFilename = originalFilename;
        this.storedFilename = storedFilename;
        this.mimeType = mimeType;
        this.fileSize = fileSize;
        this.createdAt = createdAt;
        this.expiresAt = expiresAt;
    }

    public UUID getId() {
        return id;
    }

    public void setId(UUID id) {
        this.id = id;
    }

    public UUID getJobId() {
        return jobId;
    }

    public void setJobId(UUID jobId) {
        this.jobId = jobId;
    }

    public String getOriginalFilename() {
        return originalFilename;
    }

    public void setOriginalFilename(String originalFilename) {
        this.originalFilename = originalFilename;
    }

    public String getStoredFilename() {
        return storedFilename;
    }

    public void setStoredFilename(String storedFilename) {
        this.storedFilename = storedFilename;
    }

    public String getMimeType() {
        return mimeType;
    }

    public void setMimeType(String mimeType) {
        this.mimeType = mimeType;
    }

    public Long getFileSize() {
        return fileSize;
    }

    public void setFileSize(Long fileSize) {
        this.fileSize = fileSize;
    }

    public OffsetDateTime getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(OffsetDateTime createdAt) {
        this.createdAt = createdAt;
    }

    public OffsetDateTime getExpiresAt() {
        return expiresAt;
    }

    public void setExpiresAt(OffsetDateTime expiresAt) {
        this.expiresAt = expiresAt;
    }
}

