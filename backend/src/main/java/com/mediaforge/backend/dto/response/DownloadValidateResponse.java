package com.mediaforge.backend.dto.response;

import java.util.List;

public class DownloadValidateResponse {

    private boolean valid;
    private String url;
    private String platform;
    private List<String> availableFormats;
    private List<String> availableQualities;
    private String message;

    public DownloadValidateResponse() {
    }

    public DownloadValidateResponse(boolean valid, String url, String platform, List<String> availableFormats,
                                    List<String> availableQualities, String message) {
        this.valid = valid;
        this.url = url;
        this.platform = platform;
        this.availableFormats = availableFormats;
        this.availableQualities = availableQualities;
        this.message = message;
    }

    public boolean isValid() {
        return valid;
    }

    public void setValid(boolean valid) {
        this.valid = valid;
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

    public List<String> getAvailableFormats() {
        return availableFormats;
    }

    public void setAvailableFormats(List<String> availableFormats) {
        this.availableFormats = availableFormats;
    }

    public List<String> getAvailableQualities() {
        return availableQualities;
    }

    public void setAvailableQualities(List<String> availableQualities) {
        this.availableQualities = availableQualities;
    }

    public String getMessage() {
        return message;
    }

    public void setMessage(String message) {
        this.message = message;
    }
}
