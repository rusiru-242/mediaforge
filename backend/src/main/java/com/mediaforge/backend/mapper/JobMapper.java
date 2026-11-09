package com.mediaforge.backend.mapper;

import com.mediaforge.backend.dto.response.JobResponse;
import com.mediaforge.backend.entity.MediaJob;
import org.springframework.stereotype.Component;

@Component
public class JobMapper {

    public JobResponse toResponse(MediaJob job) {
        if (job == null) {
            return null;
        }

        return new JobResponse(
                job.getId(),
                job.getUser() != null ? job.getUser().getId() : null,
                job.getJobType(),
                job.getSourceType(),
                job.getStatus(),
                job.getProgress(),
                job.getInputFormat(),
                job.getOutputFormat(),
                job.getErrorMessage(),
                job.getCreatedAt(),
                job.getStartedAt(),
                job.getCompletedAt()
        );
    }
}

