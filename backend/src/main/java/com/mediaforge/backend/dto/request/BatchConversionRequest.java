package com.mediaforge.backend.dto.request;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;
import java.util.List;

public class BatchConversionRequest {

    @NotEmpty(message = "Conversion items list cannot be empty")
    @Valid
    private List<ConversionCreateRequest> items;

    private String globalOutputFormat;

    public BatchConversionRequest() {
    }

    public BatchConversionRequest(List<ConversionCreateRequest> items) {
        this.items = items;
    }

    public List<ConversionCreateRequest> getItems() {
        return items;
    }

    public void setItems(List<ConversionCreateRequest> items) {
        this.items = items;
    }

    public String getGlobalOutputFormat() {
        return globalOutputFormat;
    }

    public void setGlobalOutputFormat(String globalOutputFormat) {
        this.globalOutputFormat = globalOutputFormat;
    }
}
