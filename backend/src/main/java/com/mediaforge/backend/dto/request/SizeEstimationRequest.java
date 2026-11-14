package com.mediaforge.backend.dto.request;

import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

public class SizeEstimationRequest {

    private UUID inputFileId;
    private String mediaType; // "video", "audio", "image"
    private Double sourceDuration; // in seconds
    private Integer sourceWidth;
    private Integer sourceHeight;
    private Long sourceBitrate; // in bps
    private Long sourceFileSize; // in bytes

    private String outputFormat;
    private String targetResolution; // "240p", "360p", "480p", "720p", "1080p", "1440p", "2160p", "source"
    private String videoBitrate;
    private Integer audioBitrate; // in kbps
    private String qualityPreset; // "low", "medium", "high", "best", "custom"
    private Integer crf;
    private Boolean stripAudio = false;

    // Trimming / Cutting
    private Double startTime;
    private Double endTime;
    private List<TimeRangeDto> removeSegments = new ArrayList<>();

    // Image options
    private Integer imageWidth;
    private Integer imageHeight;
    private Integer imageQuality; // 1-100
    private Integer cropWidth;
    private Integer cropHeight;

    public SizeEstimationRequest() {
    }

    public UUID getInputFileId() {
        return inputFileId;
    }

    public void setInputFileId(UUID inputFileId) {
        this.inputFileId = inputFileId;
    }

    public String getMediaType() {
        return mediaType;
    }

    public void setMediaType(String mediaType) {
        this.mediaType = mediaType;
    }

    public Double getSourceDuration() {
        return sourceDuration;
    }

    public void setSourceDuration(Double sourceDuration) {
        this.sourceDuration = sourceDuration;
    }

    public Integer getSourceWidth() {
        return sourceWidth;
    }

    public void setSourceWidth(Integer sourceWidth) {
        this.sourceWidth = sourceWidth;
    }

    public Integer getSourceHeight() {
        return sourceHeight;
    }

    public void setSourceHeight(Integer sourceHeight) {
        this.sourceHeight = sourceHeight;
    }

    public Long getSourceBitrate() {
        return sourceBitrate;
    }

    public void setSourceBitrate(Long sourceBitrate) {
        this.sourceBitrate = sourceBitrate;
    }

    public Long getSourceFileSize() {
        return sourceFileSize;
    }

    public void setSourceFileSize(Long sourceFileSize) {
        this.sourceFileSize = sourceFileSize;
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

    public String getVideoBitrate() {
        return videoBitrate;
    }

    public void setVideoBitrate(String videoBitrate) {
        this.videoBitrate = videoBitrate;
    }

    public Integer getAudioBitrate() {
        return audioBitrate;
    }

    public void setAudioBitrate(Integer audioBitrate) {
        this.audioBitrate = audioBitrate;
    }

    public String getQualityPreset() {
        return qualityPreset;
    }

    public void setQualityPreset(String qualityPreset) {
        this.qualityPreset = qualityPreset;
    }

    public Integer getCrf() {
        return crf;
    }

    public void setCrf(Integer crf) {
        this.crf = crf;
    }

    public Boolean getStripAudio() {
        return stripAudio;
    }

    public void setStripAudio(Boolean stripAudio) {
        this.stripAudio = stripAudio;
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
}
