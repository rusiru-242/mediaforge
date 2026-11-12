package com.mediaforge.backend.converter.service;

import com.mediaforge.backend.converter.model.ConversionOptions;
import com.mediaforge.backend.converter.model.ConversionProgress;
import com.mediaforge.backend.dto.request.BatchConversionRequest;
import com.mediaforge.backend.dto.request.ConversionCreateRequest;
import com.mediaforge.backend.dto.response.BatchConversionResponse;
import com.mediaforge.backend.dto.response.ConversionProgressResponse;
import com.mediaforge.backend.dto.response.ConversionResponse;
import com.mediaforge.backend.dto.response.JobResponse;
import com.mediaforge.backend.entity.ConversionRequest;
import com.mediaforge.backend.entity.JobEvent;
import com.mediaforge.backend.entity.MediaFile;
import com.mediaforge.backend.entity.MediaJob;
import com.mediaforge.backend.entity.User;
import com.mediaforge.backend.enums.JobStatus;
import com.mediaforge.backend.enums.JobType;
import com.mediaforge.backend.enums.SourceType;
import com.mediaforge.backend.exception.ResourceNotFoundException;
import com.mediaforge.backend.mapper.JobMapper;
import com.mediaforge.backend.repository.ConversionRequestRepository;
import com.mediaforge.backend.repository.JobEventRepository;
import com.mediaforge.backend.repository.MediaFileRepository;
import com.mediaforge.backend.repository.MediaJobRepository;
import com.mediaforge.backend.repository.UserRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.core.io.FileSystemResource;
import org.springframework.core.io.Resource;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.io.File;
import java.io.FileOutputStream;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.*;
import java.util.zip.ZipEntry;
import java.util.zip.ZipOutputStream;

@Service
@Transactional
public class ConversionJobServiceImpl implements ConversionJobService {

    private static final Logger log = LoggerFactory.getLogger(ConversionJobServiceImpl.class);

    private final MediaJobRepository jobRepository;
    private final MediaFileRepository fileRepository;
    private final ConversionRequestRepository conversionRequestRepository;
    private final JobEventRepository eventRepository;
    private final UserRepository userRepository;
    private final JobMapper jobMapper;
    private final ConversionWorker conversionWorker;
    private final ConversionProgressService progressService;
    private final ConversionStorageService storageService;
    private final MediaConversionService mediaConversionService;

    public ConversionJobServiceImpl(MediaJobRepository jobRepository,
                                  MediaFileRepository fileRepository,
                                  ConversionRequestRepository conversionRequestRepository,
                                  JobEventRepository eventRepository,
                                  UserRepository userRepository,
                                  JobMapper jobMapper,
                                  ConversionWorker conversionWorker,
                                  ConversionProgressService progressService,
                                  ConversionStorageService storageService,
                                  MediaConversionService mediaConversionService) {
        this.jobRepository = jobRepository;
        this.fileRepository = fileRepository;
        this.conversionRequestRepository = conversionRequestRepository;
        this.eventRepository = eventRepository;
        this.userRepository = userRepository;
        this.jobMapper = jobMapper;
        this.conversionWorker = conversionWorker;
        this.progressService = progressService;
        this.storageService = storageService;
        this.mediaConversionService = mediaConversionService;
    }

    @Override
    public ConversionResponse submitJob(ConversionCreateRequest request, UUID requestingUserId) {
        if (request == null) {
            throw new IllegalArgumentException("Conversion request cannot be null");
        }

        String targetFormat = request.getOutputFormat();
        if (targetFormat == null || targetFormat.isBlank()) {
            throw new IllegalArgumentException("Target output format is required");
        }
        targetFormat = targetFormat.toLowerCase(Locale.ROOT).replace(".", "");

        if (!mediaConversionService.isFormatSupported(targetFormat)) {
            throw new IllegalArgumentException("Unsupported conversion format: " + targetFormat);
        }

        User user = null;
        if (requestingUserId != null) {
            user = userRepository.findById(requestingUserId)
                    .orElseThrow(() -> new ResourceNotFoundException("User not found with id: " + requestingUserId));
        }

        if (request.getInputFileId() == null) {
            throw new IllegalArgumentException("Input file ID is required for media conversion");
        }

        MediaFile inputFile = fileRepository.findById(request.getInputFileId())
                .orElseThrow(() -> new ResourceNotFoundException("Input media file not found with ID: " + request.getInputFileId()));

        String inputFormat = request.getInputFormat();
        if (inputFormat == null || inputFormat.isBlank()) {
            String originalName = inputFile.getOriginalFilename();
            int dot = originalName.lastIndexOf('.');
            inputFormat = dot > 0 ? originalName.substring(dot + 1).toLowerCase(Locale.ROOT) : "unknown";
        }

        // 1. Create MediaJob in QUEUED status
        MediaJob job = new MediaJob(
                UUID.randomUUID(),
                user,
                JobType.CONVERSION,
                SourceType.UPLOAD,
                inputFormat,
                targetFormat
        );
        job.setStatus(JobStatus.QUEUED);
        job.setProgress(0);
        job.setBatchId(request.getBatchId());
        MediaJob savedJob = jobRepository.save(job);

        // 2. Persist ConversionRequest entity
        ConversionRequest convRequest = new ConversionRequest(
                UUID.randomUUID(),
                savedJob,
                inputFile,
                targetFormat,
                request.getTargetResolution(),
                request.getAudioBitrate()
        );
        convRequest.setVideoBitrate(request.getVideoBitrate());
        convRequest.setFrameRate(request.getFrameRate());
        convRequest.setVideoCodec(request.getVideoCodec());
        convRequest.setAudioCodec(request.getAudioCodec());
        convRequest.setSampleRate(request.getSampleRate());
        convRequest.setAudioChannels(request.getAudioChannels());
        convRequest.setQualityPreset(request.getQualityPreset());
        convRequest.setRemoveAudio(request.getRemoveAudio());
        convRequest.setImageWidth(request.getImageWidth());
        convRequest.setImageHeight(request.getImageHeight());
        convRequest.setImageQuality(request.getImageQuality());
        convRequest.setImageRotation(request.getImageRotation());
        convRequest.setStripMetadata(request.getStripMetadata());

        conversionRequestRepository.save(convRequest);

        // 3. Persist Event
        JobEvent event = new JobEvent(
                UUID.randomUUID(),
                savedJob,
                "CONVERSION_QUEUED",
                String.format("Conversion job queued: %s -> %s (Resolution: %s)",
                        inputFile.getOriginalFilename(), targetFormat, request.getTargetResolution())
        );
        eventRepository.save(event);

        // 4. Map options and submit to ConversionWorker
        ConversionOptions options = new ConversionOptions();
        options.setTargetResolution(request.getTargetResolution());
        options.setVideoBitrate(request.getVideoBitrate());
        options.setFrameRate(request.getFrameRate());
        options.setVideoCodec(request.getVideoCodec());
        options.setAudioCodec(request.getAudioCodec());
        options.setAudioBitrate(request.getAudioBitrate());
        options.setSampleRate(request.getSampleRate());
        options.setAudioChannels(request.getAudioChannels());
        options.setQualityPreset(request.getQualityPreset());
        options.setRemoveAudio(request.getRemoveAudio());
        options.setImageWidth(request.getImageWidth());
        options.setImageHeight(request.getImageHeight());
        options.setImageQuality(request.getImageQuality());
        options.setImageRotation(request.getImageRotation());
        options.setStripMetadata(request.getStripMetadata());

        conversionWorker.submit(savedJob.getId(), inputFile, targetFormat, options);

        log.info("Conversion job {} successfully queued for {}", savedJob.getId(), inputFile.getOriginalFilename());

        JobResponse jobResponse = jobMapper.toResponse(savedJob);
        return new ConversionResponse(
                savedJob.getId(),
                jobResponse,
                targetFormat,
                request.getTargetResolution(),
                request.getAudioBitrate(),
                JobStatus.QUEUED.name(),
                "Conversion job successfully accepted and dispatched to FFmpeg processing queue."
        );
    }

    @Override
    public BatchConversionResponse submitBatch(BatchConversionRequest request, UUID requestingUserId) {
        if (request == null || request.getItems() == null || request.getItems().isEmpty()) {
            throw new IllegalArgumentException("Batch conversion request must contain at least one item");
        }

        UUID batchId = UUID.randomUUID();
        List<JobResponse> jobs = new ArrayList<>();

        for (ConversionCreateRequest item : request.getItems()) {
            if ((item.getOutputFormat() == null || item.getOutputFormat().isBlank()) && request.getGlobalOutputFormat() != null) {
                item.setOutputFormat(request.getGlobalOutputFormat());
            }
            item.setBatchId(batchId);
            ConversionResponse resp = submitJob(item, requestingUserId);
            jobs.add(resp.getJob());
        }

        return new BatchConversionResponse(
                batchId,
                jobs.size(),
                jobs,
                "QUEUED",
                String.format("Batch of %d conversion jobs submitted successfully", jobs.size())
        );
    }

    @Override
    @Transactional(readOnly = true)
    public ConversionProgressResponse getProgress(UUID jobId) {
        ConversionProgress cached = progressService.getProgress(jobId);

        MediaJob job = jobRepository.findById(jobId)
                .orElseThrow(() -> new ResourceNotFoundException("Job not found with id: " + jobId));

        UUID outputFileId = null;
        Long outputFileSize = null;
        if (!job.getFiles().isEmpty()) {
            MediaFile out = job.getFiles().get(0);
            outputFileId = out.getId();
            outputFileSize = out.getFileSize();
        }

        if (cached != null) {
            return new ConversionProgressResponse(
                    jobId,
                    cached.getStatus(),
                    cached.getProgress(),
                    cached.getStage(),
                    cached.getElapsedSeconds(),
                    cached.getEtaSeconds(),
                    outputFileSize != null ? outputFileSize : cached.getOutputBytes(),
                    job.getOutputFormat(),
                    outputFileId,
                    cached.getErrorMessage()
            );
        }

        return new ConversionProgressResponse(
                jobId,
                job.getStatus(),
                job.getProgress(),
                job.getStatus().name(),
                0L,
                0L,
                outputFileSize,
                job.getOutputFormat(),
                outputFileId,
                job.getErrorMessage()
        );
    }

    @Override
    public boolean cancelJob(UUID jobId, UUID requestingUserId) {
        MediaJob job = jobRepository.findById(jobId)
                .orElseThrow(() -> new ResourceNotFoundException("Job not found: " + jobId));

        if (job.getStatus() == JobStatus.COMPLETED || job.getStatus() == JobStatus.CANCELLED) {
            return false;
        }

        return conversionWorker.cancel(jobId);
    }

    @Override
    @Transactional(readOnly = true)
    public Resource createBatchZip(UUID batchId) throws IOException {
        List<MediaJob> jobs = jobRepository.findByBatchId(batchId);
        List<MediaFile> batchFiles = new ArrayList<>();

        for (MediaJob job : jobs) {
            if (job.getStatus() == JobStatus.COMPLETED && !job.getFiles().isEmpty()) {
                batchFiles.addAll(job.getFiles());
            }
        }

        if (batchFiles.isEmpty()) {
            throw new ResourceNotFoundException("No completed conversion files found for batch ID: " + batchId);
        }

        File tempZip = File.createTempFile("batch_" + batchId + "_", ".zip");
        tempZip.deleteOnExit();

        try (ZipOutputStream zos = new ZipOutputStream(new FileOutputStream(tempZip))) {
            for (MediaFile file : batchFiles) {
                try {
                    Path path = storageService.resolveFilePath(file);
                    ZipEntry entry = new ZipEntry(file.getOriginalFilename());
                    zos.putNextEntry(entry);
                    Files.copy(path, zos);
                    zos.closeEntry();
                } catch (Exception e) {
                    log.warn("Could not add file {} to batch ZIP", file.getId(), e);
                }
            }
        }

        return new FileSystemResource(tempZip);
    }
}
