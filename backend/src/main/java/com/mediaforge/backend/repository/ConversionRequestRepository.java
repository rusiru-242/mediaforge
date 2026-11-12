package com.mediaforge.backend.repository;

import com.mediaforge.backend.entity.ConversionRequest;

import java.util.Optional;
import java.util.UUID;

public interface ConversionRequestRepository {
    ConversionRequest save(ConversionRequest request);
    Optional<ConversionRequest> findByJobId(UUID jobId);
    void deleteByJobId(UUID jobId);
}
