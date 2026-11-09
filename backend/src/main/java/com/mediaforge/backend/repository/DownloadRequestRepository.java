package com.mediaforge.backend.repository;

import com.mediaforge.backend.entity.DownloadRequest;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface DownloadRequestRepository extends JpaRepository<DownloadRequest, UUID> {
    Optional<DownloadRequest> findByJobId(UUID jobId);
}
