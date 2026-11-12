package com.mediaforge.backend.converter.model;

public class VideoStreamInfo {
    private String codecName;
    private int width;
    private int height;
    private double frameRate;
    private long bitRate;
    private String pixelFormat;

    public VideoStreamInfo() {
    }

    public VideoStreamInfo(String codecName, int width, int height, double frameRate, long bitRate, String pixelFormat) {
        this.codecName = codecName;
        this.width = width;
        this.height = height;
        this.frameRate = frameRate;
        this.bitRate = bitRate;
        this.pixelFormat = pixelFormat;
    }

    public String getCodecName() {
        return codecName;
    }

    public void setCodecName(String codecName) {
        this.codecName = codecName;
    }

    public int getWidth() {
        return width;
    }

    public void setWidth(int width) {
        this.width = width;
    }

    public int getHeight() {
        return height;
    }

    public void setHeight(int height) {
        this.height = height;
    }

    public double getFrameRate() {
        return frameRate;
    }

    public void setFrameRate(double frameRate) {
        this.frameRate = frameRate;
    }

    public long getBitRate() {
        return bitRate;
    }

    public void setBitRate(long bitRate) {
        this.bitRate = bitRate;
    }

    public String getPixelFormat() {
        return pixelFormat;
    }

    public void setPixelFormat(String pixelFormat) {
        this.pixelFormat = pixelFormat;
    }
}
