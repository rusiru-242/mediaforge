package com.mediaforge.backend.repository;

import com.mediaforge.backend.entity.ConversionRequest;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface ConversionRequestRepository extends JpaRepository<ConversionRequest, UUID> {
    Optional<ConversionRequest> findByJobId(UUID jobId);
}

