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

        int inWidth = probeResult.getWidth();
        int inHeight = probeResult.getHeight();

        // Decompression bomb check
        if (inWidth > MAX_DIMENSION || inHeight > MAX_DIMENSION || ((long) inWidth * inHeight) > MAX_PIXELS) {
            throw new SecurityException(String.format(Locale.ROOT, "Image dimensions (%dx%d) exceed safe decompression threshold", inWidth, inHeight));
        }

        // Validate Cropping
        validateCropping(options, inWidth, inHeight);

        List<String> args = new ArrayList<>();
        args.add("-i");
        args.add(inputFile.getAbsolutePath());

        // Build filter graph
        List<String> filters = new ArrayList<>();

        // 1. Crop
        if (options != null && options.hasCrop()) {
            int cropX = options.getCropX() != null ? options.getCropX() : 0;
            int cropY = options.getCropY() != null ? options.getCropY() : 0;
            int cropW = options.getCropWidth();
            int cropH = options.getCropHeight();
            filters.add(String.format(Locale.ROOT, "crop=%d:%d:%d:%d", cropW, cropH, cropX, cropY));
        }

        // 2. Rotation
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

        // 3. Flips
        if (options != null && Boolean.TRUE.equals(options.getFlipHorizontal())) {
            filters.add("hflip");
        }
        if (options != null && Boolean.TRUE.equals(options.getFlipVertical())) {
            filters.add("vflip");
        }

        // 4. Brightness & Contrast
        if (options != null && (options.getBrightness() != null || options.getContrast() != null)) {
            double b = options.getBrightness() != null ? Math.max(-1.0, Math.min(1.0, options.getBrightness())) : 0.0;
            double c = options.getContrast() != null ? Math.max(0.0, Math.min(2.0, options.getContrast())) : 1.0;
            filters.add(String.format(Locale.ROOT, "eq=brightness=%.2f:contrast=%.2f", b, c));
        }

        // 5. Resize
        if (options != null && (options.getImageWidth() != null || options.getImageHeight() != null)) {
            Integer targetW = options.getImageWidth();
            Integer targetH = options.getImageHeight();
            boolean keepAspect = !Boolean.FALSE.equals(options.getPreserveAspectRatio());

            if (keepAspect) {
                if (targetW != null && targetH != null) {
                    filters.add(String.format(Locale.ROOT, "scale='min(%d,iw)':-1", targetW));
                } else if (targetW != null) {
                    filters.add(String.format(Locale.ROOT, "scale='min(%d,iw)':-1", targetW));
                } else {
                    filters.add(String.format(Locale.ROOT, "scale=-1:'min(%d,ih)'", targetH));
                }
            } else {
                int w = targetW != null ? targetW : inWidth;
                int h = targetH != null ? targetH : inHeight;
                filters.add(String.format(Locale.ROOT, "scale=%d:%d", w, h));
            }
        }

        // Target is JPEG -> flatten transparency onto white background
        if ("jpg".equalsIgnoreCase(format) || "jpeg".equalsIgnoreCase(format)) {
            args.add("-pix_fmt");
            args.add("yuvj420p");
        }

        if (!filters.isEmpty()) {
            args.add("-vf");
            args.add(String.join(",", filters));
        }

        // Strip metadata for privacy if requested
        if (options == null || Boolean.TRUE.equals(options.getStripMetadata())) {
            args.add("-map_metadata");
            args.add("-1");
        }

        // Quality and compression parameters
        int quality = (options != null && options.getImageQuality() != null) ? options.getImageQuality() : 85;

        if ("webp".equalsIgnoreCase(format)) {
            args.add("-quality");
            args.add(String.valueOf(quality));
        } else if ("jpg".equalsIgnoreCase(format) || "jpeg".equalsIgnoreCase(format)) {
            // FFmpeg JPEG scale: 2 (high) to 31 (low)
            int qscale = Math.max(2, Math.min(31, (int) Math.round(31 - (quality * 0.29))));
            args.add("-q:v");
            args.add(String.valueOf(qscale));
        } else if ("png".equalsIgnoreCase(format)) {
            args.add("-compression_level");
            args.add("6");
        } else if ("avif".equalsIgnoreCase(format)) {
            int crf = Math.max(10, Math.min(50, (int) Math.round(50 - (quality * 0.4))));
            args.add("-crf");
            args.add(String.valueOf(crf));
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

    private void validateCropping(ConversionOptions options, int inWidth, int inHeight) {
        if (options == null || !options.hasCrop()) return;

        int cropX = options.getCropX() != null ? options.getCropX() : 0;
        int cropY = options.getCropY() != null ? options.getCropY() : 0;
        int cropW = options.getCropWidth();
        int cropH = options.getCropHeight();

        if (cropX < 0 || cropY < 0) {
            throw new IllegalArgumentException("Crop coordinates cannot be negative: x=" + cropX + ", y=" + cropY);
        }
        if (cropW < 2 || cropH < 2) {
            throw new IllegalArgumentException("Crop dimensions must be at least 2 pixels: w=" + cropW + ", h=" + cropH);
        }
        if (inWidth > 0 && (cropX + cropW > inWidth)) {
            throw new IllegalArgumentException("Crop area exceeds image width: " + (cropX + cropW) + " > " + inWidth);
        }
        if (inHeight > 0 && (cropY + cropH > inHeight)) {
            throw new IllegalArgumentException("Crop area exceeds image height: " + (cropY + cropH) + " > " + inHeight);
        }
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
