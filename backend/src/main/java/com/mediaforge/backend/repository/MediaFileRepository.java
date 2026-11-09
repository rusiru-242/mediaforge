package com.mediaforge.backend.repository;

import com.mediaforge.backend.entity.MediaFile;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface MediaFileRepository extends JpaRepository<MediaFile, UUID> {
    List<MediaFile> findByJobId(UUID jobId);
    Optional<MediaFile> findByStorageKey(String storageKey);
}

