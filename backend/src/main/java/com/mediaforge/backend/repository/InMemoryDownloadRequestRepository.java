package com.mediaforge.backend.repository;

import com.mediaforge.backend.entity.DownloadRequest;
import org.springframework.stereotype.Repository;

import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;

@Repository
public class InMemoryDownloadRequestRepository implements DownloadRequestRepository {

    private final Map<UUID, DownloadRequest> storageByJob = new ConcurrentHashMap<>();

    @Override
    public DownloadRequest save(DownloadRequest request) {
        if (request == null) {
            throw new IllegalArgumentException("DownloadRequest cannot be null");
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
    public Optional<DownloadRequest> findByJobId(UUID jobId) {
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
