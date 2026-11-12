package com.mediaforge.backend.repository;

import com.mediaforge.backend.dto.response.PageResponse;
import com.mediaforge.backend.entity.MediaJob;
import com.mediaforge.backend.enums.JobStatus;
import jakarta.annotation.PostConstruct;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Repository;

import java.time.OffsetDateTime;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;
import java.util.stream.Collectors;

@Repository
public class InMemoryMediaJobRepository implements MediaJobRepository {

    private static final Logger log = LoggerFactory.getLogger(InMemoryMediaJobRepository.class);

    private final Map<UUID, MediaJob> storage = new ConcurrentHashMap<>();

    @PostConstruct
    public void init() {
        log.info("[IN-MEMORY STORE] Initialized MediaForge in-memory job repository. " +
                "Note: All state is ephemeral, database-free, and resets cleanly on application restart.");
    }

    @Override
    public MediaJob save(MediaJob job) {
        if (job == null) {
            throw new IllegalArgumentException("MediaJob cannot be null");
        }
        if (job.getId() == null) {
            job.setId(UUID.randomUUID());
        }
        if (job.getCreatedAt() == null) {
            job.setCreatedAt(OffsetDateTime.now());
        }
        if (job.getExpiresAt() == null) {
            job.setExpiresAt(job.getCreatedAt().plusHours(24));
        }
        storage.put(job.getId(), job);
        return job;
    }

    @Override
    public Optional<MediaJob> findById(UUID id) {
        if (id == null) {
            return Optional.empty();
        }
        return Optional.ofNullable(storage.get(id));
    }

    @Override
    public List<MediaJob> findAll() {
        return storage.values().stream()
                .sorted(Comparator.comparing(MediaJob::getCreatedAt, Comparator.nullsLast(Comparator.reverseOrder())))
                .collect(Collectors.toList());
    }

    @Override
    public PageResponse<MediaJob> findAll(int page, int size) {
        List<MediaJob> all = findAll();
        return paginate(all, page, size);
    }

    @Override
    public List<MediaJob> findByStatus(JobStatus status) {
        if (status == null) {
            return findAll();
        }
        return storage.values().stream()
                .filter(j -> j.getStatus() == status)
                .sorted(Comparator.comparing(MediaJob::getCreatedAt, Comparator.nullsLast(Comparator.reverseOrder())))
                .collect(Collectors.toList());
    }

    @Override
    public PageResponse<MediaJob> findByStatus(JobStatus status, int page, int size) {
        List<MediaJob> filtered = findByStatus(status);
        return paginate(filtered, page, size);
    }

    @Override
    public List<MediaJob> findByBatchId(UUID batchId) {
        if (batchId == null) {
            return Collections.emptyList();
        }
        return storage.values().stream()
                .filter(j -> batchId.equals(j.getBatchId()))
                .sorted(Comparator.comparing(MediaJob::getCreatedAt, Comparator.nullsLast(Comparator.naturalOrder())))
                .collect(Collectors.toList());
    }

    @Override
    public void deleteById(UUID id) {
        if (id != null) {
            storage.remove(id);
        }
    }

    @Override
    public long count() {
        return storage.size();
    }

    @Override
    public void deleteExpired(OffsetDateTime threshold) {
        if (threshold == null) return;
        List<UUID> toRemove = storage.values().stream()
                .filter(j -> j.getExpiresAt() != null && j.getExpiresAt().isBefore(threshold))
                .map(MediaJob::getId)
                .toList();

        toRemove.forEach(storage::remove);
        if (!toRemove.isEmpty()) {
            log.info("[IN-MEMORY STORE] Purged {} expired media jobs", toRemove.size());
        }
    }

    @Scheduled(fixedDelay = 300000) // Every 5 minutes
    public void cleanupExpiredJobs() {
        deleteExpired(OffsetDateTime.now());
    }

    private PageResponse<MediaJob> paginate(List<MediaJob> items, int page, int size) {
        int effectivePage = Math.max(0, page);
        int effectiveSize = Math.max(1, size);
        int totalElements = items.size();

        int fromIndex = effectivePage * effectiveSize;
        if (fromIndex >= totalElements) {
            return new PageResponse<>(Collections.emptyList(), effectivePage, effectiveSize, totalElements);
        }

        int toIndex = Math.min(fromIndex + effectiveSize, totalElements);
        List<MediaJob> content = items.subList(fromIndex, toIndex);
        return new PageResponse<>(content, effectivePage, effectiveSize, totalElements);
    }
}
