package com.mediaforge.backend.downloader.service;

import com.mediaforge.backend.converter.model.MediaProbeResult;
import com.mediaforge.backend.converter.service.MediaProbeService;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Locale;
import java.util.Set;

/** Validates bytes and streams; an extension or extractor exit code is never proof of video. */
@Service
public class DownloadOutputVerifier {
    private final MediaProbeService probeService;

    public DownloadOutputVerifier(MediaProbeService probeService) {
        this.probeService = probeService;
    }

    public static boolean isAudio(String format) {
        return Set.of("mp3", "m4a", "wav", "aac", "flac", "ogg", "opus", "wma").contains(format.toLowerCase(Locale.ROOT));
    }

    public MediaProbeResult inspect(Path path) throws IOException {
        if (!Files.isRegularFile(path) || Files.size(path) <= 0) {
            throw new IOException("Download produced an empty or missing media file.");
        }
        try {
            MediaProbeResult probe = probeService.probe(path.toFile());
            if (!Double.isFinite(probe.getDurationSeconds()) || probe.getDurationSeconds() <= 0
                    || probe.getSizeBytes() != Files.size(path)) {
                throw new IOException("Downloaded media has invalid duration or file size.");
            }
            return probe;
        } catch (IOException ex) {
            throw ex;
        } catch (RuntimeException ex) {
            throw new IOException("FFprobe could not verify downloaded media: " + ex.getMessage(), ex);
        }
    }

    public MediaProbeResult verify(Path path, String format, boolean audioExpected) throws IOException {
        MediaProbeResult probe = inspect(path);
        if (isAudio(format)) {
            if (!probe.hasAudio() || probe.hasVideo()) {
                throw new IOException("Requested " + format + " audio, but output is not audio-only.");
            }
        } else {
            if (!probe.hasVideo()) {
                throw new IOException("Requested " + format + " video, but output contains no video stream. Audio-only output rejected.");
            }
            if (audioExpected && !probe.hasAudio()) {
                throw new IOException("Source provides audio, but the final video is missing its audio stream.");
            }
        }
        String detected = probe.getFormatName() == null ? "" : probe.getFormatName();
        boolean containerMatches = switch (format.toLowerCase(Locale.ROOT)) {
            case "mp4", "m4a", "mov" -> detected.contains("mp4") || detected.contains("mov");
            case "webm" -> detected.contains("webm") && probe.getVideoStreams().stream()
                    .allMatch(v -> Set.of("vp8", "vp9", "av1").contains(v.getCodecName()))
                    && probe.getAudioStreams().stream().allMatch(a -> Set.of("opus", "vorbis").contains(a.getCodecName()));
            case "mkv" -> detected.contains("matroska");
            case "mp3" -> detected.equals("mp3") && probe.getAudioStreams().stream().allMatch(a -> "mp3".equals(a.getCodecName()));
            case "wav" -> detected.equals("wav");
            default -> Set.of(detected.split(",")).contains(format.toLowerCase(Locale.ROOT));
        };
        if (!containerMatches) throw new IOException("Requested " + format + " container, but FFprobe detected " + detected + ".");
        if ("m4a".equalsIgnoreCase(format) && probe.getAudioStreams().stream()
                .anyMatch(a -> !Set.of("aac", "alac").contains(a.getCodecName()))) {
            throw new IOException("M4A output does not contain compatible AAC/ALAC audio.");
        }
        return probe;
    }

    public static String mimeType(String format) {
        return switch (format.toLowerCase(Locale.ROOT)) {
            case "mp4" -> "video/mp4";
            case "webm" -> "video/webm";
            case "mkv" -> "video/x-matroska";
            case "mov" -> "video/quicktime";
            case "avi" -> "video/x-msvideo";
            case "flv" -> "video/x-flv";
            case "mp3" -> "audio/mpeg";
            case "m4a" -> "audio/mp4";
            case "wav" -> "audio/wav";
            case "flac" -> "audio/flac";
            default -> "application/octet-stream";
        };
    }
}
