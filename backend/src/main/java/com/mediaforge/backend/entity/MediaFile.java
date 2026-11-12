package com.mediaforge.backend.entity;

import java.time.OffsetDateTime;
import java.util.UUID;

/**
 * In-memory representation of a stored media file.
 */
public class MediaFile {

    private UUID id;
    private MediaJob job;
    private String originalFilename;
    private String storedFilename;
    private String storageKey;
    private String mimeType;
    private Long fileSize;
    private String accessToken;
    private OffsetDateTime createdAt;
    private OffsetDateTime expiresAt;

    public MediaFile() {
        this.id = UUID.randomUUID();
        this.createdAt = OffsetDateTime.now();
        this.accessToken = UUID.randomUUID().toString().replace("-", "");
    }

    public MediaFile(UUID id, MediaJob job, String originalFilename, String storedFilename,
                     String storageKey, String mimeType, Long fileSize, OffsetDateTime expiresAt) {
        this.id = id != null ? id : UUID.randomUUID();
        this.job = job;
        this.originalFilename = originalFilename;
        this.storedFilename = storedFilename;
        this.storageKey = storageKey;
        this.mimeType = mimeType;
        this.fileSize = fileSize;
        this.createdAt = OffsetDateTime.now();
        this.accessToken = UUID.randomUUID().toString().replace("-", "");
        this.expiresAt = expiresAt != null ? expiresAt : this.createdAt.plusHours(24);
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

    public String getStorageKey() {
        return storageKey;
    }

    public void setStorageKey(String storageKey) {
        this.storageKey = storageKey;
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

    public String getAccessToken() {
        return accessToken;
    }

    public void setAccessToken(String accessToken) {
        this.accessToken = accessToken;
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
