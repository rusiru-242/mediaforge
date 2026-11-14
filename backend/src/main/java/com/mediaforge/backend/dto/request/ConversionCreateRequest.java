package com.mediaforge.backend.dto.request;

import jakarta.validation.Valid;
import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import java.util.ArrayList;
import java.util.List;
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

    // Advanced video quality
    @Min(value = 0, message = "CRF cannot be negative")
    @Max(value = 51, message = "CRF cannot exceed 51")
    private Integer crf;

    // Trimming & Cutting
    @DecimalMin(value = "0.0", message = "startTime cannot be negative")
    private Double startTime;

    @DecimalMin(value = "0.0", message = "endTime cannot be negative")
    private Double endTime;

    @Valid
    private List<TimeRangeDto> removeSegments = new ArrayList<>();

    // Cropping
    @Min(value = 0, message = "cropX cannot be negative")
    private Integer cropX;

    @Min(value = 0, message = "cropY cannot be negative")
    private Integer cropY;

    @Min(value = 2, message = "cropWidth must be at least 2")
    private Integer cropWidth;

    @Min(value = 2, message = "cropHeight must be at least 2")
    private Integer cropHeight;

    @Size(max = 20, message = "aspectRatio cannot exceed 20 characters")
    private String aspectRatio;

    // Audio editing
    @DecimalMin(value = "0.0", message = "volume cannot be negative")
    @DecimalMax(value = "5.0", message = "volume factor cannot exceed 5.0")
    private Double volume;

    private Boolean removeSilence = false;

    @DecimalMin(value = "0.0", message = "fadeInDuration cannot be negative")
    private Double fadeInDuration;

    @DecimalMin(value = "0.0", message = "fadeOutDuration cannot be negative")
    private Double fadeOutDuration;

    // Image options
    private Integer imageWidth;

    private Integer imageHeight;

    private Integer imageQuality;

    private Integer imageRotation;

    private Boolean preserveAspectRatio = true;

    private Boolean flipHorizontal = false;

    private Boolean flipVertical = false;

    private Double brightness;

    private Double contrast;

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

    public Integer getCrf() {
        return crf;
    }

    public void setCrf(Integer crf) {
        this.crf = crf;
    }

    public Double getStartTime() {
        return startTime;
    }

    public void setStartTime(Double startTime) {
        this.startTime = startTime;
    }

    public Double getEndTime() {
        return endTime;
    }

    public void setEndTime(Double endTime) {
        this.endTime = endTime;
    }

    public List<TimeRangeDto> getRemoveSegments() {
        return removeSegments;
    }

    public void setRemoveSegments(List<TimeRangeDto> removeSegments) {
        this.removeSegments = removeSegments != null ? removeSegments : new ArrayList<>();
    }

    public Integer getCropX() {
        return cropX;
    }

    public void setCropX(Integer cropX) {
        this.cropX = cropX;
    }

    public Integer getCropY() {
        return cropY;
    }

    public void setCropY(Integer cropY) {
        this.cropY = cropY;
    }

    public Integer getCropWidth() {
        return cropWidth;
    }

    public void setCropWidth(Integer cropWidth) {
        this.cropWidth = cropWidth;
    }

    public Integer getCropHeight() {
        return cropHeight;
    }

    public void setCropHeight(Integer cropHeight) {
        this.cropHeight = cropHeight;
    }

    public String getAspectRatio() {
        return aspectRatio;
    }

    public void setAspectRatio(String aspectRatio) {
        this.aspectRatio = aspectRatio;
    }

    public Double getVolume() {
        return volume;
    }

    public void setVolume(Double volume) {
        this.volume = volume;
    }

    public Boolean getRemoveSilence() {
        return removeSilence;
    }

    public void setRemoveSilence(Boolean removeSilence) {
        this.removeSilence = removeSilence;
    }

    public Double getFadeInDuration() {
        return fadeInDuration;
    }

    public void setFadeInDuration(Double fadeInDuration) {
        this.fadeInDuration = fadeInDuration;
    }

    public Double getFadeOutDuration() {
        return fadeOutDuration;
    }

    public void setFadeOutDuration(Double fadeOutDuration) {
        this.fadeOutDuration = fadeOutDuration;
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

    public Boolean getPreserveAspectRatio() {
        return preserveAspectRatio;
    }

    public void setPreserveAspectRatio(Boolean preserveAspectRatio) {
        this.preserveAspectRatio = preserveAspectRatio;
    }

    public Boolean getFlipHorizontal() {
        return flipHorizontal;
    }

    public void setFlipHorizontal(Boolean flipHorizontal) {
        this.flipHorizontal = flipHorizontal;
    }

    public Boolean getFlipVertical() {
        return flipVertical;
    }

    public void setFlipVertical(Boolean flipVertical) {
        this.flipVertical = flipVertical;
    }

    public Double getBrightness() {
        return brightness;
    }

    public void setBrightness(Double brightness) {
        this.brightness = brightness;
    }

    public Double getContrast() {
        return contrast;
    }

    public void setContrast(Double contrast) {
        this.contrast = contrast;
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
