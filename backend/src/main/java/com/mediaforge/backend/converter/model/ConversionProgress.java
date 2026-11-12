package com.mediaforge.backend.converter.model;

import com.mediaforge.backend.enums.JobStatus;
import java.util.UUID;

public class ConversionProgress {
    private UUID jobId;
    private JobStatus status;
    private int progress;
    private String stage;
    private long elapsedSeconds;
    private Long etaSeconds;
    private long outputBytes;
    private String errorMessage;

    public ConversionProgress() {
    }

    public ConversionProgress(UUID jobId, JobStatus status, int progress, String stage, long elapsedSeconds, Long etaSeconds, long outputBytes) {
        this.jobId = jobId;
        this.status = status;
        this.progress = progress;
        this.stage = stage;
        this.elapsedSeconds = elapsedSeconds;
        this.etaSeconds = etaSeconds;
        this.outputBytes = outputBytes;
    }

    public UUID getJobId() {
        return jobId;
    }

    public void setJobId(UUID jobId) {
        this.jobId = jobId;
    }

    public JobStatus getStatus() {
        return status;
    }

    public void setStatus(JobStatus status) {
        this.status = status;
    }

    public int getProgress() {
        return progress;
    }

    public void setProgress(int progress) {
        this.progress = progress;
    }

    public String getStage() {
        return stage;
    }

    public void setStage(String stage) {
        this.stage = stage;
    }

    public long getElapsedSeconds() {
        return elapsedSeconds;
    }

    public void setElapsedSeconds(long elapsedSeconds) {
        this.elapsedSeconds = elapsedSeconds;
    }

    public Long getEtaSeconds() {
        return etaSeconds;
    }

    public void setEtaSeconds(Long etaSeconds) {
        this.etaSeconds = etaSeconds;
    }

    public long getOutputBytes() {
        return outputBytes;
    }

    public void setOutputBytes(long outputBytes) {
        this.outputBytes = outputBytes;
    }

    public String getErrorMessage() {
        return errorMessage;
    }

    public void setErrorMessage(String errorMessage) {
        this.errorMessage = errorMessage;
    }
}
