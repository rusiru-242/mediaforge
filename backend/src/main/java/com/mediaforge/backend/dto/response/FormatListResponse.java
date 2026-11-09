package com.mediaforge.backend.dto.response;

import java.util.List;

public class FormatListResponse {

    private String category;
    private List<String> formats;

    public FormatListResponse() {
    }

    public FormatListResponse(String category, List<String> formats) {
        this.category = category;
        this.formats = formats;
    }

    public String getCategory() {
        return category;
    }

    public void setCategory(String category) {
        this.category = category;
    }

    public List<String> getFormats() {
        return formats;
    }

    public void setFormats(List<String> formats) {
        this.formats = formats;
    }
}
