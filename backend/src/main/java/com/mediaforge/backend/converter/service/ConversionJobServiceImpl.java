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
import com.mediaforge.backend.enums.JobStatus;
import com.mediaforge.backend.enums.JobType;
import com.mediaforge.backend.enums.SourceType;
import com.mediaforge.backend.exception.ResourceNotFoundException;
import com.mediaforge.backend.mapper.JobMapper;
import com.mediaforge.backend.repository.ConversionRequestRepository;
import com.mediaforge.backend.repository.JobEventRepository;
import com.mediaforge.backend.repository.MediaFileRepository;
import com.mediaforge.backend.repository.MediaJobRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.core.io.FileSystemResource;
import org.springframework.core.io.Resource;
import org.springframework.stereotype.Service;

import java.io.File;
import java.io.FileOutputStream;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.*;
import java.util.zip.ZipEntry;
import java.util.zip.ZipOutputStream;

@Service
public class ConversionJobServiceImpl implements ConversionJobService {

    private static final Logger log = LoggerFactory.getLogger(ConversionJobServiceImpl.class);

    private final MediaJobRepository jobRepository;
    private final MediaFileRepository fileRepository;
    private final ConversionRequestRepository conversionRequestRepository;
    private final JobEventRepository eventRepository;
    private final JobMapper jobMapper;
    private final ConversionWorker conversionWorker;
    private final ConversionProgressService progressService;
    private final ConversionStorageService storageService;
    private final MediaConversionService mediaConversionService;

    public ConversionJobServiceImpl(MediaJobRepository jobRepository,
                                  MediaFileRepository fileRepository,
                                  ConversionRequestRepository conversionRequestRepository,
                                  JobEventRepository eventRepository,
                                  JobMapper jobMapper,
                                  ConversionWorker conversionWorker,
                                  ConversionProgressService progressService,
                                  ConversionStorageService storageService,
                                  MediaConversionService mediaConversionService) {
        this.jobRepository = jobRepository;
        this.fileRepository = fileRepository;
        this.conversionRequestRepository = conversionRequestRepository;
        this.eventRepository = eventRepository;
        this.jobMapper = jobMapper;
        this.conversionWorker = conversionWorker;
        this.progressService = progressService;
        this.storageService = storageService;
        this.mediaConversionService = mediaConversionService;
    }

    @Override
    public ConversionResponse submitJob(ConversionCreateRequest request) {
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
                JobType.CONVERSION,
                SourceType.UPLOAD,
                inputFormat,
                targetFormat
        );
        job.setStatus(JobStatus.QUEUED);
        job.setProgress(0);
        job.setBatchId(request.getBatchId());
        job.setTargetResolution(request.getTargetResolution());
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
        convRequest.setCrf(request.getCrf());
        convRequest.setStartTime(request.getStartTime());
        convRequest.setEndTime(request.getEndTime());
        if (request.getRemoveSegments() != null) {
            convRequest.setRemoveSegments(request.getRemoveSegments().stream()
                    .map(dto -> new com.mediaforge.backend.converter.model.TimeRange(dto.getStart(), dto.getEnd()))
                    .collect(java.util.stream.Collectors.toList()));
        }
        convRequest.setCropX(request.getCropX());
        convRequest.setCropY(request.getCropY());
        convRequest.setCropWidth(request.getCropWidth());
        convRequest.setCropHeight(request.getCropHeight());
        convRequest.setAspectRatio(request.getAspectRatio());
        convRequest.setVolume(request.getVolume());
        convRequest.setRemoveSilence(request.getRemoveSilence());
        convRequest.setFadeInDuration(request.getFadeInDuration());
        convRequest.setFadeOutDuration(request.getFadeOutDuration());
        convRequest.setImageWidth(request.getImageWidth());
        convRequest.setImageHeight(request.getImageHeight());
        convRequest.setImageQuality(request.getImageQuality());
        convRequest.setImageRotation(request.getImageRotation());
        convRequest.setPreserveAspectRatio(request.getPreserveAspectRatio());
        convRequest.setFlipHorizontal(request.getFlipHorizontal());
        convRequest.setFlipVertical(request.getFlipVertical());
        convRequest.setBrightness(request.getBrightness());
        convRequest.setContrast(request.getContrast());
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
        options.setCrf(request.getCrf());
        options.setStartTime(request.getStartTime());
        options.setEndTime(request.getEndTime());
        if (request.getRemoveSegments() != null) {
            options.setRemoveSegments(request.getRemoveSegments().stream()
                    .map(dto -> new com.mediaforge.backend.converter.model.TimeRange(dto.getStart(), dto.getEnd()))
                    .collect(java.util.stream.Collectors.toList()));
        }
        options.setCropX(request.getCropX());
        options.setCropY(request.getCropY());
        options.setCropWidth(request.getCropWidth());
        options.setCropHeight(request.getCropHeight());
        options.setAspectRatio(request.getAspectRatio());
        options.setVolume(request.getVolume());
        options.setRemoveSilence(request.getRemoveSilence());
        options.setFadeInDuration(request.getFadeInDuration());
        options.setFadeOutDuration(request.getFadeOutDuration());
        options.setImageWidth(request.getImageWidth());
        options.setImageHeight(request.getImageHeight());
        options.setImageQuality(request.getImageQuality());
        options.setImageRotation(request.getImageRotation());
        options.setPreserveAspectRatio(request.getPreserveAspectRatio());
        options.setFlipHorizontal(request.getFlipHorizontal());
        options.setFlipVertical(request.getFlipVertical());
        options.setBrightness(request.getBrightness());
        options.setContrast(request.getContrast());
        options.setStripMetadata(request.getStripMetadata());
        options.normalizePresets();

        conversionWorker.submit(savedJob.getId(), inputFile, targetFormat, options);

        JobResponse jobResponse = jobMapper.toResponse(savedJob);
        return new ConversionResponse(
                savedJob.getId(),
                jobResponse,
                targetFormat,
                request.getTargetResolution(),
                request.getAudioBitrate(),
                JobStatus.QUEUED.name(),
                "Conversion job queued successfully"
        );
    }

    @Override
    public BatchConversionResponse submitBatch(BatchConversionRequest request) {
        if (request == null || request.getItems() == null || request.getItems().isEmpty()) {
            throw new IllegalArgumentException("Batch conversion request must contain at least one conversion item");
        }

        UUID batchId = UUID.randomUUID();
        List<JobResponse> jobs = new ArrayList<>();

        for (ConversionCreateRequest item : request.getItems()) {
            item.setBatchId(batchId);
            ConversionResponse resp = submitJob(item);
            jobs.add(resp.getJob());
        }

        return new BatchConversionResponse(
                batchId,
                jobs.size(),
                jobs,
                JobStatus.QUEUED.name(),
                String.format("Successfully submitted batch of %d conversion jobs", jobs.size())
        );
    }

    @Override
    public ConversionProgressResponse getProgress(UUID jobId) {
        MediaJob job = jobRepository.findById(jobId)
                .orElseThrow(() -> new ResourceNotFoundException("Job not found with ID: " + jobId));

        ConversionProgress progress = progressService.getProgress(jobId);
        if (progress != null) {
            return new ConversionProgressResponse(
                    progress.getJobId(),
                    progress.getStatus(),
                    progress.getProgress(),
                    progress.getStage(),
                    progress.getElapsedSeconds(),
                    progress.getEtaSeconds(),
                    progress.getOutputBytes(),
                    job.getOutputFormat(),
                    job.getOutputFileId(),
                    progress.getErrorMessage()
            );
        }

        return new ConversionProgressResponse(
                job.getId(),
                job.getStatus(),
                job.getProgress(),
                null,
                null,
                null,
                null,
                job.getOutputFormat(),
                job.getOutputFileId(),
                job.getErrorMessage()
        );
    }

    @Override
    public boolean cancelJob(UUID jobId) {
        MediaJob job = jobRepository.findById(jobId)
                .orElseThrow(() -> new ResourceNotFoundException("Job not found with ID: " + jobId));

        if (job.getStatus().isTerminal()) {
            return false;
        }

        return conversionWorker.cancel(jobId);
    }

    @Override
    public Resource createBatchZip(UUID batchId) throws IOException {
        List<MediaJob> batchJobs = jobRepository.findByBatchId(batchId);
        if (batchJobs.isEmpty()) {
            throw new ResourceNotFoundException("No conversion jobs found for batch ID: " + batchId);
        }

        Path zipScratch = Files.createTempFile("batch-" + batchId + "-", ".zip");
        File zipFile = zipScratch.toFile();

        try (ZipOutputStream zos = new ZipOutputStream(new FileOutputStream(zipFile))) {
            byte[] buffer = new byte[8192];
            Set<String> entryNames = new HashSet<>();

            for (MediaJob job : batchJobs) {
                if (job.getStatus() == JobStatus.COMPLETED) {
                    List<MediaFile> files = fileRepository.findByJobId(job.getId());
                    if (files.isEmpty()) continue;

                    MediaFile outputFile = files.get(0);
                    Path diskPath = storageService.resolveFilePath(outputFile);
                    if (!Files.exists(diskPath)) continue;

                    String entryName = outputFile.getOriginalFilename();
                    if (entryName == null || entryName.isBlank()) {
                        entryName = outputFile.getStoredFilename();
                    }

                    int collisionCount = 1;
                    String baseName = entryName;
                    while (entryNames.contains(entryName)) {
                        entryName = collisionCount + "_" + baseName;
                        collisionCount++;
                    }
                    entryNames.add(entryName);

                    ZipEntry zipEntry = new ZipEntry(entryName);
                    zos.putNextEntry(zipEntry);
                    try (var is = Files.newInputStream(diskPath)) {
                        int len;
                        while ((len = is.read(buffer)) > 0) {
                            zos.write(buffer, 0, len);
                        }
                    }
                    zos.closeEntry();
                }
            }
        }

        return new FileSystemResource(zipFile);
    }
}
