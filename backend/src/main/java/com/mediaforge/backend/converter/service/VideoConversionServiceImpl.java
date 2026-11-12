package com.mediaforge.backend.converter.service;

import com.mediaforge.backend.converter.model.ConversionOptions;
import com.mediaforge.backend.converter.model.ConversionProgress;
import com.mediaforge.backend.converter.model.ConversionResult;
import com.mediaforge.backend.converter.model.MediaProbeResult;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.io.File;
import java.nio.file.Files;
import java.util.*;
import java.util.function.Consumer;

@Service
public class VideoConversionServiceImpl implements VideoConversionService {

    private static final Logger log = LoggerFactory.getLogger(VideoConversionServiceImpl.class);

    private static final Set<String> SUPPORTED_FORMATS = Set.of("mp4", "webm", "mkv", "mov", "avi");

    private final FFmpegProcessExecutor ffmpegExecutor;
    private final MediaProbeService probeService;

    public VideoConversionServiceImpl(FFmpegProcessExecutor ffmpegExecutor, MediaProbeService probeService) {
        this.ffmpegExecutor = ffmpegExecutor;
        this.probeService = probeService;
    }

    @Override
    public boolean supportsFormat(String targetFormat) {
        if (targetFormat == null) return false;
        return SUPPORTED_FORMATS.contains(targetFormat.toLowerCase(Locale.ROOT).replace(".", ""));
    }

    @Override
    public ConversionResult convertVideo(UUID jobId, File inputFile, File outputFile, String targetFormat, ConversionOptions options, Consumer<ConversionProgress> progressConsumer) throws Exception {
        String format = targetFormat.toLowerCase(Locale.ROOT).replace(".", "");
        if (!supportsFormat(format)) {
            throw new IllegalArgumentException("Unsupported target video format: " + targetFormat);
        }

        MediaProbeResult probeResult = probeService.probe(inputFile);
        double duration = probeResult.getDurationSeconds();

        List<String> args = new ArrayList<>();
        args.add("-i");
        args.add(inputFile.getAbsolutePath());

        // 1. Video Codec Selection
        String vCodec = resolveVideoCodec(format, options != null ? options.getVideoCodec() : null);
        args.add("-c:v");
        args.add(vCodec);

        // 2. Preset
        String preset = resolvePreset(options != null ? options.getQualityPreset() : null);
        if (!"avi".equalsIgnoreCase(format)) {
            args.add("-preset");
            args.add(preset);
        }

        // 3. Pixel Format for universal playback
        args.add("-pix_fmt");
        args.add("yuv420p");

        // 4. Resolution scaling & Aspect Ratio Preservation (without upscaling)
        String scaleFilter = buildScaleFilter(probeResult, options != null ? options.getTargetResolution() : null);
        if (scaleFilter != null) {
            args.add("-vf");
            args.add(scaleFilter);
        }

        // 5. Video Bitrate
        if (options != null && options.getVideoBitrate() != null && !options.getVideoBitrate().isBlank() && !"auto".equalsIgnoreCase(options.getVideoBitrate())) {
            String vBitrate = options.getVideoBitrate().trim();
            if (!vBitrate.toLowerCase().endsWith("k") && !vBitrate.toLowerCase().endsWith("m")) {
                vBitrate += "k";
            }
            args.add("-b:v");
            args.add(vBitrate);
        }

        // 6. Frame Rate
        if (options != null && options.getFrameRate() != null && options.getFrameRate() > 0) {
            args.add("-r");
            args.add(String.valueOf(options.getFrameRate()));
        }

        // 7. Audio Handling
        if (options != null && Boolean.TRUE.equals(options.getRemoveAudio())) {
            args.add("-an");
        } else if (probeResult.hasAudio()) {
            String aCodec = resolveAudioCodec(format, options != null ? options.getAudioCodec() : null);
            args.add("-c:a");
            args.add(aCodec);

            if (options != null && options.getAudioBitrate() != null && options.getAudioBitrate() > 0) {
                args.add("-b:a");
                args.add(options.getAudioBitrate() + "k");
            } else if ("webm".equalsIgnoreCase(format)) {
                args.add("-b:a");
                args.add("128k");
            } else {
                args.add("-b:a");
                args.add("192k");
            }
        } else {
            args.add("-an");
        }

        // 8. Web optimizations
        if ("mp4".equalsIgnoreCase(format) || "mov".equalsIgnoreCase(format)) {
            args.add("-movflags");
            args.add("+faststart");
        }

        // Output destination
        args.add(outputFile.getAbsolutePath());

        // Execute conversion
        ffmpegExecutor.execute(jobId, args, duration, progressConsumer);

        long fileSize = Files.size(outputFile.toPath());
        String mimeType = getMimeType(format);

        log.info("Video conversion finished for job {}: format={}, size={} bytes", jobId, format, fileSize);
        return ConversionResult.success(outputFile, format, duration, fileSize, mimeType);
    }

    private String resolveVideoCodec(String format, String requestedCodec) {
        if (requestedCodec != null && !requestedCodec.isBlank() && !"auto".equalsIgnoreCase(requestedCodec)) {
            return requestedCodec;
        }

        switch (format) {
            case "webm":
                return "libvpx-vp9";
            case "avi":
                return "msmpeg4v2";
            case "mov":
            case "mkv":
            case "mp4":
            default:
                return "libx264";
        }
    }

    private String resolveAudioCodec(String format, String requestedCodec) {
        if (requestedCodec != null && !requestedCodec.isBlank() && !"auto".equalsIgnoreCase(requestedCodec)) {
            return requestedCodec;
        }

        switch (format) {
            case "webm":
                return "libopus";
            case "avi":
                return "libmp3lame";
            case "mov":
            case "mkv":
            case "mp4":
            default:
                return "aac";
        }
    }

    private String resolvePreset(String preset) {
        if (preset == null || preset.isBlank() || "auto".equalsIgnoreCase(preset)) {
            return "fast";
        }
        String p = preset.toLowerCase(Locale.ROOT);
        Set<String> valid = Set.of("ultrafast", "superfast", "veryfast", "faster", "fast", "medium", "slow", "slower", "veryslow");
        return valid.contains(p) ? p : "fast";
    }

    private String buildScaleFilter(MediaProbeResult probe, String targetResolution) {
        if (targetResolution == null || targetResolution.isBlank() || "source".equalsIgnoreCase(targetResolution) || "original".equalsIgnoreCase(targetResolution)) {
            return null;
        }

        int targetHeight;
        switch (targetResolution.toLowerCase(Locale.ROOT)) {
            case "1080p": targetHeight = 1080; break;
            case "720p": targetHeight = 720; break;
            case "480p": targetHeight = 480; break;
            case "360p": targetHeight = 360; break;
            case "240p": targetHeight = 240; break;
            default: return null;
        }

        // Avoid upscaling: if input height is already smaller than target, keep input height
        int inputHeight = probe.getHeight();
        if (inputHeight > 0 && inputHeight <= targetHeight) {
            log.info("Source height ({}p) is <= target ({}p). Preserving source resolution to prevent upscaling.", inputHeight, targetHeight);
            return null;
        }

        // -2 ensures width is an even number (divisible by 2) for H.264 / H.265 / VP9
        return "scale=-2:" + targetHeight;
    }

    private String getMimeType(String format) {
        switch (format) {
            case "mp4": return "video/mp4";
            case "webm": return "video/webm";
            case "mkv": return "video/x-matroska";
            case "mov": return "video/quicktime";
            case "avi": return "video/x-msvideo";
            default: return "video/" + format;
        }
    }
}
