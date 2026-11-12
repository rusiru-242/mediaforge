package com.mediaforge.backend.dto.response;

import java.time.OffsetDateTime;
import java.util.UUID;

public class FileUploadResponse {

    private UUID id;
    private String originalFilename;
    private String storedFilename;
    private String mimeType;
    private Long fileSize;
    private String mediaType; // VIDEO, AUDIO, IMAGE
    private OffsetDateTime createdAt;

    public FileUploadResponse() {
    }

    public FileUploadResponse(UUID id, String originalFilename, String storedFilename, String mimeType, Long fileSize, String mediaType, OffsetDateTime createdAt) {
        this.id = id;
        this.originalFilename = originalFilename;
        this.storedFilename = storedFilename;
        this.mimeType = mimeType;
        this.fileSize = fileSize;
        this.mediaType = mediaType;
        this.createdAt = createdAt;
    }

    public UUID getId() {
        return id;
    }

    public UUID getFileId() {
        return id;
    }

    public void setId(UUID id) {
        this.id = id;
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

    public String getMediaType() {
        return mediaType;
    }

    public void setMediaType(String mediaType) {
        this.mediaType = mediaType;
    }

    public OffsetDateTime getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(OffsetDateTime createdAt) {
        this.createdAt = createdAt;
    }
}
