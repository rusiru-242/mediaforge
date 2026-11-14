package com.mediaforge.backend.dto.response;

public class SizeEstimationResponse {

    private Long estimatedBytes;
    private Long minBytes;
    private Long maxBytes;
    private String formattedEstimate;
    private String formattedRange;
    private Double effectiveDurationSeconds;
    private String estimationMethod;
    private String disclaimer;

    public SizeEstimationResponse() {
    }

    public SizeEstimationResponse(Long estimatedBytes, Long minBytes, Long maxBytes,
                                  String formattedEstimate, String formattedRange,
                                  Double effectiveDurationSeconds, String estimationMethod, String disclaimer) {
        this.estimatedBytes = estimatedBytes;
        this.minBytes = minBytes;
        this.maxBytes = maxBytes;
        this.formattedEstimate = formattedEstimate;
        this.formattedRange = formattedRange;
        this.effectiveDurationSeconds = effectiveDurationSeconds;
        this.estimationMethod = estimationMethod;
        this.disclaimer = disclaimer;
    }

    public Long getEstimatedBytes() {
        return estimatedBytes;
    }

    public void setEstimatedBytes(Long estimatedBytes) {
        this.estimatedBytes = estimatedBytes;
    }

    public Long getMinBytes() {
        return minBytes;
    }

    public void setMinBytes(Long minBytes) {
        this.minBytes = minBytes;
    }

    public Long getMaxBytes() {
        return maxBytes;
    }

    public void setMaxBytes(Long maxBytes) {
        this.maxBytes = maxBytes;
    }

    public String getFormattedEstimate() {
        return formattedEstimate;
    }

    public void setFormattedEstimate(String formattedEstimate) {
        this.formattedEstimate = formattedEstimate;
    }

    public String getFormattedRange() {
        return formattedRange;
    }

    public void setFormattedRange(String formattedRange) {
        this.formattedRange = formattedRange;
    }

    public Double getEffectiveDurationSeconds() {
        return effectiveDurationSeconds;
    }

    public void setEffectiveDurationSeconds(Double effectiveDurationSeconds) {
        this.effectiveDurationSeconds = effectiveDurationSeconds;
    }

    public String getEstimationMethod() {
        return estimationMethod;
    }

    public void setEstimationMethod(String estimationMethod) {
        this.estimationMethod = estimationMethod;
    }

    public String getDisclaimer() {
        return disclaimer;
    }

    public void setDisclaimer(String disclaimer) {
        this.disclaimer = disclaimer;
    }
}
