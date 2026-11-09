package com.mediaforge.backend.downloader.model;

import java.util.ArrayList;
import java.util.List;

public class MediaMetadata {

    private String title;
    private String sourceName;
    private String mediaType; // "VIDEO", "AUDIO", "IMAGE"
    private String mimeType;
    private String containerFormat;
    private Long fileSize;
    private Integer width;
    private Integer height;
    private Double durationSeconds;
    private String resolution;
    private String thumbnailUri;
    private List<MediaFormatOption> availableFormats = new ArrayList<>();
    private List<String> availableQualities = new ArrayList<>();
    private boolean requiresConversion;
    private String directStreamUri;

    public MediaMetadata() {
    }

    public MediaMetadata(String title, String sourceName, String mediaType, String mimeType,
                         String containerFormat, Long fileSize) {
        this.title = title;
        this.sourceName = sourceName;
        this.mediaType = mediaType;
        this.mimeType = mimeType;
        this.containerFormat = containerFormat;
        this.fileSize = fileSize;
    }

    public String getTitle() {
        return title;
    }

    public void setTitle(String title) {
        this.title = title;
    }

    public String getSourceName() {
        return sourceName;
    }

    public void setSourceName(String sourceName) {
        this.sourceName = sourceName;
    }

    public String getMediaType() {
        return mediaType;
    }

    public void setMediaType(String mediaType) {
        this.mediaType = mediaType;
    }

    public String getMimeType() {
        return mimeType;
    }

    public void setMimeType(String mimeType) {
        this.mimeType = mimeType;
    }

    public String getContainerFormat() {
        return containerFormat;
    }

    public void setContainerFormat(String containerFormat) {
        this.containerFormat = containerFormat;
    }

    public Long getFileSize() {
        return fileSize;
    }

    public void setFileSize(Long fileSize) {
        this.fileSize = fileSize;
    }

    public Integer getWidth() {
        return width;
    }

    public void setWidth(Integer width) {
        this.width = width;
    }

    public Integer getHeight() {
        return height;
    }

    public void setHeight(Integer height) {
        this.height = height;
    }

    public Double getDurationSeconds() {
        return durationSeconds;
    }

    public void setDurationSeconds(Double durationSeconds) {
        this.durationSeconds = durationSeconds;
    }

    public String getResolution() {
        return resolution;
    }

    public void setResolution(String resolution) {
        this.resolution = resolution;
    }

    public String getThumbnailUri() {
        return thumbnailUri;
    }

    public void setThumbnailUri(String thumbnailUri) {
        this.thumbnailUri = thumbnailUri;
    }

    public List<MediaFormatOption> getAvailableFormats() {
        return availableFormats;
    }

    public void setAvailableFormats(List<MediaFormatOption> availableFormats) {
        this.availableFormats = availableFormats != null ? availableFormats : new ArrayList<>();
    }

    public List<String> getAvailableQualities() {
        return availableQualities;
    }

    public void setAvailableQualities(List<String> availableQualities) {
        this.availableQualities = availableQualities != null ? availableQualities : new ArrayList<>();
    }

    public boolean isRequiresConversion() {
        return requiresConversion;
    }

    public void setRequiresConversion(boolean requiresConversion) {
        this.requiresConversion = requiresConversion;
    }

    public String getDirectStreamUri() {
        return directStreamUri;
    }

    public void setDirectStreamUri(String directStreamUri) {
        this.directStreamUri = directStreamUri;
    }
}

