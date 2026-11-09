package com.mediaforge.backend.downloader.model;

import com.mediaforge.backend.enums.JobStatus;
import java.util.UUID;

public class DownloadProgress {

    private UUID jobId;
    private long bytesDownloaded;
    private long totalBytes;
    private int percent;
    private double speedBytesPerSec;
    private JobStatus status;
    private String message;

    public DownloadProgress() {
    }

    public DownloadProgress(UUID jobId, long bytesDownloaded, long totalBytes, int percent,
                            double speedBytesPerSec, JobStatus status, String message) {
        this.jobId = jobId;
        this.bytesDownloaded = bytesDownloaded;
        this.totalBytes = totalBytes;
        this.percent = percent;
        this.speedBytesPerSec = speedBytesPerSec;
        this.status = status;
        this.message = message;
    }

    public UUID getJobId() {
        return jobId;
    }

    public void setJobId(UUID jobId) {
        this.jobId = jobId;
    }

    public long getBytesDownloaded() {
        return bytesDownloaded;
    }

    public void setBytesDownloaded(long bytesDownloaded) {
        this.bytesDownloaded = bytesDownloaded;
    }

    public long getTotalBytes() {
        return totalBytes;
    }

    public void setTotalBytes(long totalBytes) {
        this.totalBytes = totalBytes;
    }

    public int getPercent() {
        return percent;
    }

    public void setPercent(int percent) {
        this.percent = percent;
    }

    public double getSpeedBytesPerSec() {
        return speedBytesPerSec;
    }

    public void setSpeedBytesPerSec(double speedBytesPerSec) {
        this.speedBytesPerSec = speedBytesPerSec;
    }

    public JobStatus getStatus() {
        return status;
    }

    public void setStatus(JobStatus status) {
        this.status = status;
    }

    public String getMessage() {
        return message;
    }

    public void setMessage(String message) {
        this.message = message;
    }
}

