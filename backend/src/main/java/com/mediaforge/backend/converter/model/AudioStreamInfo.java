package com.mediaforge.backend.converter.model;

public class AudioStreamInfo {
    private String codecName;
    private int sampleRate;
    private int channels;
    private long bitRate;
    private String channelLayout;

    public AudioStreamInfo() {
    }

    public AudioStreamInfo(String codecName, int sampleRate, int channels, long bitRate, String channelLayout) {
        this.codecName = codecName;
        this.sampleRate = sampleRate;
        this.channels = channels;
        this.bitRate = bitRate;
        this.channelLayout = channelLayout;
    }

    public String getCodecName() {
        return codecName;
    }

    public void setCodecName(String codecName) {
        this.codecName = codecName;
    }

    public int getSampleRate() {
        return sampleRate;
    }

    public void setSampleRate(int sampleRate) {
        this.sampleRate = sampleRate;
    }

    public int getChannels() {
        return channels;
    }

    public void setChannels(int channels) {
        this.channels = channels;
    }

    public long getBitRate() {
        return bitRate;
    }

    public void setBitRate(long bitRate) {
        this.bitRate = bitRate;
    }

    public String getChannelLayout() {
        return channelLayout;
    }

    public void setChannelLayout(String channelLayout) {
        this.channelLayout = channelLayout;
    }
}
