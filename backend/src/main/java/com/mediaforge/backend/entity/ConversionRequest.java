package com.mediaforge.backend.entity;

import java.time.OffsetDateTime;
import java.util.UUID;

/**
 * In-memory representation of media conversion request parameters.
 */
public class ConversionRequest {

    private UUID id;
    private MediaJob job;
    private MediaFile inputFile;
    private String outputFormat;
    private String targetResolution;
    private Integer audioBitrate;
    private String videoBitrate;
    private Integer frameRate;
    private String videoCodec;
    private String audioCodec;
    private Integer sampleRate;
    private Integer audioChannels;
    private String qualityPreset;
    private Boolean removeAudio = false;
    private Integer imageWidth;
    private Integer imageHeight;
    private Integer imageQuality;
    private Integer imageRotation;
    private Boolean stripMetadata = false;
    private OffsetDateTime createdAt;

    public ConversionRequest() {
        this.id = UUID.randomUUID();
        this.createdAt = OffsetDateTime.now();
    }

    public ConversionRequest(UUID id, MediaJob job, MediaFile inputFile, String outputFormat,
                             String targetResolution, Integer audioBitrate) {
        this.id = id != null ? id : UUID.randomUUID();
        this.job = job;
        this.inputFile = inputFile;
        this.outputFormat = outputFormat;
        this.targetResolution = targetResolution;
        this.audioBitrate = audioBitrate;
        this.createdAt = OffsetDateTime.now();
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

    public OffsetDateTime getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(OffsetDateTime createdAt) {
        this.createdAt = createdAt;
    }
}
