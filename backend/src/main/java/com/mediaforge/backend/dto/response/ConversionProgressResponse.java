package com.mediaforge.backend.dto.response;

import com.mediaforge.backend.enums.JobStatus;
import java.util.UUID;

public class ConversionProgressResponse {

    private UUID jobId;
    private JobStatus status;
    private int progress;
    private String stage;
    private Long elapsedSeconds;
    private Long etaSeconds;
    private Long outputFileSize;
    private String outputFormat;
    private UUID outputFileId;
    private String errorMessage;

    public ConversionProgressResponse() {
    }

    public ConversionProgressResponse(UUID jobId, JobStatus status, int progress, String stage, Long elapsedSeconds, Long etaSeconds, Long outputFileSize, String outputFormat, UUID outputFileId, String errorMessage) {
        this.jobId = jobId;
        this.status = status;
        this.progress = progress;
        this.stage = stage;
        this.elapsedSeconds = elapsedSeconds;
        this.etaSeconds = etaSeconds;
        this.outputFileSize = outputFileSize;
        this.outputFormat = outputFormat;
        this.outputFileId = outputFileId;
        this.errorMessage = errorMessage;
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

    public Long getElapsedSeconds() {
        return elapsedSeconds;
    }

    public void setElapsedSeconds(Long elapsedSeconds) {
        this.elapsedSeconds = elapsedSeconds;
    }

    public Long getEtaSeconds() {
        return etaSeconds;
    }

    public void setEtaSeconds(Long etaSeconds) {
        this.etaSeconds = etaSeconds;
    }

    public Long getOutputFileSize() {
        return outputFileSize;
    }

    public void setOutputFileSize(Long outputFileSize) {
        this.outputFileSize = outputFileSize;
    }

    public String getOutputFormat() {
        return outputFormat;
    }

    public void setOutputFormat(String outputFormat) {
        this.outputFormat = outputFormat;
    }

    public UUID getOutputFileId() {
        return outputFileId;
    }

    public void setOutputFileId(UUID outputFileId) {
        this.outputFileId = outputFileId;
    }

    public String getErrorMessage() {
        return errorMessage;
    }

    public void setErrorMessage(String errorMessage) {
        this.errorMessage = errorMessage;
    }
}
