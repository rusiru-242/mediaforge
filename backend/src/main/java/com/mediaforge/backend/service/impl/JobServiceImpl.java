package com.mediaforge.backend.service.impl;

import com.mediaforge.backend.dto.request.JobCreateRequest;
import com.mediaforge.backend.dto.response.JobResponse;
import com.mediaforge.backend.entity.JobEvent;
import com.mediaforge.backend.entity.MediaJob;
import com.mediaforge.backend.entity.User;
import com.mediaforge.backend.enums.JobStatus;
import com.mediaforge.backend.exception.InvalidJobTransitionException;
import com.mediaforge.backend.exception.JobCancellationException;
import com.mediaforge.backend.exception.ResourceNotFoundException;
import com.mediaforge.backend.exception.UnauthorizedJobAccessException;
import com.mediaforge.backend.mapper.JobMapper;
import com.mediaforge.backend.repository.JobEventRepository;
import com.mediaforge.backend.repository.MediaJobRepository;
import com.mediaforge.backend.repository.UserRepository;
import com.mediaforge.backend.service.JobService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;
import java.util.UUID;

@Service
@Transactional
public class JobServiceImpl implements JobService {

    private static final Logger log = LoggerFactory.getLogger(JobServiceImpl.class);

    private final MediaJobRepository jobRepository;
    private final JobEventRepository eventRepository;
    private final UserRepository userRepository;
    private final JobMapper jobMapper;
    private final com.mediaforge.backend.downloader.service.MediaDownloadService mediaDownloadService;
    private final com.mediaforge.backend.converter.service.ConversionWorker conversionWorker;

    public JobServiceImpl(MediaJobRepository jobRepository,
                          JobEventRepository eventRepository,
                          UserRepository userRepository,
                          JobMapper jobMapper,
                          @org.springframework.context.annotation.Lazy com.mediaforge.backend.downloader.service.MediaDownloadService mediaDownloadService) {
        this(jobRepository, eventRepository, userRepository, jobMapper, mediaDownloadService, null);
    }

    public JobServiceImpl(MediaJobRepository jobRepository,
                          JobEventRepository eventRepository,
                          UserRepository userRepository,
                          JobMapper jobMapper,
                          @org.springframework.context.annotation.Lazy com.mediaforge.backend.downloader.service.MediaDownloadService mediaDownloadService,
                          @org.springframework.context.annotation.Lazy com.mediaforge.backend.converter.service.ConversionWorker conversionWorker) {
        this.jobRepository = jobRepository;
        this.eventRepository = eventRepository;
        this.userRepository = userRepository;
        this.jobMapper = jobMapper;
        this.mediaDownloadService = mediaDownloadService;
        this.conversionWorker = conversionWorker;
    }

    @Override
    public JobResponse createJob(JobCreateRequest request, UUID requestingUserId) {
        log.info("Creating new media job: type={}, source={}, output={}",
                request.getJobType(), request.getSourceType(), request.getOutputFormat());

        User user = null;
        if (requestingUserId != null) {
            user = userRepository.findById(requestingUserId)
                    .orElseThrow(() -> new ResourceNotFoundException("User not found with id: " + requestingUserId));
        }

        MediaJob job = new MediaJob(
                UUID.randomUUID(),
                user,
                request.getJobType(),
                request.getSourceType(),
                request.getInputFormat(),
                request.getOutputFormat()
        );
        job.setStatus(JobStatus.PENDING);
        job.setProgress(0);

        MediaJob savedJob = jobRepository.save(job);

        // Record creation event
        JobEvent event = new JobEvent(UUID.randomUUID(), savedJob, "JOB_CREATED", "Media job created in PENDING status");
        eventRepository.save(event);

        return jobMapper.toResponse(savedJob);
    }

    @Override
    @Transactional(readOnly = true)
    public JobResponse getJobById(UUID id, UUID requestingUserId) {
        MediaJob job = findJobAndValidateAccess(id, requestingUserId);
        return jobMapper.toResponse(job);
    }

    @Override
    @Transactional(readOnly = true)
    public Page<JobResponse> listJobs(JobStatus status, UUID requestingUserId, Pageable pageable) {
        Page<MediaJob> jobs;
        if (requestingUserId != null && status != null) {
            jobs = jobRepository.findByUserIdAndStatus(requestingUserId, status, pageable);
        } else if (requestingUserId != null) {
            jobs = jobRepository.findByUserId(requestingUserId, pageable);
        } else if (status != null) {
            jobs = jobRepository.findByStatus(status, pageable);
        } else {
            jobs = jobRepository.findAll(pageable);
        }
        return jobs.map(jobMapper::toResponse);
    }

    @Override
    public JobResponse cancelJob(UUID id, UUID requestingUserId) {
        MediaJob job = findJobAndValidateAccess(id, requestingUserId);

        if (!job.getStatus().canBeCancelled()) {
            throw new JobCancellationException(job.getStatus());
        }

        // Signal worker thread if download or conversion is currently running
        mediaDownloadService.cancelActiveDownload(id);
        if (conversionWorker != null) {
            conversionWorker.cancel(id);
        }

        JobStatus previousStatus = job.getStatus();
        job.setStatus(JobStatus.CANCELLED);
        job.setCompletedAt(OffsetDateTime.now());

        MediaJob updatedJob = jobRepository.save(job);

        JobEvent event = new JobEvent(UUID.randomUUID(), updatedJob, "JOB_CANCELLED",
                String.format("Job cancelled by user from previous status: %s", previousStatus));
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

    private MediaJob findJobAndValidateAccess(UUID id, UUID requestingUserId) {
        MediaJob job = jobRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Media job not found: " + id));

        // If job belongs to a registered user, only the owner can access it (unless anonymous public jobs)
        if (job.getUser() != null && requestingUserId != null) {
            if (!job.getUser().getId().equals(requestingUserId)) {
                throw new UnauthorizedJobAccessException("You do not have permission to access job: " + id);
            }
        }
        return job;
    }
}
