package com.mediaforge.backend.converter.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.mediaforge.backend.converter.model.AudioStreamInfo;
import com.mediaforge.backend.converter.model.MediaProbeResult;
import com.mediaforge.backend.converter.model.VideoStreamInfo;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.io.BufferedReader;
import java.io.File;
import java.io.InputStreamReader;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.TimeUnit;

@Service
public class MediaProbeServiceImpl implements MediaProbeService {

    private static final Logger log = LoggerFactory.getLogger(MediaProbeServiceImpl.class);

    @Value("${app.converter.ffprobe-path:ffprobe}")
    private String configuredFfprobePath;

    private final ObjectMapper objectMapper;
    private String resolvedFfprobeExecutable;

    public MediaProbeServiceImpl(ObjectMapper objectMapper) {
        this.objectMapper = objectMapper;
    }

    private synchronized String getFfprobeExecutable() {
        if (resolvedFfprobeExecutable != null) {
            return resolvedFfprobeExecutable;
        }

        // 1. Try configured path directly
        if (checkExecutable(configuredFfprobePath)) {
            resolvedFfprobeExecutable = configuredFfprobePath;
            return resolvedFfprobeExecutable;
        }

        // 2. Check WinGet / User AppData path on Windows
        String userHome = System.getProperty("user.home");
        if (userHome != null) {
            Path wingetPath = Paths.get(userHome, "AppData", "Local", "Microsoft", "WinGet", "Links", "ffprobe.exe");
            if (Files.exists(wingetPath) && Files.isExecutable(wingetPath)) {
                resolvedFfprobeExecutable = wingetPath.toString();
                return resolvedFfprobeExecutable;
            }
        }

        // 3. Fallback to standard path
        resolvedFfprobeExecutable = "ffprobe";
        return resolvedFfprobeExecutable;
    }

    private boolean checkExecutable(String cmd) {
        try {
            ProcessBuilder pb = new ProcessBuilder(cmd, "-version");
            Process p = pb.start();
            boolean finished = p.waitFor(3, TimeUnit.SECONDS);
            return finished && p.exitValue() == 0;
        } catch (Exception e) {
            return false;
        }
    }

    @Override
    public boolean isAvailable() {
        return checkExecutable(getFfprobeExecutable());
    }

    @Override
    public MediaProbeResult probe(File file) {
        if (file == null || !file.exists()) {
            throw new IllegalArgumentException("Cannot probe non-existent file: " + (file != null ? file.getAbsolutePath() : "null"));
        }

        String ffprobe = getFfprobeExecutable();
        List<String> command = List.of(
                ffprobe,
                "-v", "quiet",
                "-print_format", "json",
                "-show_format",
                "-show_streams",
                file.getAbsolutePath()
        );

        StringBuilder output = new StringBuilder();
        StringBuilder errorOutput = new StringBuilder();

        try {
            ProcessBuilder pb = new ProcessBuilder(command);
            Process process = pb.start();

            try (BufferedReader reader = new BufferedReader(new InputStreamReader(process.getInputStream()))) {
                String line;
                while ((line = reader.readLine()) != null) {
                    output.append(line).append("\n");
                }
            }

            try (BufferedReader errReader = new BufferedReader(new InputStreamReader(process.getErrorStream()))) {
                String line;
                while ((line = errReader.readLine()) != null) {
                    errorOutput.append(line).append("\n");
                }
            }

            boolean completed = process.waitFor(15, TimeUnit.SECONDS);
            if (!completed) {
                process.destroyForcibly();
                throw new IllegalStateException("FFprobe inspection timed out for file: " + file.getName());
            }

            if (process.exitValue() != 0) {
                log.warn("FFprobe returned non-zero exit code {}: {}", process.exitValue(), errorOutput);
                throw new IllegalArgumentException("Corrupted or unsupported media file: " + errorOutput);
            }

            return parseProbeJson(output.toString(), file);
        } catch (IllegalArgumentException | IllegalStateException e) {
            throw e;
        } catch (Exception e) {
            log.error("Failed to execute FFprobe on {}", file.getAbsolutePath(), e);
            throw new RuntimeException("FFprobe inspection error: " + e.getMessage(), e);
        }
    }

    private MediaProbeResult parseProbeJson(String json, File file) {
        try {
            JsonNode root = objectMapper.readTree(json);
            MediaProbeResult result = new MediaProbeResult();

            // Parse format node
            JsonNode formatNode = root.get("format");
            if (formatNode != null) {
                if (formatNode.has("format_name")) {
                    result.setFormatName(formatNode.get("format_name").asText());
                }
                if (formatNode.has("duration")) {
                    result.setDurationSeconds(formatNode.get("duration").asDouble());
                }
                if (formatNode.has("size")) {
                    result.setSizeBytes(formatNode.get("size").asLong());
                } else {
                    result.setSizeBytes(file.length());
                }
                if (formatNode.has("bit_rate")) {
                    result.setBitRate(formatNode.get("bit_rate").asLong());
                }
            } else {
                result.setSizeBytes(file.length());
            }

            // Parse streams node
            JsonNode streamsNode = root.get("streams");
            if (streamsNode != null && streamsNode.isArray()) {
                List<VideoStreamInfo> videoStreams = new ArrayList<>();
                List<AudioStreamInfo> audioStreams = new ArrayList<>();

                for (JsonNode stream : streamsNode) {
                    String codecType = stream.has("codec_type") ? stream.get("codec_type").asText() : "";
                    String codecName = stream.has("codec_name") ? stream.get("codec_name").asText() : "";

                    if ("video".equalsIgnoreCase(codecType)) {
                        VideoStreamInfo vInfo = new VideoStreamInfo();
                        vInfo.setCodecName(codecName);
                        if (stream.has("width")) {
                            int w = stream.get("width").asInt();
                            vInfo.setWidth(w);
                            if (result.getWidth() == 0) result.setWidth(w);
                        }
                        if (stream.has("height")) {
                            int h = stream.get("height").asInt();
                            vInfo.setHeight(h);
                            if (result.getHeight() == 0) result.setHeight(h);
                        }
                        if (stream.has("pix_fmt")) {
                            vInfo.setPixelFormat(stream.get("pix_fmt").asText());
                        }
                        if (stream.has("bit_rate")) {
                            vInfo.setBitRate(stream.get("bit_rate").asLong());
                        }
                        if (stream.has("r_frame_rate")) {
                            vInfo.setFrameRate(parseFrameRate(stream.get("r_frame_rate").asText()));
                        }
                        videoStreams.add(vInfo);
                    } else if ("audio".equalsIgnoreCase(codecType)) {
                        AudioStreamInfo aInfo = new AudioStreamInfo();
                        aInfo.setCodecName(codecName);
                        if (stream.has("sample_rate")) {
                            aInfo.setSampleRate(stream.get("sample_rate").asInt());
                        }
                        if (stream.has("channels")) {
                            aInfo.setChannels(stream.get("channels").asInt());
                        }
                        if (stream.has("bit_rate")) {
                            aInfo.setBitRate(stream.get("bit_rate").asLong());
                        }
                        if (stream.has("channel_layout")) {
                            aInfo.setChannelLayout(stream.get("channel_layout").asText());
                        }
                        audioStreams.add(aInfo);
                    }
                }

                result.setVideoStreams(videoStreams);
                result.setAudioStreams(audioStreams);
            }

            return result;
        } catch (Exception e) {
            log.error("Failed to parse FFprobe JSON", e);
            throw new IllegalArgumentException("Invalid media structure received from FFprobe", e);
        }
    }

    private double parseFrameRate(String rFrameRate) {
        try {
            if (rFrameRate.contains("/")) {
                String[] parts = rFrameRate.split("/");
                double num = Double.parseDouble(parts[0]);
                double den = Double.parseDouble(parts[1]);
                return den != 0 ? num / den : 0;
            }
            return Double.parseDouble(rFrameRate);
        } catch (Exception e) {
            return 30.0;
        }
    }
}
