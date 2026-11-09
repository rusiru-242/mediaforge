package com.mediaforge.backend.downloader.model;

public class MediaFormatOption {

    private String format;
    private String quality;
    private String resolution;
    private String mimeType;
    private Long estimatedBytes;
    private boolean nativeStream;
    private boolean requiresConversion;
    private String label;

    public MediaFormatOption() {
    }

    public MediaFormatOption(String format, String quality, String resolution, String mimeType,
                             Long estimatedBytes, boolean nativeStream, boolean requiresConversion, String label) {
        this.format = format;
        this.quality = quality;
        this.resolution = resolution;
        this.mimeType = mimeType;
        this.estimatedBytes = estimatedBytes;
        this.nativeStream = nativeStream;
        this.requiresConversion = requiresConversion;
        this.label = label;
    }

    public String getFormat() {
        return format;
    }

    public void setFormat(String format) {
        this.format = format;
    }

    public String getQuality() {
        return quality;
    }

    public void setQuality(String quality) {
        this.quality = quality;
    }

    public String getResolution() {
        return resolution;
    }

    public void setResolution(String resolution) {
        this.resolution = resolution;
    }

    public String getMimeType() {
        return mimeType;
    }

    public void setMimeType(String mimeType) {
        this.mimeType = mimeType;
    }

    public Long getEstimatedBytes() {
        return estimatedBytes;
    }

    public void setEstimatedBytes(Long estimatedBytes) {
        this.estimatedBytes = estimatedBytes;
    }

    public boolean isNativeStream() {
        return nativeStream;
    }

    public void setNativeStream(boolean nativeStream) {
        this.nativeStream = nativeStream;
    }

    public boolean isRequiresConversion() {
        return requiresConversion;
    }

    public void setRequiresConversion(boolean requiresConversion) {
        this.requiresConversion = requiresConversion;
    }

    public String getLabel() {
        return label;
    }

    public void setLabel(String label) {
        this.label = label;
    }
}

