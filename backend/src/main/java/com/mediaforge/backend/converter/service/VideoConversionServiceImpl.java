package com.mediaforge.backend.converter.service;

import com.mediaforge.backend.converter.model.ConversionOptions;
import com.mediaforge.backend.converter.model.ConversionProgress;
import com.mediaforge.backend.converter.model.ConversionResult;
import com.mediaforge.backend.converter.model.MediaProbeResult;
import com.mediaforge.backend.converter.model.TimeRange;
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
        double sourceDuration = probeResult.getDurationSeconds();
        int inputWidth = probeResult.getWidth();
        int inputHeight = probeResult.getHeight();
        boolean hasAudio = probeResult.hasAudio();

        // 1. Validate Trimming
        validateTrimming(options, sourceDuration);

        // 2. Validate Cutting
        validateCutting(options, sourceDuration);

        // 3. Validate Cropping
        validateCropping(options, inputWidth, inputHeight);

        // Calculate effective output duration
        double effectiveDuration = options != null ? options.calculateEffectiveDuration(sourceDuration) : sourceDuration;
        if (effectiveDuration <= 0.05) {
            throw new IllegalArgumentException("Effective video duration after trimming/cutting is too short (< 0.1s)");
        }

        List<String> args = new ArrayList<>();
        args.add("-i");
        args.add(inputFile.getAbsolutePath());

        // Determine if we need filter_complex (cutting multiple segments or trimming + filters)
        boolean hasCut = options != null && options.hasCut();
        boolean hasTrim = options != null && options.hasTrim();
        boolean removeAudio = options != null && Boolean.TRUE.equals(options.getRemoveAudio());
        boolean includeAudio = hasAudio && !removeAudio;

        List<TimeRange> keptSegments = calculateKeptSegments(options, sourceDuration);

        if (!keptSegments.isEmpty() && (hasCut || keptSegments.size() > 1)) {
            // Build filter_complex with segment trims + concat
            buildFilterComplexWithSegments(args, keptSegments, includeAudio, options, probeResult, format);
        } else {
            // Single segment or full duration
            if (!keptSegments.isEmpty() && hasTrim) {
                TimeRange single = keptSegments.get(0);
                args.add("-ss");
                args.add(String.format(Locale.ROOT, "%.3f", single.getStart()));
                args.add("-to");
                args.add(String.format(Locale.ROOT, "%.3f", single.getEnd()));
            }

            // Video Filters (Crop & Scale)
            List<String> videoFilters = buildVideoFilters(probeResult, options);
            if (!videoFilters.isEmpty()) {
                args.add("-vf");
                args.add(String.join(",", videoFilters));
            }

            // Audio Filters (Volume, Silence removal, Fades)
            if (includeAudio) {
                List<String> audioFilters = buildAudioFilters(options, effectiveDuration);
                if (!audioFilters.isEmpty()) {
                    args.add("-af");
                    args.add(String.join(",", audioFilters));
                }
            }
        }

        // Codec selection
        String vCodec = resolveVideoCodec(format, options != null ? options.getVideoCodec() : null);
        args.add("-c:v");
        args.add(vCodec);

        // Preset
        String preset = resolvePreset(options != null ? options.getQualityPreset() : null);
        if (!"avi".equalsIgnoreCase(format)) {
            args.add("-preset");
            args.add(preset);
        }

        // Universal pixel format
        args.add("-pix_fmt");
        args.add("yuv420p");

        // Quality: CRF
        if (options != null && options.getCrf() != null && options.getCrf() >= 0 && options.getCrf() <= 51) {
            args.add("-crf");
            args.add(String.valueOf(options.getCrf()));
        }

        // Video Bitrate
        if (options != null && options.getVideoBitrate() != null && !options.getVideoBitrate().isBlank() && !"auto".equalsIgnoreCase(options.getVideoBitrate())) {
            String vBitrate = options.getVideoBitrate().trim().toLowerCase(Locale.ROOT);
            if (!vBitrate.endsWith("k") && !vBitrate.endsWith("m")) {
                vBitrate += "k";
            }
            args.add("-b:v");
            args.add(vBitrate);
        }

        // Frame rate
        if (options != null && options.getFrameRate() != null && options.getFrameRate() > 0) {
            args.add("-r");
            args.add(String.valueOf(options.getFrameRate()));
        }

        // Audio Handling
        if (!includeAudio) {
            args.add("-an");
        } else {
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

            if (options != null && options.getSampleRate() != null && options.getSampleRate() > 0) {
                args.add("-ar");
                args.add(String.valueOf(options.getSampleRate()));
            }

            if (options != null && options.getAudioChannels() != null && options.getAudioChannels() > 0) {
                args.add("-ac");
                args.add(String.valueOf(options.getAudioChannels()));
            }
        }

        // Web optimizations
        if ("mp4".equalsIgnoreCase(format) || "mov".equalsIgnoreCase(format)) {
            args.add("-movflags");
            args.add("+faststart");
        }

        // Output destination
        args.add(outputFile.getAbsolutePath());

        // Execute conversion
        ffmpegExecutor.execute(jobId, args, effectiveDuration, progressConsumer);

        long fileSize = Files.size(outputFile.toPath());
        String mimeType = getMimeType(format);

        log.info("Video conversion finished for job {}: format={}, effectiveDuration={}s, size={} bytes",
                jobId, format, effectiveDuration, fileSize);
        return ConversionResult.success(outputFile, format, effectiveDuration, fileSize, mimeType);
    }

    private void validateTrimming(ConversionOptions options, double sourceDuration) {
        if (options == null) return;
        Double start = options.getStartTime();
        Double end = options.getEndTime();

        if (start != null) {
            if (start < 0) {
                throw new IllegalArgumentException("Trim start time cannot be negative: " + start);
            }
            if (sourceDuration > 0 && start >= sourceDuration) {
                throw new IllegalArgumentException("Trim start time (" + start + "s) exceeds source duration (" + sourceDuration + "s)");
            }
        }

        if (end != null) {
            if (end <= 0) {
                throw new IllegalArgumentException("Trim end time must be greater than zero: " + end);
            }
            if (sourceDuration > 0 && end > sourceDuration + 1.0) {
                throw new IllegalArgumentException("Trim end time (" + end + "s) exceeds source duration (" + sourceDuration + "s)");
            }
        }

        if (start != null && end != null && start >= end) {
            throw new IllegalArgumentException("Trim start time (" + start + "s) must be strictly less than end time (" + end + "s)");
        }
    }

    private void validateCutting(ConversionOptions options, double sourceDuration) {
        if (options == null || options.getRemoveSegments() == null) return;

        for (TimeRange seg : options.getRemoveSegments()) {
            if (seg.getStart() == null || seg.getEnd() == null) {
                throw new IllegalArgumentException("Cut removal segment must specify both start and end time");
            }
            if (seg.getStart() < 0) {
                throw new IllegalArgumentException("Cut segment start time cannot be negative: " + seg.getStart());
            }
            if (seg.getEnd() <= seg.getStart()) {
                throw new IllegalArgumentException("Cut segment end time (" + seg.getEnd() + "s) must be greater than start (" + seg.getStart() + "s)");
            }
            if (sourceDuration > 0 && seg.getStart() >= sourceDuration) {
                throw new IllegalArgumentException("Cut segment starts after source end: " + seg.getStart() + "s >= " + sourceDuration + "s");
            }
        }
    }

    private void validateCropping(ConversionOptions options, int inputWidth, int inputHeight) {
        if (options == null || !options.hasCrop()) return;

        int cropX = options.getCropX() != null ? options.getCropX() : 0;
        int cropY = options.getCropY() != null ? options.getCropY() : 0;
        int cropW = options.getCropWidth();
        int cropH = options.getCropHeight();

        if (cropX < 0 || cropY < 0) {
            throw new IllegalArgumentException("Crop coordinates (x=" + cropX + ", y=" + cropY + ") cannot be negative");
        }
        if (cropW < 2 || cropH < 2) {
            throw new IllegalArgumentException("Crop dimensions (w=" + cropW + ", h=" + cropH + ") must be at least 2 pixels");
        }
        if (inputWidth > 0 && (cropX + cropW > inputWidth)) {
            throw new IllegalArgumentException("Crop area exceeds source width: " + (cropX + cropW) + " > " + inputWidth);
        }
        if (inputHeight > 0 && (cropY + cropH > inputHeight)) {
            throw new IllegalArgumentException("Crop area exceeds source height: " + (cropY + cropH) + " > " + inputHeight);
        }
    }

    private List<TimeRange> calculateKeptSegments(ConversionOptions options, double sourceDuration) {
        if (options == null) return Collections.emptyList();

        double totalDuration = sourceDuration > 0 ? sourceDuration : 3600.0;
        double rangeStart = options.getStartTime() != null ? Math.max(0.0, options.getStartTime()) : 0.0;
        double rangeEnd = options.getEndTime() != null ? Math.min(totalDuration, options.getEndTime()) : totalDuration;

        if (!options.hasCut()) {
            if (options.hasTrim()) {
                return List.of(new TimeRange(rangeStart, rangeEnd));
            }
            return Collections.emptyList();
        }

        // Sort removal segments
        List<TimeRange> sortedRemovals = new ArrayList<>(options.getRemoveSegments());
        sortedRemovals.sort(Comparator.comparingDouble(TimeRange::getStart));

        List<TimeRange> kept = new ArrayList<>();
        double current = rangeStart;

        for (TimeRange rem : sortedRemovals) {
            double remStart = Math.max(rangeStart, rem.getStart());
            double remEnd = Math.min(rangeEnd, rem.getEnd());

            if (remStart > current) {
                kept.add(new TimeRange(current, remStart));
            }
            current = Math.max(current, remEnd);
        }

        if (current < rangeEnd) {
            kept.add(new TimeRange(current, rangeEnd));
        }

        return kept;
    }

    private void buildFilterComplexWithSegments(List<String> args, List<TimeRange> segments, boolean includeAudio,
                                                ConversionOptions options, MediaProbeResult probeResult, String format) {
        StringBuilder fc = new StringBuilder();
        int n = segments.size();

        for (int i = 0; i < n; i++) {
            TimeRange seg = segments.get(i);
            fc.append(String.format(Locale.ROOT, "[0:v]trim=start=%.3f:end=%.3f,setpts=PTS-STARTPTS[v%d];", seg.getStart(), seg.getEnd(), i));
            if (includeAudio) {
                fc.append(String.format(Locale.ROOT, "[0:a]atrim=start=%.3f:end=%.3f,asetpts=PTS-STARTPTS[a%d];", seg.getStart(), seg.getEnd(), i));
            }
        }

        for (int i = 0; i < n; i++) {
            fc.append("[v").append(i).append("]");
            if (includeAudio) {
                fc.append("[a").append(i).append("]");
            }
        }

        fc.append(String.format(Locale.ROOT, "concat=n=%d:v=1:a=%d[vcat]", n, includeAudio ? 1 : 0));
        if (includeAudio) {
            fc.append("[acat]");
        }
        fc.append(";");

        // Chain video filters
        List<String> vFilters = buildVideoFilters(probeResult, options);
        if (!vFilters.isEmpty()) {
            fc.append("[vcat]").append(String.join(",", vFilters)).append("[vout];");
        }

        // Chain audio filters
        double effectiveDuration = options.calculateEffectiveDuration(probeResult.getDurationSeconds());
        List<String> aFilters = includeAudio ? buildAudioFilters(options, effectiveDuration) : Collections.emptyList();
        if (!aFilters.isEmpty()) {
            fc.append("[acat]").append(String.join(",", aFilters)).append("[aout]");
        }

        String filterGraph = fc.toString();
        if (filterGraph.endsWith(";")) {
            filterGraph = filterGraph.substring(0, filterGraph.length() - 1);
        }

        args.add("-filter_complex");
        args.add(filterGraph);

        // Map output streams
        if (!vFilters.isEmpty()) {
            args.add("-map");
            args.add("[vout]");
        } else {
            args.add("-map");
            args.add("[vcat]");
        }

        if (includeAudio) {
            if (!aFilters.isEmpty()) {
                args.add("-map");
                args.add("[aout]");
            } else {
                args.add("-map");
                args.add("[acat]");
            }
        }
    }

    private List<String> buildVideoFilters(MediaProbeResult probe, ConversionOptions options) {
        List<String> filters = new ArrayList<>();
        if (options == null) return filters;

        // 1. Crop
        if (options.hasCrop()) {
            int cropX = options.getCropX() != null ? options.getCropX() : 0;
            int cropY = options.getCropY() != null ? options.getCropY() : 0;
            int cropW = options.getCropWidth() - (options.getCropWidth() % 2);
            int cropH = options.getCropHeight() - (options.getCropHeight() % 2);
            filters.add(String.format(Locale.ROOT, "crop=%d:%d:%d:%d", cropW, cropH, cropX, cropY));
        }

        // 2. Resolution Scaling & Upscaling Prevention
        String scaleFilter = buildScaleFilter(probe, options.getTargetResolution(), options.hasCrop() ? options.getCropHeight() : null);
        if (scaleFilter != null) {
            filters.add(scaleFilter);
        }

        return filters;
    }

    private List<String> buildAudioFilters(ConversionOptions options, double effectiveDuration) {
        List<String> filters = new ArrayList<>();
        if (options == null) return filters;

        // 1. Volume adjustment
        if (options.getVolume() != null && options.getVolume() > 0.0 && Math.abs(options.getVolume() - 1.0) > 0.01) {
            filters.add(String.format(Locale.ROOT, "volume=%.2f", options.getVolume()));
        }

        // 2. Silence removal
        if (Boolean.TRUE.equals(options.getRemoveSilence())) {
            filters.add("silenceremove=start_periods=1:stop_periods=1:stop_duration=1:stop_threshold=-50dB");
        }

        // 3. Fade in
        if (options.getFadeInDuration() != null && options.getFadeInDuration() > 0.0) {
            filters.add(String.format(Locale.ROOT, "afade=t=in:ss=0:d=%.2f", options.getFadeInDuration()));
        }

        // 4. Fade out
        if (options.getFadeOutDuration() != null && options.getFadeOutDuration() > 0.0) {
            double fadeStart = Math.max(0.0, effectiveDuration - options.getFadeOutDuration());
            filters.add(String.format(Locale.ROOT, "afade=t=out:st=%.2f:d=%.2f", fadeStart, options.getFadeOutDuration()));
        }

        return filters;
    }

    private String buildScaleFilter(MediaProbeResult probe, String targetResolution, Integer activeHeight) {
        if (targetResolution == null || targetResolution.isBlank() || "source".equalsIgnoreCase(targetResolution) || "original".equalsIgnoreCase(targetResolution)) {
            return null;
        }

        int targetHeight;
        switch (targetResolution.toLowerCase(Locale.ROOT)) {
            case "2160p":
            case "4k":
                targetHeight = 2160;
                break;
            case "1440p":
            case "2k":
                targetHeight = 1440;
                break;
            case "1080p":
                targetHeight = 1080;
                break;
            case "720p":
                targetHeight = 720;
                break;
            case "480p":
                targetHeight = 480;
                break;
            case "360p":
                targetHeight = 360;
                break;
            case "240p":
                targetHeight = 240;
                break;
            default:
                return null;
        }

        int currentHeight = (activeHeight != null && activeHeight > 0) ? activeHeight : probe.getHeight();
        if (currentHeight > 0 && currentHeight <= targetHeight) {
            log.info("Source height ({}p) is <= target resolution ({}p). Preserving source resolution to prevent upscaling.", currentHeight, targetHeight);
            return null;
        }

        // -2 ensures width is an even number (divisible by 2)
        return "scale=-2:" + targetHeight;
    }

    private String resolveVideoCodec(String format, String requestedCodec) {
        if (requestedCodec != null && !requestedCodec.isBlank() && !"auto".equalsIgnoreCase(requestedCodec)) {
            String clean = requestedCodec.trim().toLowerCase(Locale.ROOT);
            if (clean.matches("^[a-zA-Z0-9_-]{1,32}$")) {
                return clean;
            }
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
            String clean = requestedCodec.trim().toLowerCase(Locale.ROOT);
            if (clean.matches("^[a-zA-Z0-9_-]{1,32}$")) {
                return clean;
            }
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
