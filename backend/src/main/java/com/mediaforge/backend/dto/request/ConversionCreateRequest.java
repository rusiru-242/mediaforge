package com.mediaforge.backend.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import java.util.UUID;

public class ConversionCreateRequest {

    private UUID inputFileId;

    @Size(max = 20, message = "inputFormat cannot exceed 20 characters")
    private String inputFormat;

    @NotBlank(message = "outputFormat is required")
    @Size(max = 20, message = "outputFormat cannot exceed 20 characters")
    private String outputFormat;

    @Size(max = 20, message = "targetResolution cannot exceed 20 characters")
    private String targetResolution;

    private Integer audioBitrate;

    public ConversionCreateRequest() {
    }

    public ConversionCreateRequest(UUID inputFileId, String inputFormat, String outputFormat, String targetResolution, Integer audioBitrate) {
        this.inputFileId = inputFileId;
        this.inputFormat = inputFormat;
        this.outputFormat = outputFormat;
        this.targetResolution = targetResolution;
        this.audioBitrate = audioBitrate;
    }

    public UUID getInputFileId() {
        return inputFileId;
    }

    public void setInputFileId(UUID inputFileId) {
        this.inputFileId = inputFileId;
    }

    public String getInputFormat() {
        return inputFormat;
    }

    public void setInputFormat(String inputFormat) {
        this.inputFormat = inputFormat;
    }

    public String getOutputFormat() {
        return outputFormat;
    }

    public void setOutputFormat(String outputFormat) {
        this.outputFormat = outputFormat;
    }

    public String getTargetResolution() {
        return targetResolution;
    }

    public void setTargetResolution(String targetResolution) {
        this.targetResolution = targetResolution;
    }

    public Integer getAudioBitrate() {
        return audioBitrate;
    }

    public void setAudioBitrate(Integer audioBitrate) {
        this.audioBitrate = audioBitrate;
    }
}
