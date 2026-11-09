package com.mediaforge.backend.dto.request;

import com.mediaforge.backend.enums.JobType;
import com.mediaforge.backend.enums.SourceType;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public class JobCreateRequest {

    @NotNull(message = "jobType is required")
    private JobType jobType;

    @NotNull(message = "sourceType is required")
    private SourceType sourceType;

    @Size(max = 20, message = "inputFormat cannot exceed 20 characters")
    private String inputFormat;

    @NotBlank(message = "outputFormat is required")
    @Size(max = 20, message = "outputFormat cannot exceed 20 characters")
    private String outputFormat;

    public JobCreateRequest() {
    }

    public JobCreateRequest(JobType jobType, SourceType sourceType, String inputFormat, String outputFormat) {
        this.jobType = jobType;
        this.sourceType = sourceType;
        this.inputFormat = inputFormat;
        this.outputFormat = outputFormat;
    }

    public JobType getJobType() {
        return jobType;
    }

    public void setJobType(JobType jobType) {
        this.jobType = jobType;
    }

    public SourceType getSourceType() {
        return sourceType;
    }

    public void setSourceType(SourceType sourceType) {
        this.sourceType = sourceType;
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
}

