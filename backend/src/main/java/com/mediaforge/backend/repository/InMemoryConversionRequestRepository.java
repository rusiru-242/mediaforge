package com.mediaforge.backend.repository;

import com.mediaforge.backend.entity.ConversionRequest;
import org.springframework.stereotype.Repository;

import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;

@Repository
public class InMemoryConversionRequestRepository implements ConversionRequestRepository {

    private final Map<UUID, ConversionRequest> storageByJob = new ConcurrentHashMap<>();

    @Override
    public ConversionRequest save(ConversionRequest request) {
        if (request == null) {
            throw new IllegalArgumentException("ConversionRequest cannot be null");
        }
        if (request.getId() == null) {
            request.setId(UUID.randomUUID());
        }
        if (request.getJob() != null && request.getJob().getId() != null) {
            storageByJob.put(request.getJob().getId(), request);
        }
        return request;
    }

    @Override
    public Optional<ConversionRequest> findByJobId(UUID jobId) {
        if (jobId == null) {
            return Optional.empty();
        }
        return Optional.ofNullable(storageByJob.get(jobId));
    }

    @Override
    public void deleteByJobId(UUID jobId) {
        if (jobId != null) {
            storageByJob.remove(jobId);
        }
    }
}
