package com.mediaforge.backend.converter.service;

import com.mediaforge.backend.entity.MediaFile;
import com.mediaforge.backend.entity.MediaJob;
import com.mediaforge.backend.exception.ResourceNotFoundException;
import com.mediaforge.backend.repository.MediaFileRepository;
import com.mediaforge.backend.repository.MediaJobRepository;
import jakarta.annotation.PostConstruct;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.Resource;
import org.springframework.core.io.UrlResource;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.File;
import java.io.IOException;
import java.io.InputStream;
import java.nio.file.*;
import java.nio.file.attribute.BasicFileAttributes;
import java.time.Instant;
import java.time.OffsetDateTime;
import java.time.temporal.ChronoUnit;
import java.util.Arrays;
import java.util.Locale;
import java.util.UUID;

@Service
public class ConversionStorageServiceImpl implements ConversionStorageService {

    private static final Logger log = LoggerFactory.getLogger(ConversionStorageServiceImpl.class);

    @Value("${app.storage.base-path:./mediaforge_data/conversions}")
    private String basePathStr = "./mediaforge_data/conversions";

    @Value("${app.storage.retention-hours:24}")
    private int retentionHours = 24;

    @Value("${app.converter.max-file-size-bytes:524288000}") // 500 MB
    private long maxFileSizeBytes = 524288000L;

    private final MediaFileRepository fileRepository;
    private final MediaJobRepository jobRepository;

    private Path rootPath;
    private Path uploadsPath;
    private Path outputsPath;
    private Path scratchPath;

    @Autowired
    public ConversionStorageServiceImpl(MediaFileRepository fileRepository, MediaJobRepository jobRepository) {
        this(fileRepository, jobRepository, "./mediaforge_data/conversions");
    }

    public ConversionStorageServiceImpl(MediaFileRepository fileRepository, MediaJobRepository jobRepository, String basePathStr) {
        this.fileRepository = fileRepository;
        this.jobRepository = jobRepository;
        this.basePathStr = (basePathStr != null && !basePathStr.isBlank()) ? basePathStr : "./mediaforge_data/conversions";
    }

    @PostConstruct
    public void init() {
        try {
            this.rootPath = Paths.get(basePathStr).toAbsolutePath().normalize();
            this.uploadsPath = rootPath.resolve("uploads");
            this.outputsPath = rootPath.resolve("outputs");
            this.scratchPath = rootPath.resolve("scratch");

            Files.createDirectories(uploadsPath);
            Files.createDirectories(outputsPath);
            Files.createDirectories(scratchPath);

            log.info("ConversionStorageService initialized at root: {}", rootPath);
        } catch (IOException e) {
            throw new IllegalStateException("Failed to initialize conversion storage directories", e);
        }
    }

    @Override
    public MediaFile storeUploadedFile(MultipartFile file) throws IOException {
        if (file == null || file.isEmpty()) {
            throw new IllegalArgumentException("Cannot upload empty file");
        }

        if (file.getSize() > maxFileSizeBytes) {
            throw new IllegalArgumentException(String.format("File size exceeds maximum allowed limit of %d MB", maxFileSizeBytes / (1024 * 1024)));
        }

        String originalFilename = sanitizeFilename(file.getOriginalFilename());
        validateNotExecutable(originalFilename);

        byte[] header = new byte[32];
        try (InputStream is = file.getInputStream()) {
            int read = is.read(header);
            if (read < 4) {
                throw new IllegalArgumentException("Uploaded file is too small or corrupted");
            }
        }

        validateMagicBytes(header, originalFilename);

        String extension = getExtension(originalFilename);
        UUID fileId = UUID.randomUUID();
        String storedFilename = fileId + (extension.isEmpty() ? "" : "." + extension);

        Path targetPath = uploadsPath.resolve(storedFilename).normalize();
        validatePathTraversal(uploadsPath, targetPath);

        Files.copy(file.getInputStream(), targetPath, StandardCopyOption.REPLACE_EXISTING);

        String detectedMimeType = file.getContentType();
        if (detectedMimeType == null || detectedMimeType.isBlank() || detectedMimeType.equals("application/octet-stream")) {
            detectedMimeType = guessMimeType(extension);
        }

        OffsetDateTime now = OffsetDateTime.now();
        OffsetDateTime expiresAt = now.plusHours(retentionHours);

        MediaFile mediaFile = new MediaFile(
                fileId,
                null, // Uploaded prior to job creation
                originalFilename,
                storedFilename,
                targetPath.toString(),
                detectedMimeType,
                file.getSize(),
                expiresAt
        );

        MediaFile saved = fileRepository.save(mediaFile);
        log.info("Uploaded media file stored: id={}, name={}, size={} bytes", saved.getId(), originalFilename, saved.getFileSize());
        return saved;
    }

    @Override
    public Path resolveFilePath(MediaFile mediaFile) {
        if (mediaFile == null || mediaFile.getStorageKey() == null) {
            throw new IllegalArgumentException("Invalid media file metadata");
        }
        Path path = Paths.get(mediaFile.getStorageKey()).toAbsolutePath().normalize();
        validatePathTraversal(rootPath, path);
        if (!Files.exists(path)) {
            throw new ResourceNotFoundException("Media file not found on disk: " + mediaFile.getId());
        }
        return path;
    }

    @Override
    public File createScratchFile(UUID jobId, String outputExtension) throws IOException {
        String cleanExt = outputExtension.startsWith(".") ? outputExtension.substring(1) : outputExtension;
        String filename = "scratch_" + jobId + "_" + System.currentTimeMillis() + "." + cleanExt;
        Path scratchFile = scratchPath.resolve(filename).normalize();
        validatePathTraversal(scratchPath, scratchFile);
        return scratchFile.toFile();
    }

    @Override
    public MediaFile promoteToOutputFile(UUID jobId, File scratchFile, String originalFilename, String targetFormat, String mimeType) throws IOException {
        if (!scratchFile.exists() || scratchFile.length() == 0) {
            throw new IOException("Transcoded output scratch file is empty or missing: " + scratchFile.getAbsolutePath());
        }

        MediaJob job = jobRepository.findById(jobId)
                .orElseThrow(() -> new ResourceNotFoundException("Job not found: " + jobId));

        UUID fileId = UUID.randomUUID();
        String cleanFormat = targetFormat.toLowerCase(Locale.ROOT).replace(".", "");
        String storedFilename = fileId + "." + cleanFormat;

        Path finalPath = outputsPath.resolve(storedFilename).normalize();
        validatePathTraversal(outputsPath, finalPath);

        Files.move(scratchFile.toPath(), finalPath, StandardCopyOption.ATOMIC_MOVE, StandardCopyOption.REPLACE_EXISTING);

        long fileSize = Files.size(finalPath);
        OffsetDateTime expiresAt = OffsetDateTime.now().plusHours(retentionHours);

        String outOriginalName = originalFilename != null ? originalFilename : "converted." + cleanFormat;
        if (!outOriginalName.toLowerCase().endsWith("." + cleanFormat)) {
            int lastDot = outOriginalName.lastIndexOf('.');
            if (lastDot > 0) {
                outOriginalName = outOriginalName.substring(0, lastDot) + "." + cleanFormat;
            } else {
                outOriginalName = outOriginalName + "." + cleanFormat;
            }
        }

        MediaFile mediaFile = new MediaFile(
                fileId,
                job,
                outOriginalName,
                storedFilename,
                finalPath.toString(),
                mimeType != null ? mimeType : guessMimeType(cleanFormat),
                fileSize,
                expiresAt
        );

        MediaFile saved = fileRepository.save(mediaFile);
        log.info("Promoted scratch file to output media: id={}, path={}, size={}", saved.getId(), finalPath, fileSize);
        return saved;
    }

    @Override
    public Resource loadAsResource(UUID fileId) throws IOException {
        MediaFile file = getMediaFile(fileId);
        Path path = resolveFilePath(file);
        Resource resource = new UrlResource(path.toUri());
        if (!resource.exists() || !resource.isReadable()) {
            throw new ResourceNotFoundException("Stored media resource is not readable: " + fileId);
        }
        return resource;
    }

    @Override
    public MediaFile getMediaFile(UUID fileId) {
        return fileRepository.findById(fileId)
                .orElseThrow(() -> new ResourceNotFoundException("Media file not found: " + fileId));
    }

    @Override
    public void deleteScratchFiles(UUID jobId) {
        try {
            if (!Files.exists(scratchPath)) return;
            try (DirectoryStream<Path> stream = Files.newDirectoryStream(scratchPath, "scratch_" + jobId + "*")) {
                for (Path path : stream) {
                    try {
                        Files.deleteIfExists(path);
                        log.debug("Deleted scratch file: {}", path);
                    } catch (IOException e) {
                        log.warn("Could not delete scratch file: {}", path, e);
                    }
                }
            }
        } catch (IOException e) {
            log.warn("Failed scanning scratch files for job {}", jobId, e);
        }
    }

    @Override
    @Scheduled(cron = "0 0 * * * *") // Every hour
    public void cleanupExpiredFiles() {
        log.info("Starting scheduled conversion storage retention cleanup...");
        Instant cutoff = Instant.now().minus(retentionHours, ChronoUnit.HOURS);

        cleanupDirectory(uploadsPath, cutoff);
        cleanupDirectory(outputsPath, cutoff);
        cleanupDirectory(scratchPath, Instant.now().minus(2, ChronoUnit.HOURS)); // Scratch older than 2h
    }

    private void cleanupDirectory(Path dir, Instant cutoff) {
        if (!Files.exists(dir)) return;
        try {
            Files.walkFileTree(dir, new SimpleFileVisitor<Path>() {
                @Override
                public FileVisitResult visitFile(Path file, BasicFileAttributes attrs) {
                    if (attrs.lastModifiedTime().toInstant().isBefore(cutoff)) {
                        try {
                            Files.deleteIfExists(file);
                            log.info("Retention cleanup: deleted expired file {}", file.getFileName());
                        } catch (IOException e) {
                            log.warn("Could not delete expired file {}", file, e);
                        }
                    }
                    return FileVisitResult.CONTINUE;
                }
            });
        } catch (IOException e) {
            log.error("Retention cleanup error in directory {}", dir, e);
        }
    }

    private void validatePathTraversal(Path baseDir, Path target) {
        try {
            Path canonicalBase = baseDir.toRealPath();
            Path canonicalTarget = target.normalize().toAbsolutePath();
            if (!canonicalTarget.startsWith(canonicalBase)) {
                throw new SecurityException("Path traversal attempt detected: " + target);
            }
        } catch (IOException e) {
            // Target might not exist yet; check against normalized absolute path
            Path normalBase = baseDir.normalize().toAbsolutePath();
            Path normalTarget = target.normalize().toAbsolutePath();
            if (!normalTarget.startsWith(normalBase)) {
                throw new SecurityException("Path traversal attempt detected: " + target);
            }
        }
    }

    private String sanitizeFilename(String filename) {
        if (filename == null) return "uploaded_media";
        String clean = filename.replace("\\", "/");
        clean = clean.substring(clean.lastIndexOf('/') + 1);
        clean = clean.replaceAll("[^a-zA-Z0-9._-]", "_");
        if (clean.isBlank() || clean.equals(".")) {
            clean = "uploaded_media";
        }
        return clean;
    }

    private void validateNotExecutable(String filename) {
        String lower = filename.toLowerCase(Locale.ROOT);
        String[] forbidden = {".exe", ".bat", ".cmd", ".sh", ".php", ".py", ".pl", ".jsp", ".asp", ".aspx", ".dll", ".so", ".bin", ".com", ".vbs", ".ps1"};
        for (String ext : forbidden) {
            if (lower.endsWith(ext)) {
                throw new SecurityException("Executable and script files are strictly rejected: " + filename);
            }
        }
    }

    private void validateMagicBytes(byte[] header, String filename) {
        // Windows PE executable (MZ)
        if (header[0] == 0x4D && header[1] == 0x5A) {
            throw new SecurityException("Executable Windows PE binary rejected");
        }
        // Linux ELF
        if (header[0] == 0x7F && header[1] == 0x45 && header[2] == 0x4C && header[3] == 0x46) {
            throw new SecurityException("Executable Linux ELF binary rejected");
        }
        // Java class file
        if ((header[0] & 0xFF) == 0xCA && (header[1] & 0xFF) == 0xFE && (header[2] & 0xFF) == 0xBA && (header[3] & 0xFF) == 0xBE) {
            throw new SecurityException("Executable Java bytecode rejected");
        }
        // Shell script
        if (header[0] == 0x23 && header[1] == 0x21) {
            throw new SecurityException("Shell script rejected");
        }
        // HTML / PHP script
        String start = new String(header, 0, Math.min(header.length, 16)).toLowerCase(Locale.ROOT);
        if (start.startsWith("<html") || start.startsWith("<!doctype") || start.startsWith("<?php") || start.startsWith("<script")) {
            throw new SecurityException("Script or HTML document rejected");
        }
    }

    private String getExtension(String filename) {
        int dot = filename.lastIndexOf('.');
        return dot > 0 ? filename.substring(dot + 1).toLowerCase(Locale.ROOT) : "";
    }

    private String guessMimeType(String format) {
        switch (format.toLowerCase(Locale.ROOT)) {
            case "mp4": return "video/mp4";
            case "webm": return "video/webm";
            case "mkv": return "video/x-matroska";
            case "mov": return "video/quicktime";
            case "avi": return "video/x-msvideo";
            case "mp3": return "audio/mpeg";
            case "wav": return "audio/wav";
            case "aac": return "audio/aac";
            case "flac": return "audio/flac";
            case "m4a": return "audio/mp4";
            case "ogg": return "audio/ogg";
            case "jpg":
            case "jpeg": return "image/jpeg";
            case "png": return "image/png";
            case "webp": return "image/webp";
            case "gif": return "image/gif";
            case "bmp": return "image/bmp";
            default: return "application/octet-stream";
        }
    }
}
