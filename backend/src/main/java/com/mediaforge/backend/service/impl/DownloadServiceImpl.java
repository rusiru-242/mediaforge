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
import com.mediaforge.backend.enums.JobStatus;
import com.mediaforge.backend.enums.JobType;
import com.mediaforge.backend.enums.SourceType;
import com.mediaforge.backend.mapper.JobMapper;
import com.mediaforge.backend.repository.DownloadRequestRepository;
import com.mediaforge.backend.repository.JobEventRepository;
import com.mediaforge.backend.repository.MediaJobRepository;
import com.mediaforge.backend.service.DownloadService;
import com.mediaforge.backend.validation.UrlSecurityValidator;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.net.URI;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.UUID;

@Service
public class DownloadServiceImpl implements DownloadService {

    private static final Logger log = LoggerFactory.getLogger(DownloadServiceImpl.class);

    private final UrlSecurityValidator urlValidator;
    private final MediaMetadataService metadataService;
    private final MediaDownloadService mediaDownloadService;
    private final MediaJobRepository jobRepository;
    private final DownloadRequestRepository downloadRequestRepository;
    private final JobEventRepository eventRepository;
    private final JobMapper jobMapper;

    public DownloadServiceImpl(UrlSecurityValidator urlValidator,
                               MediaMetadataService metadataService,
                               MediaDownloadService mediaDownloadService,
                               MediaJobRepository jobRepository,
                               DownloadRequestRepository downloadRequestRepository,
                               JobEventRepository eventRepository,
                               JobMapper jobMapper) {
        this.urlValidator = urlValidator;
        this.metadataService = metadataService;
        this.mediaDownloadService = mediaDownloadService;
        this.jobRepository = jobRepository;
        this.downloadRequestRepository = downloadRequestRepository;
        this.eventRepository = eventRepository;
        this.jobMapper = jobMapper;
    }

    @Override
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
    public MediaMetadataResponse getMetadata(DownloadValidateRequest request) {
        URI validatedUri = urlValidator.validate(request.getUrl());
        String platform = urlValidator.extractPlatform(validatedUri);

        try {
            MediaMetadata meta = metadataService.extractMetadata(request.getUrl());
            if (meta == null) {
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
                        "Unable to extract metadata from provided URL"
                );
            }

            List<MediaFormatOptionDto> formatDtos = meta.getAvailableFormats().stream()
                    .map(f -> new MediaFormatOptionDto(
                            f.getFormat(),
                            f.getQuality(),
                            f.getResolution(),
                            f.getMimeType(),
                            f.getEstimatedBytes(),
                            f.isNativeStream(),
                            f.isRequiresConversion(),
                            f.getLabel()
                    ))
                    .toList();

            boolean directSupported = formatDtos.stream().anyMatch(MediaFormatOptionDto::isNativeStream);

            String responseMsg;
            if (directSupported) {
                responseMsg = meta.getMessage() != null && !meta.getMessage().isBlank()
                        ? meta.getMessage()
                        : "Media stream inspected successfully — ready for download";
            } else if (meta.getMessage() != null && !meta.getMessage().isBlank()) {
                responseMsg = meta.getMessage();
            } else {
                responseMsg = "Direct stream download is currently unavailable for this media source.";
            }

            return new MediaMetadataResponse(
                    true,
                    validatedUri.toString(),
                    platform,
                    meta.getTitle(),
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
                    responseMsg
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
    public List<MediaFormatOptionDto> getFormats(String url) {
        if (url == null || url.trim().isEmpty()) {
            return Collections.emptyList();
        }
        MediaMetadataResponse metadata = getMetadata(new DownloadValidateRequest(url));
        return metadata.getAvailableFormats();
    }

    @Override
    public DownloadResponse createDownload(DownloadCreateRequest request) {
        URI validatedUri = urlValidator.validate(request.getUrl());
        String platform = urlValidator.extractPlatform(validatedUri);

        MediaJob job = new MediaJob(
                UUID.randomUUID(),
                JobType.DOWNLOAD,
                SourceType.URL,
                null,
                request.getSelectedFormat().toLowerCase()
        );
        job.setStatus(JobStatus.PENDING);
        job.setProgress(0);
        job.setSourceUrl(validatedUri.toString());
        job.setTargetResolution(request.getSelectedQuality());
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
