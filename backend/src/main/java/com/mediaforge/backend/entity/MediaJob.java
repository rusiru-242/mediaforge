package com.mediaforge.backend.entity;

import com.mediaforge.backend.enums.JobStatus;
import com.mediaforge.backend.enums.JobType;
import com.mediaforge.backend.enums.SourceType;

import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

/**
 * In-memory representation of a MediaForge processing job.
 */
public class MediaJob {

    private UUID id;
    private JobType jobType;
    private SourceType sourceType;
    private JobStatus status = JobStatus.PENDING;
    private int progress = 0;
    private String inputFormat;
    private String outputFormat;
    private String targetResolution;
    private String sourceUrl;
    private UUID outputFileId;
    private String errorMessage;
    private UUID batchId;
    private String accessToken;
    private OffsetDateTime createdAt;
    private OffsetDateTime startedAt;
    private OffsetDateTime completedAt;
    private OffsetDateTime expiresAt;

    private List<JobEvent> events = new ArrayList<>();
    private List<MediaFile> files = new ArrayList<>();

    public MediaJob() {
        this.id = UUID.randomUUID();
        this.createdAt = OffsetDateTime.now();
        this.accessToken = UUID.randomUUID().toString().replace("-", "");
        this.expiresAt = this.createdAt.plusHours(24);
    }

    public MediaJob(UUID id, JobType jobType, SourceType sourceType, String inputFormat, String outputFormat) {
        this.id = id != null ? id : UUID.randomUUID();
        this.jobType = jobType;
        this.sourceType = sourceType;
        this.inputFormat = inputFormat;
        this.outputFormat = outputFormat;
        this.status = JobStatus.PENDING;
        this.progress = 0;
        this.createdAt = OffsetDateTime.now();
        this.accessToken = UUID.randomUUID().toString().replace("-", "");
        this.expiresAt = this.createdAt.plusHours(24);
    }

    // Overloaded constructor for legacy calls passing user=null
    public MediaJob(UUID id, Object unusedUser, JobType jobType, SourceType sourceType, String inputFormat, String outputFormat) {
        this(id, jobType, sourceType, inputFormat, outputFormat);
    }

    public UUID getId() {
        return id;
    }

    public void setId(UUID id) {
        this.id = id;
    }

    // User accounts removed: returns null
    public UUID getUserId() {
        return null;
    }

    public Object getUser() {
        return null;
    }

    public void setUser(Object user) {
        // No-op
    }

    public JobType getJobType() {
        return jobType;
    }

    public void setJobType(JobType jobType) {
        this.jobType = jobType;
    }

    public SourceType getSourceType() {
        return sourceType;
    }

    public void setSourceType(SourceType sourceType) {
        this.sourceType = sourceType;
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

    public String getInputFormat() {
        return inputFormat;
    }

    public void setInputFormat(String inputFormat) {
        this.inputFormat = inputFormat;
    }

    public String getOutputFormat() {
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

    public String getSourceUrl() {
        return sourceUrl;
    }

    public void setSourceUrl(String sourceUrl) {
        this.sourceUrl = sourceUrl;
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

    public UUID getBatchId() {
        return batchId;
    }

    public void setBatchId(UUID batchId) {
        this.batchId = batchId;
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

    public OffsetDateTime getStartedAt() {
        return startedAt;
    }

    public void setStartedAt(OffsetDateTime startedAt) {
        this.startedAt = startedAt;
    }

    public OffsetDateTime getCompletedAt() {
        return completedAt;
    }

    public void setCompletedAt(OffsetDateTime completedAt) {
        this.completedAt = completedAt;
    }

    public OffsetDateTime getExpiresAt() {
        return expiresAt;
    }

    public void setExpiresAt(OffsetDateTime expiresAt) {
        this.expiresAt = expiresAt;
    }

    public List<JobEvent> getEvents() {
        return events;
    }

    public void setEvents(List<JobEvent> events) {
        this.events = events;
    }

    public List<MediaFile> getFiles() {
        return files;
    }

    public void setFiles(List<MediaFile> files) {
        this.files = files;
    }
}
