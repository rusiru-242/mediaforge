package com.mediaforge.backend.entity;

import jakarta.persistence.*;
import java.time.OffsetDateTime;
import java.util.UUID;

@Entity
@Table(name = "conversion_requests")
public class ConversionRequest {

    @Id
    @Column(name = "id", nullable = false, updatable = false)
    private UUID id;

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "job_id", nullable = false)
    private MediaJob job;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "input_file_id")
    private MediaFile inputFile;

    @Column(name = "output_format", nullable = false, length = 20)
    private String outputFormat;

    @Column(name = "target_resolution", length = 20)
    private String targetResolution;

    @Column(name = "audio_bitrate")
    private Integer audioBitrate;

    @Column(name = "created_at", nullable = false, updatable = false)
    private OffsetDateTime createdAt;

    public ConversionRequest() {
    }

    public ConversionRequest(UUID id, MediaJob job, MediaFile inputFile, String outputFormat, String targetResolution, Integer audioBitrate) {
        this.id = id != null ? id : UUID.randomUUID();
        this.job = job;
        this.inputFile = inputFile;
        this.outputFormat = outputFormat;
        this.targetResolution = targetResolution;
        this.audioBitrate = audioBitrate;
    }

    @PrePersist
    protected void onCreate() {
        if (id == null) {
            id = UUID.randomUUID();
        }
        if (createdAt == null) {
            createdAt = OffsetDateTime.now();
        }
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

    public MediaFile getInputFile() {
        return inputFile;
    }

    public void setInputFile(MediaFile inputFile) {
        this.inputFile = inputFile;
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

    public Integer getAudioBitrate() {
        return audioBitrate;
    }

    public void setAudioBitrate(Integer audioBitrate) {
        this.audioBitrate = audioBitrate;
    }

    public OffsetDateTime getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(OffsetDateTime createdAt) {
        this.createdAt = createdAt;
    }
}

