package com.mediaforge.backend.service.impl;

import com.mediaforge.backend.converter.service.ConversionWorker;
import com.mediaforge.backend.downloader.service.MediaDownloadService;
import com.mediaforge.backend.dto.request.JobCreateRequest;
import com.mediaforge.backend.dto.response.JobResponse;
import com.mediaforge.backend.dto.response.PageResponse;
import com.mediaforge.backend.entity.JobEvent;
import com.mediaforge.backend.entity.MediaJob;
import com.mediaforge.backend.enums.JobStatus;
import com.mediaforge.backend.exception.InvalidJobTransitionException;
import com.mediaforge.backend.exception.JobCancellationException;
import com.mediaforge.backend.exception.ResourceNotFoundException;
import com.mediaforge.backend.mapper.JobMapper;
import com.mediaforge.backend.repository.JobEventRepository;
import com.mediaforge.backend.repository.MediaJobRepository;
import com.mediaforge.backend.service.JobService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.annotation.Lazy;
import org.springframework.stereotype.Service;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

@Service
public class JobServiceImpl implements JobService {

    private static final Logger log = LoggerFactory.getLogger(JobServiceImpl.class);

    private final MediaJobRepository jobRepository;
    private final JobEventRepository eventRepository;
    private final JobMapper jobMapper;
    private final MediaDownloadService mediaDownloadService;
    private final ConversionWorker conversionWorker;

    public JobServiceImpl(MediaJobRepository jobRepository,
                          JobEventRepository eventRepository,
                          JobMapper jobMapper,
                          @Lazy MediaDownloadService mediaDownloadService,
                          @Lazy ConversionWorker conversionWorker) {
        this.jobRepository = jobRepository;
        this.eventRepository = eventRepository;
        this.jobMapper = jobMapper;
        this.mediaDownloadService = mediaDownloadService;
        this.conversionWorker = conversionWorker;
    }

    public JobServiceImpl(MediaJobRepository jobRepository,
                          JobEventRepository eventRepository,
                          JobMapper jobMapper,
                          @Lazy MediaDownloadService mediaDownloadService) {
        this(jobRepository, eventRepository, jobMapper, mediaDownloadService, null);
    }

    @Override
    public JobResponse createJob(JobCreateRequest request) {
        log.info("Creating new media job: type={}, source={}, output={}",
                request.getJobType(), request.getSourceType(), request.getOutputFormat());

        MediaJob job = new MediaJob(
                UUID.randomUUID(),
                request.getJobType(),
                request.getSourceType(),
                request.getInputFormat(),
                request.getOutputFormat()
        );
        job.setStatus(JobStatus.PENDING);
        job.setProgress(0);

        MediaJob savedJob = jobRepository.save(job);

        JobEvent event = new JobEvent(UUID.randomUUID(), savedJob, "JOB_CREATED", "Media job created in PENDING status");
        eventRepository.save(event);

        return jobMapper.toResponse(savedJob);
    }

    @Override
    public JobResponse getJobById(UUID id) {
        MediaJob job = jobRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Media job not found: " + id));
        return jobMapper.toResponse(job);
    }

    @Override
    public PageResponse<JobResponse> listJobs(JobStatus status, int page, int size) {
        PageResponse<MediaJob> pagedJobs;
        if (status != null) {
            pagedJobs = jobRepository.findByStatus(status, page, size);
        } else {
            pagedJobs = jobRepository.findAll(page, size);
        }

        List<JobResponse> dtoList = pagedJobs.getContent().stream()
                .map(jobMapper::toResponse)
                .toList();

        return new PageResponse<>(dtoList, pagedJobs.getNumber(), pagedJobs.getSize(), pagedJobs.getTotalElements());
    }

    @Override
    public JobResponse cancelJob(UUID id) {
        MediaJob job = jobRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Media job not found: " + id));

        if (!job.getStatus().canBeCancelled()) {
            throw new JobCancellationException(job.getStatus());
        }

        if (mediaDownloadService != null) {
            mediaDownloadService.cancelActiveDownload(id);
        }
        if (conversionWorker != null) {
            conversionWorker.cancel(id);
        }

        JobStatus previousStatus = job.getStatus();
        job.setStatus(JobStatus.CANCELLED);
        job.setCompletedAt(OffsetDateTime.now());

        MediaJob updatedJob = jobRepository.save(job);

        JobEvent event = new JobEvent(UUID.randomUUID(), updatedJob, "JOB_CANCELLED",
                String.format("Job cancelled from previous status: %s", previousStatus));
        eventRepository.save(event);

        log.info("Job {} cancelled successfully", id);
        return jobMapper.toResponse(updatedJob);
    }

    @Override
    public JobResponse updateProgress(UUID id, int progress) {
        if (progress < 0 || progress > 100) {
            throw new IllegalArgumentException("Progress must be between 0 and 100, received: " + progress);
        }

        MediaJob job = jobRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Media job not found: " + id));

        if (job.getStatus().isTerminal()) {
            throw new InvalidJobTransitionException(job.getStatus(), job.getStatus());
        }

        job.setProgress(progress);
        MediaJob saved = jobRepository.save(job);
        return jobMapper.toResponse(saved);
    }

    @Override
    public JobResponse updateStatus(UUID id, JobStatus newStatus, String errorMessage) {
        MediaJob job = jobRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Media job not found: " + id));

        if (!job.getStatus().canTransitionTo(newStatus)) {
            throw new InvalidJobTransitionException(job.getStatus(), newStatus);
        }

        job.setStatus(newStatus);
        if (errorMessage != null) {
            job.setErrorMessage(errorMessage);
        }

        if (newStatus == JobStatus.PROCESSING && job.getStartedAt() == null) {
            job.setStartedAt(OffsetDateTime.now());
        } else if (newStatus.isTerminal() && job.getCompletedAt() == null) {
            job.setCompletedAt(OffsetDateTime.now());
        }

        MediaJob saved = jobRepository.save(job);

        JobEvent event = new JobEvent(UUID.randomUUID(), saved, "STATUS_CHANGED",
                String.format("Status transitioned to %s", newStatus));
        eventRepository.save(event);

        return jobMapper.toResponse(saved);
    }
}
