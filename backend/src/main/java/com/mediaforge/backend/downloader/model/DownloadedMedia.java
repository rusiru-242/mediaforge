package com.mediaforge.backend.downloader.model;

import java.nio.file.Path;

public class DownloadedMedia {

    private Path filePath;
    private String originalFilename;
    private String storedFilename;
    private String mimeType;
    private long fileSize;
    private String containerFormat;

    public DownloadedMedia() {
    }

    public DownloadedMedia(Path filePath, String originalFilename, String storedFilename,
                           String mimeType, long fileSize, String containerFormat) {
        this.filePath = filePath;
        this.originalFilename = originalFilename;
        this.storedFilename = storedFilename;
        this.mimeType = mimeType;
        this.fileSize = fileSize;
        this.containerFormat = containerFormat;
    }

    public Path getFilePath() {
        return filePath;
    }

    public void setFilePath(Path filePath) {
        this.filePath = filePath;
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

    public long getFileSize() {
        return fileSize;
    }

    public void setFileSize(long fileSize) {
        this.fileSize = fileSize;
    }

    public String getContainerFormat() {
        return containerFormat;
    }

    public void setContainerFormat(String containerFormat) {
        this.containerFormat = containerFormat;
    }
}
