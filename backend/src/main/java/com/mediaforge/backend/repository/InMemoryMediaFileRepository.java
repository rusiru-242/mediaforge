package com.mediaforge.backend.repository;

import com.mediaforge.backend.entity.MediaFile;
import jakarta.annotation.PostConstruct;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Repository;

import java.io.File;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.OffsetDateTime;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;
import java.util.stream.Collectors;

@Repository
public class InMemoryMediaFileRepository implements MediaFileRepository {

    private static final Logger log = LoggerFactory.getLogger(InMemoryMediaFileRepository.class);

    private final Map<UUID, MediaFile> storage = new ConcurrentHashMap<>();

    @PostConstruct
    public void init() {
        log.info("[IN-MEMORY STORE] Initialized MediaForge in-memory file repository.");
    }

    @Override
    public MediaFile save(MediaFile file) {
        if (file == null) {
            throw new IllegalArgumentException("MediaFile cannot be null");
        }
        if (file.getId() == null) {
            file.setId(UUID.randomUUID());
        }
        if (file.getCreatedAt() == null) {
            file.setCreatedAt(OffsetDateTime.now());
        }
        if (file.getExpiresAt() == null) {
            file.setExpiresAt(file.getCreatedAt().plusHours(24));
        }
        if (file.getAccessToken() == null) {
            file.setAccessToken(UUID.randomUUID().toString().replace("-", ""));
        }
        storage.put(file.getId(), file);
        return file;
    }

    @Override
    public Optional<MediaFile> findById(UUID id) {
        if (id == null) {
            return Optional.empty();
        }
        return Optional.ofNullable(storage.get(id));
    }

    @Override
    public List<MediaFile> findByJobId(UUID jobId) {
        if (jobId == null) {
            return Collections.emptyList();
        }
        return storage.values().stream()
                .filter(f -> f.getJob() != null && jobId.equals(f.getJob().getId()))
                .collect(Collectors.toList());
    }

    @Override
    public Optional<MediaFile> findByStorageKey(String storageKey) {
        if (storageKey == null) {
            return Optional.empty();
        }
        return storage.values().stream()
                .filter(f -> storageKey.equals(f.getStorageKey()))
                .findFirst();
    }

    @Override
    public List<MediaFile> findAll() {
        return new ArrayList<>(storage.values());
    }

    @Override
    public void deleteById(UUID id) {
        if (id != null) {
            storage.remove(id);
        }
    }

    @Override
    public long count() {
        return storage.size();
    }

    @Override
    public void deleteExpired(OffsetDateTime threshold) {
        if (threshold == null) return;
        List<MediaFile> expiredFiles = storage.values().stream()
                .filter(f -> f.getExpiresAt() != null && f.getExpiresAt().isBefore(threshold))
                .toList();

        for (MediaFile file : expiredFiles) {
            storage.remove(file.getId());
            // Attempt physical disk file cleanup if path exists
            if (file.getStorageKey() != null) {
                try {
                    Path p = Path.of(file.getStorageKey());
                    Files.deleteIfExists(p);
                } catch (Exception e) {
                    log.debug("Could not delete expired physical file {}: {}", file.getStorageKey(), e.getMessage());
                }
            }
        }

        if (!expiredFiles.isEmpty()) {
            log.info("[IN-MEMORY STORE] Purged {} expired media files from memory", expiredFiles.size());
        }
    }

    @Scheduled(fixedDelay = 300000) // Every 5 minutes
    public void cleanupExpiredFiles() {
        deleteExpired(OffsetDateTime.now());
    }
}
