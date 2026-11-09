package com.mediaforge.backend.service.impl;

import com.mediaforge.backend.dto.request.DownloadCreateRequest;
import com.mediaforge.backend.dto.request.DownloadValidateRequest;
import com.mediaforge.backend.dto.response.DownloadResponse;
import com.mediaforge.backend.dto.response.DownloadValidateResponse;
import com.mediaforge.backend.dto.response.JobResponse;
import com.mediaforge.backend.entity.DownloadRequest;
import com.mediaforge.backend.entity.JobEvent;
import com.mediaforge.backend.entity.MediaJob;
import com.mediaforge.backend.entity.User;
import com.mediaforge.backend.enums.JobStatus;
import com.mediaforge.backend.enums.JobType;
import com.mediaforge.backend.enums.SourceType;
import com.mediaforge.backend.exception.ResourceNotFoundException;
import com.mediaforge.backend.mapper.JobMapper;
import com.mediaforge.backend.repository.DownloadRequestRepository;
import com.mediaforge.backend.repository.JobEventRepository;
import com.mediaforge.backend.repository.MediaJobRepository;
import com.mediaforge.backend.repository.UserRepository;
import com.mediaforge.backend.service.DownloadService;
import com.mediaforge.backend.validation.UrlSecurityValidator;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.net.URI;
import java.util.List;
import java.util.UUID;

@Service
@Transactional
public class DownloadServiceImpl implements DownloadService {

    private static final Logger log = LoggerFactory.getLogger(DownloadServiceImpl.class);

    private final UrlSecurityValidator urlValidator;
    private final MediaJobRepository jobRepository;
    private final DownloadRequestRepository downloadRequestRepository;
    private final JobEventRepository eventRepository;
    private final UserRepository userRepository;
    private final JobMapper jobMapper;

    public DownloadServiceImpl(UrlSecurityValidator urlValidator,
                               MediaJobRepository jobRepository,
                               DownloadRequestRepository downloadRequestRepository,
                               JobEventRepository eventRepository,
                               UserRepository userRepository,
                               JobMapper jobMapper) {
        this.urlValidator = urlValidator;
        this.jobRepository = jobRepository;
        this.downloadRequestRepository = downloadRequestRepository;
        this.eventRepository = eventRepository;
        this.userRepository = userRepository;
        this.jobMapper = jobMapper;
    }

    @Override
    @Transactional(readOnly = true)
    public DownloadValidateResponse validateUrl(DownloadValidateRequest request) {
        URI validatedUri = urlValidator.validate(request.getUrl());
        String platform = urlValidator.extractPlatform(validatedUri);

        List<String> formats = List.of("mp4", "webm", "mkv", "mp3");
        List<String> qualities = List.of("1080p", "720p", "480p", "240p", "audio-only");

        return new DownloadValidateResponse(
                true,
                validatedUri.toString(),
                platform,
                formats,
                qualities,
                "URL format and host security validation passed. Platform: " + platform
        );
    }

    @Override
    public DownloadResponse createDownload(DownloadCreateRequest request, UUID requestingUserId) {
        URI validatedUri = urlValidator.validate(request.getUrl());
        String platform = urlValidator.extractPlatform(validatedUri);

        User user = null;
        if (requestingUserId != null) {
            user = userRepository.findById(requestingUserId)
                    .orElseThrow(() -> new ResourceNotFoundException("User not found with id: " + requestingUserId));
        }

        MediaJob job = new MediaJob(
                UUID.randomUUID(),
                user,
                JobType.DOWNLOAD,
                SourceType.URL,
                null,
                request.getSelectedFormat().toLowerCase()
        );
        job.setStatus(JobStatus.PENDING);
        job.setProgress(0);
        MediaJob savedJob = jobRepository.save(job);

        DownloadRequest dlRequest = new DownloadRequest(
                UUID.randomUUID(),
                savedJob,
                validatedUri.toString(),
                platform,
                request.getSelectedFormat().toLowerCase(),
                request.getSelectedQuality()
        );
        downloadRequestRepository.save(dlRequest);

        JobEvent event = new JobEvent(
                UUID.randomUUID(),
                savedJob,
                "DOWNLOAD_QUEUED",
                String.format("Download request queued for platform %s at %s (%s)",
                        platform, request.getSelectedQuality(), request.getSelectedFormat())
        );
        eventRepository.save(event);

        log.info("Download job created: {} for platform: {}", savedJob.getId(), platform);

        JobResponse jobResponse = jobMapper.toResponse(savedJob);
        return new DownloadResponse(
                savedJob.getId(),
                jobResponse,
                validatedUri.toString(),
                platform,
                request.getSelectedFormat(),
                request.getSelectedQuality(),
                JobStatus.PENDING.name(),
                "Download job successfully accepted and queued. Media processing worker integration will execute in Phase 04."
        );
    }
}

