package com.mediaforge.backend.repository;

import com.mediaforge.backend.entity.JobEvent;
import org.springframework.stereotype.Repository;

import java.util.*;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.CopyOnWriteArrayList;
import java.util.stream.Collectors;

@Repository
public class InMemoryJobEventRepository implements JobEventRepository {

    private final Map<UUID, List<JobEvent>> eventsByJob = new ConcurrentHashMap<>();

    @Override
    public JobEvent save(JobEvent event) {
        if (event == null) {
            throw new IllegalArgumentException("JobEvent cannot be null");
        }
        if (event.getId() == null) {
            event.setId(UUID.randomUUID());
        }
        if (event.getJob() != null && event.getJob().getId() != null) {
            eventsByJob.computeIfAbsent(event.getJob().getId(), k -> new CopyOnWriteArrayList<>()).add(event);
        }
        return event;
    }

    @Override
    public List<JobEvent> findByJobIdOrderByCreatedAtAsc(UUID jobId) {
        if (jobId == null) {
            return Collections.emptyList();
        }
        List<JobEvent> events = eventsByJob.get(jobId);
        if (events == null) {
            return Collections.emptyList();
        }
        return events.stream()
                .sorted(Comparator.comparing(JobEvent::getCreatedAt, Comparator.nullsLast(Comparator.naturalOrder())))
                .collect(Collectors.toList());
    }

    @Override
    public void deleteByJobId(UUID jobId) {
        if (jobId != null) {
            eventsByJob.remove(jobId);
        }
    }
}
