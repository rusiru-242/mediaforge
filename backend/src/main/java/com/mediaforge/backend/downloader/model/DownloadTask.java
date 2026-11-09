package com.mediaforge.backend.downloader.model;

import java.net.URI;
import java.nio.file.Path;
import java.util.UUID;

public class DownloadTask {

    private UUID jobId;
    private URI sourceUri;
    private String targetFormat;
    private String targetQuality;
    private long maxSizeBytes;
    private Path outputPath;
    private volatile boolean cancelled = false;

    public DownloadTask() {
    }

    public DownloadTask(UUID jobId, URI sourceUri, String targetFormat, String targetQuality,
                        long maxSizeBytes, Path outputPath) {
        this.jobId = jobId;
        this.sourceUri = sourceUri;
        this.targetFormat = targetFormat;
        this.targetQuality = targetQuality;
        this.maxSizeBytes = maxSizeBytes;
        this.outputPath = outputPath;
    }

    public UUID getJobId() {
        return jobId;
    }

    public void setJobId(UUID jobId) {
        this.jobId = jobId;
    }

    public URI getSourceUri() {
        return sourceUri;
    }

    public void setSourceUri(URI sourceUri) {
        this.sourceUri = sourceUri;
    }

    public String getTargetFormat() {
        return targetFormat;
    }

    public void setTargetFormat(String targetFormat) {
        this.targetFormat = targetFormat;
    }

    public String getTargetQuality() {
        return targetQuality;
    }

    public void setTargetQuality(String targetQuality) {
        this.targetQuality = targetQuality;
    }

    public long getMaxSizeBytes() {
        return maxSizeBytes;
    }

    public void setMaxSizeBytes(long maxSizeBytes) {
        this.maxSizeBytes = maxSizeBytes;
    }

    public Path getOutputPath() {
        return outputPath;
    }

    public void setOutputPath(Path outputPath) {
        this.outputPath = outputPath;
    }

    public boolean isCancelled() {
        return cancelled;
    }

    public void cancel() {
        this.cancelled = true;
    }
}

