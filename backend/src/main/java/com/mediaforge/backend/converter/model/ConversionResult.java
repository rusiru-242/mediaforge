package com.mediaforge.backend.converter.model;

import java.io.File;

public class ConversionResult {
    private File outputFile;
    private String outputFormat;
    private double durationSeconds;
    private long fileSizeBytes;
    private String mimeType;
    private boolean success;
    private String errorMessage;

    public ConversionResult() {
    }

    public static ConversionResult success(File outputFile, String outputFormat, double durationSeconds, long fileSizeBytes, String mimeType) {
        ConversionResult result = new ConversionResult();
        result.setOutputFile(outputFile);
        result.setOutputFormat(outputFormat);
        result.setDurationSeconds(durationSeconds);
        result.setFileSizeBytes(fileSizeBytes);
        result.setMimeType(mimeType);
        result.setSuccess(true);
        return result;
    }

    public static ConversionResult failure(String errorMessage) {
        ConversionResult result = new ConversionResult();
        result.setSuccess(false);
        result.setErrorMessage(errorMessage);
        return result;
    }

    public File getOutputFile() {
        return outputFile;
    }

    public void setOutputFile(File outputFile) {
        this.outputFile = outputFile;
    }

    public String getOutputFormat() {
        return outputFormat;
    }

    public void setOutputFormat(String outputFormat) {
        this.outputFormat = outputFormat;
    }

    public double getDurationSeconds() {
        return durationSeconds;
    }

    public void setDurationSeconds(double durationSeconds) {
        this.durationSeconds = durationSeconds;
    }

    public long getFileSizeBytes() {
        return fileSizeBytes;
    }

    public void setFileSizeBytes(long fileSizeBytes) {
        this.fileSizeBytes = fileSizeBytes;
    }

    public String getMimeType() {
        return mimeType;
    }

    public void setMimeType(String mimeType) {
        this.mimeType = mimeType;
    }

    public boolean isSuccess() {
        return success;
    }

    public void setSuccess(boolean success) {
        this.success = success;
    }

    public String getErrorMessage() {
        return errorMessage;
    }

    public void setErrorMessage(String errorMessage) {
        this.errorMessage = errorMessage;
    }
}
