package com.mediaforge.backend.service.impl;

import com.mediaforge.backend.downloader.model.MediaFormatOption;
import com.mediaforge.backend.downloader.model.MediaMetadata;
import com.mediaforge.backend.downloader.service.MediaDownloadService;
import com.mediaforge.backend.downloader.service.MediaMetadataService;
import com.mediaforge.backend.dto.request.DownloadCreateRequest;
import com.mediaforge.backend.dto.request.DownloadValidateRequest;
import com.mediaforge.backend.dto.response.DownloadResponse;
import com.mediaforge.backend.dto.response.DownloadValidateResponse;
import com.mediaforge.backend.dto.response.JobResponse;
import com.mediaforge.backend.dto.response.MediaFormatOptionDto;
import com.mediaforge.backend.dto.response.MediaMetadataResponse;
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

import java.io.IOException;
import java.net.URI;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.UUID;

@Service
@Transactional
public class DownloadServiceImpl implements DownloadService {

    private static final Logger log = LoggerFactory.getLogger(DownloadServiceImpl.class);

    private final UrlSecurityValidator urlValidator;
    private final MediaMetadataService metadataService;
    private final MediaDownloadService mediaDownloadService;
    private final MediaJobRepository jobRepository;
    private final DownloadRequestRepository downloadRequestRepository;
    private final JobEventRepository eventRepository;
    private final UserRepository userRepository;
    private final JobMapper jobMapper;

    public DownloadServiceImpl(UrlSecurityValidator urlValidator,
                               MediaMetadataService metadataService,
                               MediaDownloadService mediaDownloadService,
                               MediaJobRepository jobRepository,
                               DownloadRequestRepository downloadRequestRepository,
                               JobEventRepository eventRepository,
                               UserRepository userRepository,
                               JobMapper jobMapper) {
        this.urlValidator = urlValidator;
        this.metadataService = metadataService;
        this.mediaDownloadService = mediaDownloadService;
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

        List<String> formats = new ArrayList<>();
        List<String> qualities = new ArrayList<>();

        try {
            MediaMetadata metadata = metadataService.extractMetadata(request.getUrl());
            if (metadata != null) {
                if (metadata.getAvailableFormats() != null) {
                    formats = metadata.getAvailableFormats().stream().map(MediaFormatOption::getFormat).distinct().toList();
                }
                if (metadata.getAvailableQualities() != null && !metadata.getAvailableQualities().isEmpty()) {
                    qualities = metadata.getAvailableQualities();
                }
            }
        } catch (Exception ex) {
            log.warn("Probe during URL validation returned: {}", ex.getMessage());
        }

        if (formats.isEmpty()) {
            formats = List.of("mp4", "webm", "mkv", "mp3");
        }
        if (qualities.isEmpty()) {
            qualities = List.of("Original Quality", "1080p", "720p", "480p", "audio-only");
        }

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
    @Transactional(readOnly = true)
    public MediaMetadataResponse getMetadata(DownloadValidateRequest request) {
        URI validatedUri = urlValidator.validate(request.getUrl());
        String platform = urlValidator.extractPlatform(validatedUri);

        try {
            MediaMetadata meta = metadataService.extractMetadata(request.getUrl());
            List<MediaFormatOptionDto> formatDtos = new ArrayList<>();
            if (meta.getAvailableFormats() != null) {
                for (MediaFormatOption opt : meta.getAvailableFormats()) {
                    formatDtos.add(new MediaFormatOptionDto(
                            opt.getFormat(),
                            opt.getQuality(),
                            opt.getResolution(),
                            opt.getMimeType(),
                            opt.getEstimatedBytes(),
                            opt.isNativeStream(),
                            opt.isRequiresConversion(),
                            opt.getLabel()
                    ));
                }
            }

            boolean directSupported = meta.getDirectStreamUri() != null && !formatDtos.isEmpty();

            return new MediaMetadataResponse(
                    true,
                    validatedUri.toString(),
                    meta.getSourceName() != null ? meta.getSourceName() : platform,
                    meta.getTitle() != null ? meta.getTitle() : "Media Stream",
                    meta.getMediaType(),
                    meta.getMimeType(),
                    meta.getContainerFormat(),
                    meta.getFileSize(),
                    meta.getResolution(),
                    meta.getDurationSeconds(),
                    meta.getThumbnailUri(),
                    formatDtos,
                    meta.getAvailableQualities(),
                    directSupported,
                    directSupported ? "Media stream inspected successfully" : "Source recognized but direct stream download requires credentials or conversion"
            );
        } catch (IOException e) {
            log.warn("Failed to extract metadata for URL {}: {}", request.getUrl(), e.getMessage());
            return new MediaMetadataResponse(
                    false,
                    validatedUri.toString(),
                    platform,
                    "Unknown Media",
                    "UNKNOWN",
                    "application/octet-stream",
                    "bin",
                    null,
                    null,
                    null,
                    null,
                    Collections.emptyList(),
                    Collections.emptyList(),
                    false,
                    "Failed to probe media metadata: " + e.getMessage()
            );
        }
    }

    @Override
    @Transactional(readOnly = true)
    public List<MediaFormatOptionDto> getFormats(String url) {
        if (url == null || url.trim().isEmpty()) {
            return Collections.emptyList();
        }
        MediaMetadataResponse metadata = getMetadata(new DownloadValidateRequest(url));
        return metadata.getAvailableFormats();
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

        // Submit to asynchronous download worker engine
        mediaDownloadService.submitDownloadJob(
                savedJob.getId(),
                validatedUri,
                request.getSelectedFormat().toLowerCase(),
                request.getSelectedQuality()
        );

        JobResponse jobResponse = jobMapper.toResponse(savedJob);
        return new DownloadResponse(
                savedJob.getId(),
                jobResponse,
                validatedUri.toString(),
                platform,
                request.getSelectedFormat(),
                request.getSelectedQuality(),
                JobStatus.QUEUED.name(),
                "Download job successfully accepted and dispatched to background media engine."
        );
    }
}
