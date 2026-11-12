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

        double duration = probeResult.getDurationSeconds();

        List<String> args = new ArrayList<>();
        args.add("-i");
        args.add(inputFile.getAbsolutePath());

        // 1. Strip video stream completely
        args.add("-vn");

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

        // 5. Audio Channels
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
        ffmpegExecutor.execute(jobId, args, duration, progressConsumer);

        long fileSize = Files.size(outputFile.toPath());
        String mimeType = getMimeType(format);

        log.info("Audio conversion finished for job {}: format={}, size={} bytes", jobId, format, fileSize);
        return ConversionResult.success(outputFile, format, duration, fileSize, mimeType);
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
