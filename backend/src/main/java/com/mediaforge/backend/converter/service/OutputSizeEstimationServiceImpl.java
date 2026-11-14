package com.mediaforge.backend.converter.service;

import com.mediaforge.backend.converter.model.MediaProbeResult;
import com.mediaforge.backend.dto.request.SizeEstimationRequest;
import com.mediaforge.backend.dto.request.TimeRangeDto;
import com.mediaforge.backend.dto.response.SizeEstimationResponse;
import com.mediaforge.backend.entity.MediaFile;
import com.mediaforge.backend.repository.MediaFileRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.nio.file.Path;
import java.util.Locale;
import java.util.Set;

@Service
public class OutputSizeEstimationServiceImpl implements OutputSizeEstimationService {

    private static final Logger log = LoggerFactory.getLogger(OutputSizeEstimationServiceImpl.class);

    private static final Set<String> VIDEO_FORMATS = Set.of("mp4", "webm", "mkv", "mov", "avi");
    private static final Set<String> AUDIO_FORMATS = Set.of("mp3", "wav", "aac", "flac", "ogg", "m4a");
    private static final Set<String> IMAGE_FORMATS = Set.of("jpg", "jpeg", "png", "webp", "avif", "bmp", "gif");

    private final MediaFileRepository fileRepository;
    private final ConversionStorageService storageService;
    private final MediaProbeService probeService;

    public OutputSizeEstimationServiceImpl(MediaFileRepository fileRepository,
                                          ConversionStorageService storageService,
                                          MediaProbeService probeService) {
        this.fileRepository = fileRepository;
        this.storageService = storageService;
        this.probeService = probeService;
    }

    @Override
    public SizeEstimationResponse estimateSize(SizeEstimationRequest request) {
        if (request == null) {
            return new SizeEstimationResponse(0L, 0L, 0L, "Size will be calculated after conversion", "", 0.0, "UNKNOWN", "");
        }

        // If inputFileId is provided, enrich with real probe metadata if missing in request
        if (request.getInputFileId() != null) {
            try {
                MediaFile file = fileRepository.findById(request.getInputFileId()).orElse(null);
                if (file != null) {
                    Path filePath = storageService.resolveFilePath(file);
                    if (filePath.toFile().exists()) {
                        MediaProbeResult probe = probeService.probe(filePath.toFile());
                        if (request.getSourceDuration() == null && probe.getDurationSeconds() > 0) {
                            request.setSourceDuration(probe.getDurationSeconds());
                        }
                        if (request.getSourceWidth() == null && probe.getWidth() > 0) {
                            request.setSourceWidth(probe.getWidth());
                        }
                        if (request.getSourceHeight() == null && probe.getHeight() > 0) {
                            request.setSourceHeight(probe.getHeight());
                        }
                        if (request.getSourceBitrate() == null && probe.getBitRate() > 0) {
                            request.setSourceBitrate(probe.getBitRate());
                        }
                        if (request.getSourceFileSize() == null && probe.getSizeBytes() > 0) {
                            request.setSourceFileSize(probe.getSizeBytes());
                        }
                    }
                }
            } catch (Exception e) {
                log.debug("Could not probe input file for size estimation: {}", e.getMessage());
            }
        }

        String format = request.getOutputFormat() != null ? request.getOutputFormat().toLowerCase(Locale.ROOT).replace(".", "") : "mp4";
        String mediaType = resolveMediaType(format, request.getMediaType());

        switch (mediaType) {
            case "video":
                return estimateVideoSize(request, format);
            case "audio":
                return estimateAudioSize(request, format);
            case "image":
                return estimateImageSize(request, format);
            default:
                return new SizeEstimationResponse(0L, 0L, 0L, "Size will be calculated after conversion", "", 0.0, "UNKNOWN", "");
        }
    }

    private String resolveMediaType(String format, String requestedType) {
        if (requestedType != null && !requestedType.isBlank()) {
            return requestedType.toLowerCase(Locale.ROOT).trim();
        }
        if (VIDEO_FORMATS.contains(format)) return "video";
        if (AUDIO_FORMATS.contains(format)) return "audio";
        if (IMAGE_FORMATS.contains(format)) return "image";
        return "video";
    }

    private SizeEstimationResponse estimateVideoSize(SizeEstimationRequest request, String format) {
        double sourceDuration = request.getSourceDuration() != null && request.getSourceDuration() > 0 ? request.getSourceDuration() : 60.0;
        double effectiveDuration = calculateEffectiveDuration(sourceDuration, request.getStartTime(), request.getEndTime(), request.getRemoveSegments());

        long videoBitrateBps = resolveVideoBitrate(request);
        long audioBitrateBps = Boolean.TRUE.equals(request.getStripAudio()) ? 0 : resolveAudioBitrate(request);

        long totalBitrateBps = videoBitrateBps + audioBitrateBps;
        double containerOverhead = 1.015; // 1.5% overhead for container atoms/headers

        long estimatedBytes = (long) Math.max(1024, (effectiveDuration * (totalBitrateBps / 8.0) * containerOverhead));
        long minBytes = (long) (estimatedBytes * 0.85);
        long maxBytes = (long) (estimatedBytes * 1.15);

        String formattedEstimate = "~" + formatBytes(estimatedBytes);
        String formattedRange = formatBytes(minBytes) + " – " + formatBytes(maxBytes);
        String disclaimer = "Estimated size based on bitrate, duration, and container overhead. Upscaling resolution does not restore missing source detail.";

        return new SizeEstimationResponse(
                estimatedBytes,
                minBytes,
                maxBytes,
                formattedEstimate,
                formattedRange,
                effectiveDuration,
                "BITRATE_DURATION",
                disclaimer
        );
    }

    private SizeEstimationResponse estimateAudioSize(SizeEstimationRequest request, String format) {
        double sourceDuration = request.getSourceDuration() != null && request.getSourceDuration() > 0 ? request.getSourceDuration() : 180.0;
        double effectiveDuration = calculateEffectiveDuration(sourceDuration, request.getStartTime(), request.getEndTime(), request.getRemoveSegments());

        long estimatedBytes;
        long minBytes;
        long maxBytes;
        String method;

        if ("wav".equalsIgnoreCase(format)) {
            // Uncompressed PCM: duration * sample_rate * channels * 2 bytes (16-bit)
            int sampleRate = 44100;
            int channels = 2;
            estimatedBytes = (long) (effectiveDuration * sampleRate * channels * 2 + 44);
            minBytes = (long) (estimatedBytes * 0.98);
            maxBytes = (long) (estimatedBytes * 1.02);
            method = "PCM_SAMPLE_CALCULATION";
        } else if ("flac".equalsIgnoreCase(format)) {
            // Lossless compression approx 55-65% of uncompressed PCM
            long uncompressed = (long) (effectiveDuration * 44100 * 2 * 2);
            estimatedBytes = (long) (uncompressed * 0.60);
            minBytes = (long) (uncompressed * 0.50);
            maxBytes = (long) (uncompressed * 0.70);
            method = "LOSSLESS_ESTIMATE";
        } else {
            // Lossy (MP3, AAC, OGG, M4A)
            long audioBitrateBps = resolveAudioBitrate(request);
            estimatedBytes = (long) Math.max(512, (effectiveDuration * (audioBitrateBps / 8.0) * 1.02));
            minBytes = (long) (estimatedBytes * 0.90);
            maxBytes = (long) (estimatedBytes * 1.10);
            method = "BITRATE_DURATION";
        }

        String formattedEstimate = "~" + formatBytes(estimatedBytes);
        String formattedRange = formatBytes(minBytes) + " – " + formatBytes(maxBytes);
        String disclaimer = "Estimated size based on audio duration and encoding bitrate.";

        return new SizeEstimationResponse(
                estimatedBytes,
                minBytes,
                maxBytes,
                formattedEstimate,
                formattedRange,
                effectiveDuration,
                method,
                disclaimer
        );
    }

    private SizeEstimationResponse estimateImageSize(SizeEstimationRequest request, String format) {
        int width = request.getImageWidth() != null && request.getImageWidth() > 0 ? request.getImageWidth() :
                (request.getCropWidth() != null && request.getCropWidth() > 0 ? request.getCropWidth() :
                        (request.getSourceWidth() != null && request.getSourceWidth() > 0 ? request.getSourceWidth() : 1920));
        int height = request.getImageHeight() != null && request.getImageHeight() > 0 ? request.getImageHeight() :
                (request.getCropHeight() != null && request.getCropHeight() > 0 ? request.getCropHeight() :
                        (request.getSourceHeight() != null && request.getSourceHeight() > 0 ? request.getSourceHeight() : 1080));

        long pixels = (long) width * height;
        int quality = request.getImageQuality() != null && request.getImageQuality() > 0 ? request.getImageQuality() : 85;

        double bytesPerPixel;
        double minFactor = 0.75;
        double maxFactor = 1.25;

        switch (format) {
            case "png":
                // Lossless RGBA
                bytesPerPixel = 0.35;
                minFactor = 0.70;
                maxFactor = 1.35;
                break;
            case "webp":
                bytesPerPixel = 0.03 + (quality / 100.0) * 0.08;
                minFactor = 0.80;
                maxFactor = 1.25;
                break;
            case "avif":
                bytesPerPixel = 0.02 + (quality / 100.0) * 0.06;
                minFactor = 0.80;
                maxFactor = 1.30;
                break;
            case "bmp":
                bytesPerPixel = 3.0;
                minFactor = 1.0;
                maxFactor = 1.0;
                break;
            case "jpg":
            case "jpeg":
            default:
                bytesPerPixel = 0.04 + (quality / 100.0) * 0.10;
                minFactor = 0.80;
                maxFactor = 1.25;
                break;
        }

        long estimatedBytes = (long) Math.max(1024, pixels * bytesPerPixel);
        long minBytes = (long) (estimatedBytes * minFactor);
        long maxBytes = (long) (estimatedBytes * maxFactor);

        String formattedEstimate = "~" + formatBytes(estimatedBytes);
        String formattedRange = formatBytes(minBytes) + " – " + formatBytes(maxBytes);
        String disclaimer = "Estimated image output size based on target dimensions (" + width + "x" + height + ") and compression factor.";

        return new SizeEstimationResponse(
                estimatedBytes,
                minBytes,
                maxBytes,
                formattedEstimate,
                formattedRange,
                0.0,
                "IMAGE_DIMENSION_COMPRESSION",
                disclaimer
        );
    }

    private double calculateEffectiveDuration(double sourceDuration, Double startTime, Double endTime, java.util.List<TimeRangeDto> removeSegments) {
        double start = (startTime != null && startTime >= 0.0) ? startTime : 0.0;
        double end = (endTime != null && endTime > start && endTime <= sourceDuration + 0.5) ? endTime : sourceDuration;
        double effective = Math.max(0.1, end - start);

        if (removeSegments != null && !removeSegments.isEmpty()) {
            for (TimeRangeDto seg : removeSegments) {
                if (seg.getStart() != null && seg.getEnd() != null && seg.getEnd() > seg.getStart()) {
                    double rStart = Math.max(start, seg.getStart());
                    double rEnd = Math.min(end, seg.getEnd());
                    if (rEnd > rStart) {
                        effective -= (rEnd - rStart);
                    }
                }
            }
        }
        return Math.max(0.1, effective);
    }

    private long resolveVideoBitrate(SizeEstimationRequest request) {
        if (request.getVideoBitrate() != null && !request.getVideoBitrate().isBlank() && !"auto".equalsIgnoreCase(request.getVideoBitrate())) {
            String b = request.getVideoBitrate().trim().toLowerCase(Locale.ROOT);
            try {
                if (b.endsWith("k")) {
                    return Long.parseLong(b.replace("k", "")) * 1000L;
                } else if (b.endsWith("m")) {
                    return (long) (Double.parseDouble(b.replace("m", "")) * 1000_000L);
                } else {
                    return Long.parseLong(b) * 1000L;
                }
            } catch (NumberFormatException ignored) {
            }
        }

        // Base bitrate by resolution
        long baseBps = 2000_000L; // default 720p
        String res = request.getTargetResolution() != null ? request.getTargetResolution().toLowerCase(Locale.ROOT) : "source";
        switch (res) {
            case "2160p":
            case "4k":
                baseBps = 16000_000L;
                break;
            case "1440p":
            case "2k":
                baseBps = 8000_000L;
                break;
            case "1080p":
                baseBps = 3500_000L;
                break;
            case "720p":
                baseBps = 1800_000L;
                break;
            case "480p":
                baseBps = 900_000L;
                break;
            case "360p":
                baseBps = 500_000L;
                break;
            case "240p":
                baseBps = 300_000L;
                break;
            default:
                if (request.getSourceBitrate() != null && request.getSourceBitrate() > 0) {
                    baseBps = request.getSourceBitrate();
                }
                break;
        }

        // Adjust for quality preset
        if (request.getQualityPreset() != null) {
            switch (request.getQualityPreset().toLowerCase(Locale.ROOT)) {
                case "best":
                case "best available":
                    baseBps = (long) (baseBps * 1.35);
                    break;
                case "high":
                    baseBps = (long) (baseBps * 1.0);
                    break;
                case "medium":
                case "balanced":
                    baseBps = (long) (baseBps * 0.75);
                    break;
                case "low":
                case "small":
                    baseBps = (long) (baseBps * 0.45);
                    break;
            }
        }

        // Adjust for CRF if provided
        if (request.getCrf() != null) {
            int crf = Math.max(14, Math.min(36, request.getCrf()));
            double crfFactor = Math.pow(10, (23.0 - crf) / 14.0);
            baseBps = (long) (baseBps * crfFactor);
        }

        return Math.max(150_000L, baseBps);
    }

    private long resolveAudioBitrate(SizeEstimationRequest request) {
        if (request.getAudioBitrate() != null && request.getAudioBitrate() > 0) {
            return request.getAudioBitrate() * 1000L;
        }
        return 192_000L;
    }

    private String formatBytes(long bytes) {
        if (bytes < 1024 * 1024) {
            return String.format(Locale.ROOT, "%.1f KB", bytes / 1024.0);
        } else if (bytes < 1024L * 1024L * 1024L) {
            return String.format(Locale.ROOT, "%.1f MB", bytes / (1024.0 * 1024.0));
        } else {
            return String.format(Locale.ROOT, "%.2f GB", bytes / (1024.0 * 1024.0 * 1024.0));
        }
    }
}
