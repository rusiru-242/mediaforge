package com.mediaforge.backend.converter.model;

import java.util.ArrayList;
import java.util.List;
import java.util.Locale;

public class ConversionOptions {
    private String targetResolution;
    private String videoBitrate;
    private Integer frameRate;
    private String videoCodec;
    private String audioCodec;
    private Integer audioBitrate;
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

    // Audio editing controls
    private Double volume; // 1.0 = 100%, 0.5 = 50%, 1.5 = 150%
    private Boolean removeSilence = false;
    private Double fadeInDuration; // in seconds
    private Double fadeOutDuration; // in seconds

    // Image & visual controls
    private Integer imageWidth;
    private Integer imageHeight;
    private Integer imageQuality;
    private Integer imageRotation;
    private Boolean preserveAspectRatio = true;
    private Boolean flipHorizontal = false;
    private Boolean flipVertical = false;
    private Double brightness; // -1.0 to 1.0 (0.0 is default)
    private Double contrast; // -1.0 to 1.0 (1.0 is default)
    private Boolean stripMetadata = true;

    public ConversionOptions() {
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

    public Integer getAudioBitrate() {
        return audioBitrate;
    }

    public void setAudioBitrate(Integer audioBitrate) {
        this.audioBitrate = audioBitrate;
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

    public boolean hasTrim() {
        return (startTime != null && startTime > 0.0) || endTime != null;
    }

    public boolean hasCut() {
        return removeSegments != null && !removeSegments.isEmpty();
    }

    public boolean hasCrop() {
        return cropWidth != null && cropHeight != null && cropWidth > 0 && cropHeight > 0;
    }

    public double calculateEffectiveDuration(double sourceDuration) {
        double start = (startTime != null && startTime >= 0.0) ? startTime : 0.0;
        double end = (endTime != null && endTime > start && endTime <= sourceDuration + 0.5) ? endTime : sourceDuration;
        double effective = Math.max(0.0, end - start);

        if (hasCut()) {
            for (TimeRange range : removeSegments) {
                if (range.isValid()) {
                    double rStart = Math.max(start, range.getStart());
                    double rEnd = Math.min(end, range.getEnd());
                    if (rEnd > rStart) {
                        effective -= (rEnd - rStart);
                    }
                }
            }
        }
        return Math.max(0.1, effective);
    }

    public void normalizePresets() {
        if (qualityPreset != null && !qualityPreset.isBlank()) {
            String p = qualityPreset.toLowerCase(Locale.ROOT).trim();
            switch (p) {
                case "best":
                case "best available":
                    if (targetResolution == null || targetResolution.isBlank()) targetResolution = "source";
                    if (videoBitrate == null || videoBitrate.isBlank()) videoBitrate = "5000k";
                    if (audioBitrate == null) audioBitrate = 320;
                    if (crf == null) crf = 18;
                    if (imageQuality == null) imageQuality = 100;
                    qualityPreset = "medium";
                    break;
                case "high":
                case "high quality":
                    if (targetResolution == null || targetResolution.isBlank()) targetResolution = "1080p";
                    if (videoBitrate == null || videoBitrate.isBlank()) videoBitrate = "2500k";
                    if (audioBitrate == null) audioBitrate = 256;
                    if (crf == null) crf = 20;
                    if (imageQuality == null) imageQuality = 90;
                    qualityPreset = "fast";
                    break;
                case "medium":
                case "balanced":
                    if (targetResolution == null || targetResolution.isBlank()) targetResolution = "720p";
                    if (videoBitrate == null || videoBitrate.isBlank()) videoBitrate = "1200k";
                    if (audioBitrate == null) audioBitrate = 192;
                    if (crf == null) crf = 23;
                    if (imageQuality == null) imageQuality = 75;
                    qualityPreset = "fast";
                    break;
                case "low":
                case "small":
                case "small file size":
                case "compression":
                case "maximum compression":
                    if (targetResolution == null || targetResolution.isBlank()) targetResolution = "480p";
                    if (videoBitrate == null || videoBitrate.isBlank()) videoBitrate = "600k";
                    if (audioBitrate == null) audioBitrate = 128;
                    if (crf == null) crf = 28;
                    if (imageQuality == null) imageQuality = 50;
                    qualityPreset = "faster";
                    break;
                case "original":
                case "original quality":
                    if (targetResolution == null || targetResolution.isBlank()) targetResolution = "source";
                    if (audioBitrate == null) audioBitrate = 256;
                    qualityPreset = "fast";
                    break;
                default:
                    // retain as ffmpeg preset (ultrafast, superfast, etc.)
                    break;
            }
        }
    }
}
