package com.mediaforge.backend.converter.service;

import com.mediaforge.backend.converter.model.ConversionOptions;
import com.mediaforge.backend.converter.model.ConversionProgress;
import com.mediaforge.backend.converter.model.ConversionResult;
import com.mediaforge.backend.entity.JobEvent;
import com.mediaforge.backend.entity.MediaFile;
import com.mediaforge.backend.entity.MediaJob;
import com.mediaforge.backend.enums.JobStatus;
import com.mediaforge.backend.repository.JobEventRepository;
import com.mediaforge.backend.repository.MediaJobRepository;
import jakarta.annotation.PostConstruct;
import jakarta.annotation.PreDestroy;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.concurrent.ThreadPoolTaskExecutor;
import org.springframework.stereotype.Service;

import java.io.File;
import java.nio.file.Path;
import java.time.OffsetDateTime;
import java.util.UUID;
import java.util.concurrent.CancellationException;

@Service
public class ConversionWorker {

    private static final Logger log = LoggerFactory.getLogger(ConversionWorker.class);

    @Value("${app.converter.max-concurrent-jobs:4}")
    private int maxConcurrentJobs;

    private final MediaJobRepository jobRepository;
    private final JobEventRepository eventRepository;
    private final MediaConversionService conversionService;
    private final ConversionStorageService storageService;
    private final ConversionProgressService progressService;
    private final FFmpegProcessExecutor ffmpegExecutor;

    private ThreadPoolTaskExecutor taskExecutor;

    public ConversionWorker(MediaJobRepository jobRepository,
                            JobEventRepository eventRepository,
                            MediaConversionService conversionService,
                            ConversionStorageService storageService,
                            ConversionProgressService progressService,
                            FFmpegProcessExecutor ffmpegExecutor) {
        this.jobRepository = jobRepository;
        this.eventRepository = eventRepository;
        this.conversionService = conversionService;
        this.storageService = storageService;
        this.progressService = progressService;
        this.ffmpegExecutor = ffmpegExecutor;
    }

    @PostConstruct
    public void init() {
        this.taskExecutor = new ThreadPoolTaskExecutor();
        this.taskExecutor.setCorePoolSize(Math.max(2, maxConcurrentJobs / 2));
        this.taskExecutor.setMaxPoolSize(Math.max(4, maxConcurrentJobs));
        this.taskExecutor.setQueueCapacity(200);
        this.taskExecutor.setThreadNamePrefix("conv-worker-");
        this.taskExecutor.initialize();
        log.info("ConversionWorker pool initialized with max concurrency: {}", maxConcurrentJobs);
    }

    @PreDestroy
    public void shutdown() {
        if (this.taskExecutor != null) {
            this.taskExecutor.shutdown();
        }
    }

    /**
     * Submits a conversion task to the worker executor pool.
     */
    public void submit(UUID jobId, MediaFile inputFile, String targetFormat, ConversionOptions options) {
        taskExecutor.submit(() -> processConversionJob(jobId, inputFile, targetFormat, options));
    }

    private void processConversionJob(UUID jobId, MediaFile inputFile, String targetFormat, ConversionOptions options) {
        log.info("Worker claiming conversion job {}", jobId);

        // 1. Transition to PROCESSING state in in-memory repository
        MediaJob job = jobRepository.findById(jobId).orElse(null);
        if (job == null || job.getStatus() == JobStatus.CANCELLED) {
            log.warn("Job {} was not claimable or was cancelled before starting", jobId);
            return;
        }
        job.setStatus(JobStatus.PROCESSING);
        job.setStartedAt(OffsetDateTime.now());
        jobRepository.save(job);

        JobEvent event = new JobEvent(UUID.randomUUID(), job, "CONVERSION_STARTED",
                "Started transcoding " + inputFile.getOriginalFilename() + " to " + targetFormat);
        eventRepository.save(event);

        File scratchFile = null;
        try {
            Path inputPath = storageService.resolveFilePath(inputFile);
            scratchFile = storageService.createScratchFile(jobId, targetFormat);

            // Execute Conversion
            ConversionResult result = conversionService.convert(
                    jobId,
                    inputPath.toFile(),
                    scratchFile,
                    targetFormat,
                    options,
                    progress -> {
                        // Forward progress updates
                        progressService.updateProgress(jobId, progress);
                        // Persist progress to in-memory store periodically
                        if (progress.getProgress() % 5 == 0) {
                            jobRepository.findById(jobId).ifPresent(j -> {
                                j.setProgress(progress.getProgress());
                                jobRepository.save(j);
                            });
                        }
                    }
            );

            // 2. Promote scratch file to permanent storage and create MediaFile record
            final File finalScratch = scratchFile;
            MediaFile outputMediaFile = storageService.promoteToOutputFile(
                    jobId,
                    finalScratch,
                    inputFile.getOriginalFilename(),
                    targetFormat,
                    result.getMimeType()
            );

            // 3. Complete Job in in-memory store
            MediaJob completedJob = jobRepository.findById(jobId).orElse(null);
            if (completedJob != null) {
                completedJob.setStatus(JobStatus.COMPLETED);
                completedJob.setProgress(100);
                completedJob.setOutputFileId(outputMediaFile.getId());
                completedJob.setCompletedAt(OffsetDateTime.now());
                jobRepository.save(completedJob);

                JobEvent completeEvent = new JobEvent(UUID.randomUUID(), completedJob, "CONVERSION_COMPLETED",
                        "Media successfully converted to " + targetFormat + " (" + outputMediaFile.getFileSize() + " bytes)");
                eventRepository.save(completeEvent);
            }

            progressService.updateProgress(jobId, new ConversionProgress(
                    jobId,
                    JobStatus.COMPLETED,
                    100,
                    "Completed successfully",
                    0,
                    0L,
                    outputMediaFile.getFileSize()
            ));

            log.info("Conversion job {} successfully completed", jobId);

        } catch (CancellationException | InterruptedException e) {
            log.info("Conversion job {} was cancelled", jobId);
            handleJobCancellation(jobId);
        } catch (Exception e) {
            if (ffmpegExecutor.isRunning(jobId) || (e.getMessage() != null && e.getMessage().contains("interrupted"))) {
                log.info("Conversion job {} aborted via cancellation", jobId);
                handleJobCancellation(jobId);
            } else {
                log.error("Conversion job {} failed with error", jobId, e);
                handleJobFailure(jobId, e.getMessage());
            }
        } finally {
            storageService.deleteScratchFiles(jobId);
        }
    }

    private void handleJobCancellation(UUID jobId) {
        storageService.deleteScratchFiles(jobId);
        MediaJob job = jobRepository.findById(jobId).orElse(null);
        if (job != null && job.getStatus() != JobStatus.COMPLETED) {
            job.setStatus(JobStatus.CANCELLED);
            job.setErrorMessage("Conversion was cancelled by user");
            jobRepository.save(job);

            JobEvent event = new JobEvent(UUID.randomUUID(), job, "CONVERSION_CANCELLED", "Job cancelled by user request");
            eventRepository.save(event);
        }

        ConversionProgress prog = new ConversionProgress(jobId, JobStatus.CANCELLED, 0, "Cancelled", 0, null, 0);
        prog.setErrorMessage("Job cancelled by user");
        progressService.updateProgress(jobId, prog);
    }

    private void handleJobFailure(UUID jobId, String errorMessage) {
        storageService.deleteScratchFiles(jobId);
        MediaJob job = jobRepository.findById(jobId).orElse(null);
        if (job != null && job.getStatus() != JobStatus.COMPLETED) {
            job.setStatus(JobStatus.FAILED);
            job.setErrorMessage(errorMessage != null ? errorMessage : "Media conversion failed during processing");
            jobRepository.save(job);

            JobEvent event = new JobEvent(UUID.randomUUID(), job, "CONVERSION_FAILED",
                    "Conversion failed: " + job.getErrorMessage());
            eventRepository.save(event);
        }

        ConversionProgress prog = new ConversionProgress(jobId, JobStatus.FAILED, 0, "Failed", 0, null, 0);
        prog.setErrorMessage(errorMessage);
        progressService.updateProgress(jobId, prog);
    }

    public boolean cancel(UUID jobId) {
        boolean cancelledProcess = ffmpegExecutor.cancelProcess(jobId);
        handleJobCancellation(jobId);
        return cancelledProcess;
    }
}
