package com.mediaforge.backend.entity;

import com.mediaforge.backend.converter.model.TimeRange;
import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

/**
 * In-memory representation of media conversion request parameters and advanced editing options.
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

    // Advanced video quality
    private Integer crf;

    // Trimming & Cutting
    private Double startTime;
    private Double endTime;
    private List<TimeRange> removeSegments = new ArrayList<>();

    // Cropping
    private Integer cropX;
    private Integer cropY;
    private Integer cropWidth;
    private Integer cropHeight;
    private String aspectRatio;

    // Audio editing
    private Double volume;
    private Boolean removeSilence = false;
    private Double fadeInDuration;
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

    public List<TimeRange> getRemoveSegments() {
        return removeSegments;
    }

    public void setRemoveSegments(List<TimeRange> removeSegments) {
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

    public OffsetDateTime getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(OffsetDateTime createdAt) {
        this.createdAt = createdAt;
    }
}
