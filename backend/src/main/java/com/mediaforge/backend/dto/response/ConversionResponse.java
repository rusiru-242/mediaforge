package com.mediaforge.backend.dto.response;

import java.util.UUID;

public class ConversionResponse {

    private UUID jobId;
    private JobResponse job;
    private String outputFormat;
    private String targetResolution;
    private Integer audioBitrate;
    private String status;
    private String message;

    public ConversionResponse() {
    }

    public ConversionResponse(UUID jobId, JobResponse job, String outputFormat, String targetResolution,
                              Integer audioBitrate, String status, String message) {
        this.jobId = jobId;
        this.job = job;
        this.outputFormat = outputFormat;
        this.targetResolution = targetResolution;
        this.audioBitrate = audioBitrate;
        this.status = status;
        this.message = message;
    }

    public UUID getJobId() {
        return jobId;
    }

    public UUID getId() {
        return jobId;
    }

    public void setJobId(UUID jobId) {
        this.jobId = jobId;
    }

    public JobResponse getJob() {
        return job;
    }

    public void setJob(JobResponse job) {
        this.job = job;
    }

    public String getOutputFormat() {
        return outputFormat;
    }

    public String getTargetFormat() {
        return outputFormat;
    }

    public void setOutputFormat(String outputFormat) {
        this.outputFormat = outputFormat;
    }

    public String getTargetResolution() {
        return targetResolution;
    }

    public void setTargetResolution(String targetResolution) {
        this.targetResolution = targetResolution;
    }

    public Integer getAudioBitrate() {
        return audioBitrate;
    }

    public void setAudioBitrate(Integer audioBitrate) {
        this.audioBitrate = audioBitrate;
    }

    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
    }

    public String getMessage() {
        return message;
    }

    public void setMessage(String message) {
        this.message = message;
    }
}
