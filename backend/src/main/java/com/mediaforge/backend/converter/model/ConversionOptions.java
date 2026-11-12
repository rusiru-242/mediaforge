package com.mediaforge.backend.converter.model;

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
    private Integer imageWidth;
    private Integer imageHeight;
    private Integer imageQuality;
    private Integer imageRotation;
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

    public void normalizePresets() {
        if (qualityPreset != null && !qualityPreset.isBlank()) {
            String p = qualityPreset.toLowerCase(java.util.Locale.ROOT).trim();
            switch (p) {
                case "high":
                case "high quality":
                    if (targetResolution == null || targetResolution.isBlank()) targetResolution = "1080p";
                    if (videoBitrate == null || videoBitrate.isBlank()) videoBitrate = "2500k";
                    if (audioBitrate == null) audioBitrate = 256;
                    if (imageQuality == null) imageQuality = 90;
                    qualityPreset = "fast";
                    break;
                case "balanced":
                    if (targetResolution == null || targetResolution.isBlank()) targetResolution = "720p";
                    if (videoBitrate == null || videoBitrate.isBlank()) videoBitrate = "1200k";
                    if (audioBitrate == null) audioBitrate = 192;
                    if (imageQuality == null) imageQuality = 75;
                    qualityPreset = "fast";
                    break;
                case "small":
                case "small file size":
                case "compression":
                case "maximum compression":
                    if (targetResolution == null || targetResolution.isBlank()) targetResolution = "480p";
                    if (videoBitrate == null || videoBitrate.isBlank()) videoBitrate = "600k";
                    if (audioBitrate == null) audioBitrate = 128;
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
