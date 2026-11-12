package com.mediaforge.backend.mapper;

import com.mediaforge.backend.dto.response.JobResponse;
import com.mediaforge.backend.entity.MediaJob;
import org.springframework.stereotype.Component;

import java.util.UUID;

@Component
public class JobMapper {

    public JobResponse toResponse(MediaJob job) {
        if (job == null) {
            return null;
        }

        JobResponse response = new JobResponse(
                job.getId(),
                null,
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
        response.setAccessToken(job.getAccessToken());

        if (job.getOutputFileId() != null) {
            response.setOutputFileId(job.getOutputFileId());
        } else if (job.getFiles() != null && !job.getFiles().isEmpty()) {
            response.setOutputFileId(job.getFiles().get(0).getId());
        }

        return response;
    }
}
