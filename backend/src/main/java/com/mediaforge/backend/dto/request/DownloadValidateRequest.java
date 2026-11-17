package com.mediaforge.backend.dto.request;

import jakarta.validation.constraints.NotBlank;
import org.hibernate.validator.constraints.URL;

public class DownloadValidateRequest {

    @NotBlank(message = "url is required")
    @jakarta.validation.constraints.Size(max = 4096, message = "URL cannot exceed 4096 characters")
    private String url;

    public DownloadValidateRequest() {
    }

    public DownloadValidateRequest(String url) {
        this.url = url;
    }

    public String getUrl() {
        return url;
    }

    public void setUrl(String url) {
        this.url = url;
    }
}
