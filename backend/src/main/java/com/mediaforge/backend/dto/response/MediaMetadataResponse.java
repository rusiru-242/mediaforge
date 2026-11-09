package com.mediaforge.backend.dto.response;

import java.util.ArrayList;
import java.util.List;

public class MediaMetadataResponse {

    private boolean success;
    private String url;
    private String platform;
    private String title;
    private String mediaType;
    private String mimeType;
    private String containerFormat;
    private Long fileSize;
    private String resolution;
    private Double duration;
    private String thumbnail;
    private List<MediaFormatOptionDto> availableFormats = new ArrayList<>();
    private List<String> availableQualities = new ArrayList<>();
    private boolean directDownloadSupported;
    private String message;

    public MediaMetadataResponse() {
    }

    public MediaMetadataResponse(boolean success, String url, String platform, String title,
                                 String mediaType, String mimeType, String containerFormat,
                                 Long fileSize, String resolution, Double duration, String thumbnail,
                                 List<MediaFormatOptionDto> availableFormats, List<String> availableQualities,
                                 boolean directDownloadSupported, String message) {
        this.success = success;
        this.url = url;
        this.platform = platform;
        this.title = title;
        this.mediaType = mediaType;
        this.mimeType = mimeType;
        this.containerFormat = containerFormat;
        this.fileSize = fileSize;
        this.resolution = resolution;
        this.duration = duration;
        this.thumbnail = thumbnail;
        this.availableFormats = availableFormats != null ? availableFormats : new ArrayList<>();
        this.availableQualities = availableQualities != null ? availableQualities : new ArrayList<>();
        this.directDownloadSupported = directDownloadSupported;
        this.message = message;
    }

    public boolean isSuccess() {
        return success;
    }

    public void setSuccess(boolean success) {
        this.success = success;
    }

    public String getUrl() {
        return url;
    }

    public void setUrl(String url) {
        this.url = url;
    }

    public String getPlatform() {
        return platform;
    }

    public void setPlatform(String platform) {
        this.platform = platform;
    }

    public String getTitle() {
        return title;
    }

    public void setTitle(String title) {
        this.title = title;
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

    public String getResolution() {
        return resolution;
    }

    public void setResolution(String resolution) {
        this.resolution = resolution;
    }

    public Double getDuration() {
        return duration;
    }

    public void setDuration(Double duration) {
        this.duration = duration;
    }

    public String getThumbnail() {
        return thumbnail;
    }

    public void setThumbnail(String thumbnail) {
        this.thumbnail = thumbnail;
    }

    public List<MediaFormatOptionDto> getAvailableFormats() {
        return availableFormats;
    }

    public void setAvailableFormats(List<MediaFormatOptionDto> availableFormats) {
        this.availableFormats = availableFormats != null ? availableFormats : new ArrayList<>();
    }

    public List<String> getAvailableQualities() {
        return availableQualities;
    }

    public void setAvailableQualities(List<String> availableQualities) {
        this.availableQualities = availableQualities != null ? availableQualities : new ArrayList<>();
    }

    public boolean isDirectDownloadSupported() {
        return directDownloadSupported;
    }

    public void setDirectDownloadSupported(boolean directDownloadSupported) {
        this.directDownloadSupported = directDownloadSupported;
    }

    public String getMessage() {
        return message;
    }

    public void setMessage(String message) {
        this.message = message;
    }
}
