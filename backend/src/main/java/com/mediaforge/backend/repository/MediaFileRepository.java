package com.mediaforge.backend.repository;

import com.mediaforge.backend.entity.MediaFile;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface MediaFileRepository {
    MediaFile save(MediaFile file);
    Optional<MediaFile> findById(UUID id);
    List<MediaFile> findByJobId(UUID jobId);
    Optional<MediaFile> findByStorageKey(String storageKey);
    List<MediaFile> findAll();
    void deleteById(UUID id);
    long count();
    void deleteExpired(OffsetDateTime threshold);
}
