package com.mediaforge.backend.repository;

import com.mediaforge.backend.dto.response.PageResponse;
import com.mediaforge.backend.entity.MediaJob;
import com.mediaforge.backend.enums.JobStatus;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface MediaJobRepository {
    MediaJob save(MediaJob job);
    Optional<MediaJob> findById(UUID id);
    List<MediaJob> findAll();
    PageResponse<MediaJob> findAll(int page, int size);
    List<MediaJob> findByStatus(JobStatus status);
    PageResponse<MediaJob> findByStatus(JobStatus status, int page, int size);
    List<MediaJob> findByBatchId(UUID batchId);
    void deleteById(UUID id);
    long count();
    void deleteExpired(OffsetDateTime threshold);
}
