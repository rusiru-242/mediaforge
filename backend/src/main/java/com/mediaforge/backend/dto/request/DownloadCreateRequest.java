package com.mediaforge.backend.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public class DownloadCreateRequest {

    @NotBlank(message = "url is required")
    private String url;

    @NotBlank(message = "selectedFormat is required")
    @Size(max = 20, message = "selectedFormat cannot exceed 20 characters")
    private String selectedFormat;

    @NotBlank(message = "selectedQuality is required")
    @Size(max = 20, message = "selectedQuality cannot exceed 20 characters")
    private String selectedQuality;

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
}

