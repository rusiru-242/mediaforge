package com.mediaforge.backend.dto.request;

import com.mediaforge.backend.converter.model.ConversionOptions;
import com.mediaforge.backend.converter.model.TimeRange;
import jakarta.validation.Valid;
import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;

public class DownloadCreateRequest {

    @NotBlank(message = "url is required")
    private String url;

    @NotBlank(message = "selectedFormat is required")
    @Size(max = 32, message = "selectedFormat cannot exceed 32 characters")
    private String selectedFormat;

    @NotBlank(message = "selectedQuality is required")
    @Size(max = 64, message = "selectedQuality cannot exceed 64 characters")
    private String selectedQuality;

    // Optional editing fields for post-download processing
    @DecimalMin(value = "0.0", message = "startTime cannot be negative")
    private Double startTime;

    @DecimalMin(value = "0.0", message = "endTime cannot be negative")
    private Double endTime;

    @Valid
    private List<TimeRangeDto> removeSegments = new ArrayList<>();

    @Size(max = 20, message = "targetResolution cannot exceed 20 characters")
    private String targetResolution;

    private String videoBitrate;

    private Integer audioBitrate;

    private String qualityPreset;

    @Min(value = 0, message = "CRF cannot be negative")
    @Max(value = 51, message = "CRF cannot exceed 51")
    private Integer crf;

    private Boolean stripAudio = false;

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

    public DownloadCreateRequest() {
    }

    public DownloadCreateRequest(String url, String selectedFormat, String selectedQuality) {
        this.url = url;
        this.selectedFormat = selectedFormat;
        this.selectedQuality = selectedQuality;
    }

    public String getUrl() {
        return url;
    }

    public void setUrl(String url) {
        this.url = url;
    }

    public String getSelectedFormat() {
        return selectedFormat;
    }

    public void setSelectedFormat(String selectedFormat) {
        this.selectedFormat = selectedFormat;
    }

    public String getSelectedQuality() {
        return selectedQuality;
    }

    public void setSelectedQuality(String selectedQuality) {
        this.selectedQuality = selectedQuality;
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

    public boolean hasEditOptions() {
        return (startTime != null && startTime > 0) ||
                endTime != null ||
                (removeSegments != null && !removeSegments.isEmpty()) ||
                (targetResolution != null && !targetResolution.isBlank() && !"source".equalsIgnoreCase(targetResolution)) ||
                (videoBitrate != null && !videoBitrate.isBlank() && !"auto".equalsIgnoreCase(videoBitrate)) ||
                (audioBitrate != null && audioBitrate > 0) ||
                (qualityPreset != null && !qualityPreset.isBlank() && !"auto".equalsIgnoreCase(qualityPreset)) ||
                crf != null ||
                Boolean.TRUE.equals(stripAudio) ||
                (cropWidth != null && cropHeight != null) ||
                (volume != null && Math.abs(volume - 1.0) > 0.01) ||
                Boolean.TRUE.equals(removeSilence) ||
                (fadeInDuration != null && fadeInDuration > 0) ||
                (fadeOutDuration != null && fadeOutDuration > 0);
    }

    public ConversionOptions toConversionOptions() {
        if (!hasEditOptions()) return null;

        ConversionOptions options = new ConversionOptions();
        options.setStartTime(startTime);
        options.setEndTime(endTime);
        if (removeSegments != null && !removeSegments.isEmpty()) {
            options.setRemoveSegments(removeSegments.stream()
                    .map(dto -> new TimeRange(dto.getStart(), dto.getEnd()))
                    .collect(Collectors.toList()));
        }
        options.setTargetResolution(targetResolution);
        options.setVideoBitrate(videoBitrate);
        options.setAudioBitrate(audioBitrate);
        options.setQualityPreset(qualityPreset);
        options.setCrf(crf);
        options.setRemoveAudio(stripAudio);
        options.setCropX(cropX);
        options.setCropY(cropY);
        options.setCropWidth(cropWidth);
        options.setCropHeight(cropHeight);
        options.setAspectRatio(aspectRatio);
        options.setVolume(volume);
        options.setRemoveSilence(removeSilence);
        options.setFadeInDuration(fadeInDuration);
        options.setFadeOutDuration(fadeOutDuration);
        options.normalizePresets();
        return options;
    }
}
