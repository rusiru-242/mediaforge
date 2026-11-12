package com.mediaforge.backend.repository;

import com.mediaforge.backend.entity.JobEvent;

import java.util.List;
import java.util.UUID;

public interface JobEventRepository {
    JobEvent save(JobEvent event);
    List<JobEvent> findByJobIdOrderByCreatedAtAsc(UUID jobId);
    void deleteByJobId(UUID jobId);
}
