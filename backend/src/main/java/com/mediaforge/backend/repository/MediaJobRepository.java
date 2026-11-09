package com.mediaforge.backend.repository;

import com.mediaforge.backend.entity.MediaJob;
import com.mediaforge.backend.enums.JobStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.UUID;

@Repository
public interface MediaJobRepository extends JpaRepository<MediaJob, UUID> {
    Page<MediaJob> findByStatus(JobStatus status, Pageable pageable);
    Page<MediaJob> findByUserId(UUID userId, Pageable pageable);
    Page<MediaJob> findByUserIdAndStatus(UUID userId, JobStatus status, Pageable pageable);
}
