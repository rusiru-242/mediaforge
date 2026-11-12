package com.mediaforge.backend.converter.model;

import java.util.ArrayList;
import java.util.List;

public class MediaProbeResult {
    private String formatName;
    private double durationSeconds;
    private long sizeBytes;
    private long bitRate;
    private List<VideoStreamInfo> videoStreams = new ArrayList<>();
    private List<AudioStreamInfo> audioStreams = new ArrayList<>();
    private int width;
    private int height;

    public MediaProbeResult() {
    }

    public boolean hasVideo() {
        return !videoStreams.isEmpty();
    }

    public boolean hasAudio() {
        return !audioStreams.isEmpty();
    }

    public boolean isImage() {
        return hasVideo() && durationSeconds <= 0.05 && (formatName == null || !formatName.contains("mp4") && !formatName.contains("matroska"));
    }

    public String getFormatName() {
        return formatName;
    }

    public void setFormatName(String formatName) {
        this.formatName = formatName;
    }

    public double getDurationSeconds() {
        return durationSeconds;
    }

    public void setDurationSeconds(double durationSeconds) {
        this.durationSeconds = durationSeconds;
    }

    public long getSizeBytes() {
        return sizeBytes;
    }

    public void setSizeBytes(long sizeBytes) {
        this.sizeBytes = sizeBytes;
    }

    public long getBitRate() {
        return bitRate;
    }

    public void setBitRate(long bitRate) {
        this.bitRate = bitRate;
    }

    public List<VideoStreamInfo> getVideoStreams() {
        return videoStreams;
    }

    public void setVideoStreams(List<VideoStreamInfo> videoStreams) {
        this.videoStreams = videoStreams;
    }

    public List<AudioStreamInfo> getAudioStreams() {
        return audioStreams;
    }

    public void setAudioStreams(List<AudioStreamInfo> audioStreams) {
        this.audioStreams = audioStreams;
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
}
