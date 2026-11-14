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
public class AudioConversionServiceImpl implements AudioConversionService {

    private static final Logger log = LoggerFactory.getLogger(AudioConversionServiceImpl.class);

    private static final Set<String> SUPPORTED_FORMATS = Set.of("mp3", "wav", "aac", "flac", "m4a", "ogg");

    private final FFmpegProcessExecutor ffmpegExecutor;
    private final MediaProbeService probeService;

    public AudioConversionServiceImpl(FFmpegProcessExecutor ffmpegExecutor, MediaProbeService probeService) {
        this.ffmpegExecutor = ffmpegExecutor;
        this.probeService = probeService;
    }

    @Override
    public boolean supportsFormat(String targetFormat) {
        if (targetFormat == null) return false;
        return SUPPORTED_FORMATS.contains(targetFormat.toLowerCase(Locale.ROOT).replace(".", ""));
    }

    @Override
    public ConversionResult convertAudio(UUID jobId, File inputFile, File outputFile, String targetFormat, ConversionOptions options, Consumer<ConversionProgress> progressConsumer) throws Exception {
        String format = targetFormat.toLowerCase(Locale.ROOT).replace(".", "");
        if (!supportsFormat(format)) {
            throw new IllegalArgumentException("Unsupported target audio format: " + targetFormat);
        }

        MediaProbeResult probeResult = probeService.probe(inputFile);
        if (!probeResult.hasAudio()) {
            throw new IllegalArgumentException("Source file does not contain an audio stream to convert");
        }

        double sourceDuration = probeResult.getDurationSeconds();

        // 1. Validate Trimming & Cutting
        validateTrimming(options, sourceDuration);
        validateCutting(options, sourceDuration);

        double effectiveDuration = options != null ? options.calculateEffectiveDuration(sourceDuration) : sourceDuration;
        if (effectiveDuration <= 0.05) {
            throw new IllegalArgumentException("Effective audio duration after trimming/cutting is too short (< 0.1s)");
        }

        List<String> args = new ArrayList<>();
        args.add("-i");
        args.add(inputFile.getAbsolutePath());

        // Strip any video stream
        args.add("-vn");

        boolean hasCut = options != null && options.hasCut();
        boolean hasTrim = options != null && options.hasTrim();

        List<TimeRange> keptSegments = calculateKeptSegments(options, sourceDuration);

        if (!keptSegments.isEmpty() && (hasCut || keptSegments.size() > 1)) {
            // Build filter_complex with atrim + concat + audio filters
            buildAudioFilterComplex(args, keptSegments, options, effectiveDuration);
        } else {
            if (!keptSegments.isEmpty() && hasTrim) {
                TimeRange single = keptSegments.get(0);
                args.add("-ss");
                args.add(String.format(Locale.ROOT, "%.3f", single.getStart()));
                args.add("-to");
                args.add(String.format(Locale.ROOT, "%.3f", single.getEnd()));
            }

            // Audio Filters (volume, silence removal, fade)
            List<String> audioFilters = buildAudioFilters(options, effectiveDuration);
            if (!audioFilters.isEmpty()) {
                args.add("-af");
                args.add(String.join(",", audioFilters));
            }
        }

        // 2. Select Audio Codec
        String aCodec = resolveAudioCodec(format, options != null ? options.getAudioCodec() : null);
        args.add("-c:a");
        args.add(aCodec);

        // 3. Audio Bitrate (for lossy formats)
        if (!"wav".equalsIgnoreCase(format) && !"flac".equalsIgnoreCase(format)) {
            if (options != null && options.getAudioBitrate() != null && options.getAudioBitrate() > 0) {
                args.add("-b:a");
                args.add(options.getAudioBitrate() + "k");
            } else {
                args.add("-b:a");
                args.add("192k");
            }
        }

        // 4. Sample Rate
        if (options != null && options.getSampleRate() != null && options.getSampleRate() > 0) {
            args.add("-ar");
            args.add(String.valueOf(options.getSampleRate()));
        }

        // 5. Audio Channels (Mono / Stereo)
        if (options != null && options.getAudioChannels() != null && options.getAudioChannels() > 0) {
            args.add("-ac");
            args.add(String.valueOf(options.getAudioChannels()));
        }

        // 6. Metadata handling
        if (options != null && Boolean.FALSE.equals(options.getStripMetadata())) {
            args.add("-map_metadata");
            args.add("0");
        }

        // Output file
        args.add(outputFile.getAbsolutePath());

        // Execute conversion
        ffmpegExecutor.execute(jobId, args, effectiveDuration, progressConsumer);

        long fileSize = Files.size(outputFile.toPath());
        String mimeType = getMimeType(format);

        log.info("Audio conversion finished for job {}: format={}, effectiveDuration={}s, size={} bytes",
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

    private void buildAudioFilterComplex(List<String> args, List<TimeRange> segments, ConversionOptions options, double effectiveDuration) {
        StringBuilder fc = new StringBuilder();
        int n = segments.size();

        for (int i = 0; i < n; i++) {
            TimeRange seg = segments.get(i);
            fc.append(String.format(Locale.ROOT, "[0:a]atrim=start=%.3f:end=%.3f,asetpts=PTS-STARTPTS[a%d];", seg.getStart(), seg.getEnd(), i));
        }

        for (int i = 0; i < n; i++) {
            fc.append("[a").append(i).append("]");
        }

        fc.append(String.format(Locale.ROOT, "concat=n=%d:v=0:a=1[acat];", n));

        List<String> aFilters = buildAudioFilters(options, effectiveDuration);
        if (!aFilters.isEmpty()) {
            fc.append("[acat]").append(String.join(",", aFilters)).append("[aout]");
        }

        String filterGraph = fc.toString();
        if (filterGraph.endsWith(";")) {
            filterGraph = filterGraph.substring(0, filterGraph.length() - 1);
        }

        args.add("-filter_complex");
        args.add(filterGraph);

        args.add("-map");
        if (!aFilters.isEmpty()) {
            args.add("[aout]");
        } else {
            args.add("[acat]");
        }
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

    private String resolveAudioCodec(String format, String requestedCodec) {
        if (requestedCodec != null && !requestedCodec.isBlank() && !"auto".equalsIgnoreCase(requestedCodec)) {
            String clean = requestedCodec.trim().toLowerCase(Locale.ROOT);
            if (clean.matches("^[a-zA-Z0-9_-]{1,32}$")) {
                return clean;
            }
        }

        switch (format) {
            case "mp3":
                return "libmp3lame";
            case "wav":
                return "pcm_s16le";
            case "flac":
                return "flac";
            case "ogg":
                return "libvorbis";
            case "m4a":
            case "aac":
            default:
                return "aac";
        }
    }

    private String getMimeType(String format) {
        switch (format) {
            case "mp3": return "audio/mpeg";
            case "wav": return "audio/wav";
            case "aac": return "audio/aac";
            case "flac": return "audio/flac";
            case "m4a": return "audio/mp4";
            case "ogg": return "audio/ogg";
            default: return "audio/" + format;
        }
    }
}
