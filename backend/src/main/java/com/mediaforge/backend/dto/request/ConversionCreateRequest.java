package com.mediaforge.backend.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import java.util.UUID;

public class ConversionCreateRequest {

    private UUID inputFileId;

    @Size(max = 20, message = "inputFormat cannot exceed 20 characters")
    private String inputFormat;

    @NotBlank(message = "outputFormat is required")
    @Size(max = 20, message = "outputFormat cannot exceed 20 characters")
    private String outputFormat;

    @Size(max = 20, message = "targetResolution cannot exceed 20 characters")
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

    private Boolean stripMetadata = true;

    private String mediaType;

    private UUID batchId;

    public ConversionCreateRequest() {
    }

    public ConversionCreateRequest(UUID inputFileId, String inputFormat, String outputFormat, String targetResolution, Integer audioBitrate) {
        this.inputFileId = inputFileId;
        this.inputFormat = inputFormat;
        this.outputFormat = outputFormat;
        this.targetResolution = targetResolution;
        this.audioBitrate = audioBitrate;
    }

    public UUID getInputFileId() {
        return inputFileId;
    }

    public void setInputFileId(UUID inputFileId) {
        this.inputFileId = inputFileId;
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

    public String getMediaType() {
        return mediaType;
    }

    public void setMediaType(String mediaType) {
        this.mediaType = mediaType;
    }

    public UUID getBatchId() {
        return batchId;
    }

    public void setBatchId(UUID batchId) {
        this.batchId = batchId;
    }
}
