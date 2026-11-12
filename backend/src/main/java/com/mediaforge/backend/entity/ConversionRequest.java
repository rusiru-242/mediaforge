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

    @Column(name = "video_bitrate", length = 20)
    private String videoBitrate;

    @Column(name = "frame_rate")
    private Integer frameRate;

    @Column(name = "video_codec", length = 20)
    private String videoCodec;

    @Column(name = "audio_codec", length = 20)
    private String audioCodec;

    @Column(name = "sample_rate")
    private Integer sampleRate;

    @Column(name = "audio_channels")
    private Integer audioChannels;

    @Column(name = "quality_preset", length = 20)
    private String qualityPreset;

    @Column(name = "remove_audio")
    private Boolean removeAudio = false;

    @Column(name = "image_width")
    private Integer imageWidth;

    @Column(name = "image_height")
    private Integer imageHeight;

    @Column(name = "image_quality")
    private Integer imageQuality;

    @Column(name = "image_rotation")
    private Integer imageRotation;

    @Column(name = "strip_metadata")
    private Boolean stripMetadata = true;

    @Column(name = "custom_options_json", columnDefinition = "TEXT")
    private String customOptionsJson;

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

    public String getVideoBitrate() {
        return videoBitrate;
    }

    public void setVideoBitrate(String videoBitrate) {
        this.videoBitrate = videoBitrate;
    }

    public Integer getFrameRate() {
        return frameRate;
    }

    public void setFrameRate(Integer frameRate) {
        this.frameRate = frameRate;
    }

    public String getVideoCodec() {
        return videoCodec;
    }

    public void setVideoCodec(String videoCodec) {
        this.videoCodec = videoCodec;
    }

    public String getAudioCodec() {
        return audioCodec;
    }

    public void setAudioCodec(String audioCodec) {
        this.audioCodec = audioCodec;
    }

    public Integer getSampleRate() {
        return sampleRate;
    }

    public void setSampleRate(Integer sampleRate) {
        this.sampleRate = sampleRate;
    }

    public Integer getAudioChannels() {
        return audioChannels;
    }

    public void setAudioChannels(Integer audioChannels) {
        this.audioChannels = audioChannels;
    }

    public String getQualityPreset() {
        return qualityPreset;
    }

    public void setQualityPreset(String qualityPreset) {
        this.qualityPreset = qualityPreset;
    }

    public Boolean getRemoveAudio() {
        return removeAudio;
    }

    public void setRemoveAudio(Boolean removeAudio) {
        this.removeAudio = removeAudio;
    }

    public Integer getImageWidth() {
        return imageWidth;
    }

    public void setImageWidth(Integer imageWidth) {
        this.imageWidth = imageWidth;
    }

    public Integer getImageHeight() {
        return imageHeight;
    }

    public void setImageHeight(Integer imageHeight) {
        this.imageHeight = imageHeight;
    }

    public Integer getImageQuality() {
        return imageQuality;
    }

    public void setImageQuality(Integer imageQuality) {
        this.imageQuality = imageQuality;
    }

    public Integer getImageRotation() {
        return imageRotation;
    }

    public void setImageRotation(Integer imageRotation) {
        this.imageRotation = imageRotation;
    }

    public Boolean getStripMetadata() {
        return stripMetadata;
    }

    public void setStripMetadata(Boolean stripMetadata) {
        this.stripMetadata = stripMetadata;
    }

    public String getCustomOptionsJson() {
        return customOptionsJson;
    }

    public void setCustomOptionsJson(String customOptionsJson) {
        this.customOptionsJson = customOptionsJson;
    }

    public OffsetDateTime getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(OffsetDateTime createdAt) {
        this.createdAt = createdAt;
    }
}
