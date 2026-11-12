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
public class ImageConversionServiceImpl implements ImageConversionService {

    private static final Logger log = LoggerFactory.getLogger(ImageConversionServiceImpl.class);

    private static final Set<String> SUPPORTED_FORMATS = Set.of("jpg", "jpeg", "png", "webp", "avif", "bmp", "gif");

    // Decompression bomb thresholds
    private static final int MAX_DIMENSION = 16384;
    private static final long MAX_PIXELS = 100_000_000L; // 100 MegaPixels

    private final FFmpegProcessExecutor ffmpegExecutor;
    private final MediaProbeService probeService;

    public ImageConversionServiceImpl(FFmpegProcessExecutor ffmpegExecutor, MediaProbeService probeService) {
        this.ffmpegExecutor = ffmpegExecutor;
        this.probeService = probeService;
    }

    @Override
    public boolean supportsFormat(String targetFormat) {
        if (targetFormat == null) return false;
        return SUPPORTED_FORMATS.contains(targetFormat.toLowerCase(Locale.ROOT).replace(".", ""));
    }

    @Override
    public ConversionResult convertImage(UUID jobId, File inputFile, File outputFile, String targetFormat, ConversionOptions options, Consumer<ConversionProgress> progressConsumer) throws Exception {
        String format = targetFormat.toLowerCase(Locale.ROOT).replace(".", "");
        if (!supportsFormat(format)) {
            throw new IllegalArgumentException("Unsupported target image format: " + targetFormat);
        }

        MediaProbeResult probeResult = probeService.probe(inputFile);

        // Decompression bomb check
        int inWidth = probeResult.getWidth();
        int inHeight = probeResult.getHeight();
        if (inWidth > MAX_DIMENSION || inHeight > MAX_DIMENSION || ((long) inWidth * inHeight) > MAX_PIXELS) {
            throw new SecurityException(String.format("Image dimensions (%dx%d) exceed safe decompression threshold", inWidth, inHeight));
        }

        List<String> args = new ArrayList<>();
        args.add("-i");
        args.add(inputFile.getAbsolutePath());

        // Build filter graph
        List<String> filters = new ArrayList<>();

        // Rotation
        if (options != null && options.getImageRotation() != null) {
            int rot = options.getImageRotation() % 360;
            if (rot == 90) {
                filters.add("transpose=1");
            } else if (rot == 180) {
                filters.add("transpose=1,transpose=1");
            } else if (rot == 270) {
                filters.add("transpose=2");
            }
        }

        // Resize with aspect ratio preservation
        if (options != null && (options.getImageWidth() != null || options.getImageHeight() != null)) {
            Integer targetW = options.getImageWidth();
            Integer targetH = options.getImageHeight();
            if (targetW != null && targetH != null) {
                filters.add(String.format("scale='min(%d,iw)':-1", targetW));
            } else if (targetW != null) {
                filters.add(String.format("scale='min(%d,iw)':-1", targetW));
            } else {
                filters.add(String.format("scale=-1:'min(%d,ih)'", targetH));
            }
        }

        // Target is JPEG -> flatten transparency onto white background
        if ("jpg".equalsIgnoreCase(format) || "jpeg".equalsIgnoreCase(format)) {
            // Apply background or pixel format for JPEG
            args.add("-pix_fmt");
            args.add("yuvj420p");
        }

        if (!filters.isEmpty()) {
            args.add("-vf");
            args.add(String.join(",", filters));
        }

        // Strip metadata for privacy
        if (options == null || Boolean.TRUE.equals(options.getStripMetadata())) {
            args.add("-map_metadata");
            args.add("-1");
        }

        // Quality and compression parameters
        if ("webp".equalsIgnoreCase(format)) {
            int q = (options != null && options.getImageQuality() != null) ? options.getImageQuality() : 85;
            args.add("-quality");
            args.add(String.valueOf(q));
        } else if ("jpg".equalsIgnoreCase(format) || "jpeg".equalsIgnoreCase(format)) {
            int q = (options != null && options.getImageQuality() != null) ? options.getImageQuality() : 85;
            // FFmpeg JPEG scale: 2 (high) to 31 (low)
            int qscale = Math.max(2, Math.min(31, (int) Math.round(31 - (q * 0.29))));
            args.add("-q:v");
            args.add(String.valueOf(qscale));
        } else if ("png".equalsIgnoreCase(format)) {
            args.add("-compression_level");
            args.add("6");
        }

        // Output destination
        args.add(outputFile.getAbsolutePath());

        // Execute conversion
        ffmpegExecutor.execute(jobId, args, 1.0, progressConsumer);

        long fileSize = Files.size(outputFile.toPath());
        String mimeType = getMimeType(format);

        log.info("Image conversion finished for job {}: format={}, size={} bytes", jobId, format, fileSize);
        return ConversionResult.success(outputFile, format, 0.0, fileSize, mimeType);
    }

    private String getMimeType(String format) {
        switch (format) {
            case "jpg":
            case "jpeg": return "image/jpeg";
            case "png": return "image/png";
            case "webp": return "image/webp";
            case "avif": return "image/avif";
            case "gif": return "image/gif";
            case "bmp": return "image/bmp";
            default: return "image/" + format;
        }
    }
}
