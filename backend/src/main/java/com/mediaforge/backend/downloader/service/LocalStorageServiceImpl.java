package com.mediaforge.backend.downloader.service;

import com.mediaforge.backend.entity.MediaFile;
import com.mediaforge.backend.entity.MediaJob;
import com.mediaforge.backend.exception.ResourceNotFoundException;
import com.mediaforge.backend.repository.MediaFileRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.Resource;
import org.springframework.core.io.UrlResource;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.io.IOException;
import java.net.MalformedURLException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.time.OffsetDateTime;
import java.util.Comparator;
import java.util.List;
import java.util.UUID;
import java.util.stream.Stream;

@Service
public class LocalStorageServiceImpl implements MediaStorageService {

    private static final Logger log = LoggerFactory.getLogger(LocalStorageServiceImpl.class);

    private final Path storageRoot;
    private final int retentionHours;
    private final MediaFileRepository mediaFileRepository;

    public LocalStorageServiceImpl(
            @Value("${app.storage.base-path:./uploads}") String basePath,
            @Value("${app.storage.retention-hours:24}") int retentionHours,
            MediaFileRepository mediaFileRepository) {
        this.storageRoot = Paths.get(basePath).toAbsolutePath().normalize();
        this.retentionHours = retentionHours;
        this.mediaFileRepository = mediaFileRepository;

        try {
            Files.createDirectories(this.storageRoot);
            Files.createDirectories(this.storageRoot.resolve("scratch"));
            Files.createDirectories(this.storageRoot.resolve("media"));
            log.info("Initialized media storage root at: {}", this.storageRoot);
        } catch (IOException e) {
            throw new RuntimeException("Could not initialize local storage directory: " + this.storageRoot, e);
        }
    }

    @Override
    public Path getScratchDirectory(UUID jobId) {
        Path scratch = storageRoot.resolve("scratch").resolve(jobId.toString()).normalize();
        assertPathWithinRoot(scratch);
        try {
            Files.createDirectories(scratch);
        } catch (IOException e) {
            throw new RuntimeException("Failed to create scratch directory: " + scratch, e);
        }
        return scratch;
    }

    @Override
    @Transactional
    public MediaFile storeDownloadedFile(MediaJob job, String originalFilename, Path tempFilePath, String mimeType, long fileSize) throws IOException {
        assertPathWithinRoot(tempFilePath);
        if (!Files.exists(tempFilePath)) {
            throw new IOException("Temporary source file does not exist: " + tempFilePath);
        }

        UUID fileId = UUID.randomUUID();
        String extension = getExtension(originalFilename);
        String storedFilename = fileId + (extension.isEmpty() ? "" : "." + extension);
        String storageKey = "media/" + storedFilename;

        Path targetPath = storageRoot.resolve("media").resolve(storedFilename).normalize();
        assertPathWithinRoot(targetPath);

        Files.move(tempFilePath, targetPath, StandardCopyOption.REPLACE_EXISTING);

        OffsetDateTime now = OffsetDateTime.now();
        OffsetDateTime expiresAt = now.plusHours(retentionHours);

        MediaFile mediaFile = new MediaFile(
                fileId,
                job,
                originalFilename,
                storedFilename,
                storageKey,
                mimeType,
                fileSize,
                expiresAt
        );

        return mediaFileRepository.save(mediaFile);
    }

    @Override
    @Transactional(readOnly = true)
    public Resource loadAsResource(UUID fileId) throws IOException {
        MediaFile mediaFile = getMediaFile(fileId);
        Path filePath = storageRoot.resolve(mediaFile.getStorageKey()).normalize();
        assertPathWithinRoot(filePath);

        if (!Files.exists(filePath) || !Files.isReadable(filePath)) {
            throw new ResourceNotFoundException("Media file not found or unreadable on storage: " + fileId);
        }

        try {
            Resource resource = new UrlResource(filePath.toUri());
            if (resource.exists() && resource.isReadable()) {
                return resource;
            } else {
                throw new ResourceNotFoundException("Media file not accessible: " + fileId);
            }
        } catch (MalformedURLException e) {
            throw new IOException("Invalid file path URI: " + filePath, e);
        }
    }

    @Override
    @Transactional(readOnly = true)
    public MediaFile getMediaFile(UUID fileId) {
        return mediaFileRepository.findById(fileId)
                .orElseThrow(() -> new ResourceNotFoundException("File record not found for id: " + fileId));
    }

    @Override
    public void cleanupScratch(UUID jobId) {
        Path scratch = storageRoot.resolve("scratch").resolve(jobId.toString()).normalize();
        if (Files.exists(scratch)) {
            try (Stream<Path> walk = Files.walk(scratch)) {
                walk.sorted(Comparator.reverseOrder())
                        .forEach(p -> {
                            try {
                                Files.deleteIfExists(p);
                            } catch (IOException ignored) {
                            }
                        });
            } catch (IOException e) {
                log.warn("Failed to clean up scratch directory for job: {}", jobId, e);
            }
        }
    }

    @Override
    @Scheduled(cron = "${app.storage.cleanup-cron:0 0 * * * *}") // Hourly cleanup
    @Transactional
    public int cleanupExpiredFiles() {
        OffsetDateTime now = OffsetDateTime.now();
        List<MediaFile> allFiles = mediaFileRepository.findAll();
        int purgedCount = 0;

        for (MediaFile file : allFiles) {
            if (file.getExpiresAt() != null && file.getExpiresAt().isBefore(now)) {
                Path filePath = storageRoot.resolve(file.getStorageKey()).normalize();
                try {
                    Files.deleteIfExists(filePath);
                } catch (IOException e) {
                    log.warn("Failed to delete expired physical file: {}", filePath, e);
                }
                mediaFileRepository.delete(file);
                purgedCount++;
            }
        }

        if (purgedCount > 0) {
            log.info("Purged {} expired media files according to {}-hour retention policy", purgedCount, retentionHours);
        }
        return purgedCount;
    }

    private void assertPathWithinRoot(Path path) {
        Path normalized = path.toAbsolutePath().normalize();
        if (!normalized.startsWith(storageRoot)) {
            throw new SecurityException("Path traversal attempt detected: " + path);
        }
    }

    private String getExtension(String filename) {
        if (filename == null) return "";
        int dot = filename.lastIndexOf('.');
        return dot >= 0 && dot < filename.length() - 1 ? filename.substring(dot + 1) : "";
    }
}
