package com.mediaforge.backend.repository;

import com.mediaforge.backend.entity.DownloadRequest;

import java.util.Optional;
import java.util.UUID;

public interface DownloadRequestRepository {
    DownloadRequest save(DownloadRequest request);
    Optional<DownloadRequest> findByJobId(UUID jobId);
    void deleteByJobId(UUID jobId);
}
