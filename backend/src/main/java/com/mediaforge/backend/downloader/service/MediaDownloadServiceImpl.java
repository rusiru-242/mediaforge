package com.mediaforge.backend.downloader.service;

import com.mediaforge.backend.converter.model.ConversionOptions;
import com.mediaforge.backend.converter.model.ConversionResult;
import com.mediaforge.backend.converter.service.MediaConversionService;
import com.mediaforge.backend.downloader.adapter.MediaSourceAdapter;
import com.mediaforge.backend.downloader.adapter.MediaSourceAdapterRegistry;
import com.mediaforge.backend.downloader.model.DownloadProgress;
import com.mediaforge.backend.downloader.model.DownloadTask;
import com.mediaforge.backend.downloader.model.DownloadedMedia;
import com.mediaforge.backend.entity.JobEvent;
import com.mediaforge.backend.entity.MediaFile;
import com.mediaforge.backend.entity.MediaJob;
import com.mediaforge.backend.enums.JobStatus;
import com.mediaforge.backend.repository.JobEventRepository;
import com.mediaforge.backend.repository.MediaJobRepository;
import jakarta.annotation.PreDestroy;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.lang.Nullable;
import org.springframework.stereotype.Service;

import java.io.File;
import java.io.IOException;
import java.net.URI;
import java.nio.file.Path;
import java.time.OffsetDateTime;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;

@Service
public class MediaDownloadServiceImpl implements MediaDownloadService {

    private static final Logger log = LoggerFactory.getLogger(MediaDownloadServiceImpl.class);

    private final MediaSourceAdapterRegistry adapterRegistry;
    private final MediaStorageService storageService;
    private final MediaJobRepository jobRepository;
    private final JobEventRepository eventRepository;
    private final ExecutorService executorService;
    private final Map<UUID, DownloadTask> activeTasks = new ConcurrentHashMap<>();
    private final YtDlpProcessExecutor ytDlpExecutor;
    private final MediaConversionService mediaConversionService;
    private final DownloadOutputVerifier outputVerifier;

    @Value("${app.downloader.max-file-size-bytes:524288000}")
    private long maxFileSizeBytes;

    public MediaDownloadServiceImpl(
            MediaSourceAdapterRegistry adapterRegistry,
            MediaStorageService storageService,
            MediaJobRepository jobRepository,
            JobEventRepository eventRepository,
            @Value("${app.downloader.pool-size:5}") int poolSize) {
        this(adapterRegistry, storageService, jobRepository, eventRepository, poolSize, null, null);
    }

    public MediaDownloadServiceImpl(
            MediaSourceAdapterRegistry adapterRegistry,
            MediaStorageService storageService,
            MediaJobRepository jobRepository,
            JobEventRepository eventRepository,
            @Value("${app.downloader.pool-size:5}") int poolSize,
            @Nullable YtDlpProcessExecutor ytDlpExecutor,
            @Nullable MediaConversionService mediaConversionService) {
        this(adapterRegistry, storageService, jobRepository, eventRepository, poolSize, ytDlpExecutor,
                mediaConversionService, new DownloadOutputVerifier(new com.mediaforge.backend.converter.service.MediaProbeServiceImpl(new com.fasterxml.jackson.databind.ObjectMapper())));
    }

    @org.springframework.beans.factory.annotation.Autowired
    public MediaDownloadServiceImpl(MediaSourceAdapterRegistry adapterRegistry, MediaStorageService storageService,
            MediaJobRepository jobRepository, JobEventRepository eventRepository,
            @Value("${app.downloader.pool-size:5}") int poolSize,
            @Nullable YtDlpProcessExecutor ytDlpExecutor, @Nullable MediaConversionService mediaConversionService,
            DownloadOutputVerifier outputVerifier) {
        this.outputVerifier = outputVerifier;
        this.adapterRegistry = adapterRegistry;
        this.storageService = storageService;
        this.jobRepository = jobRepository;
        this.eventRepository = eventRepository;
        this.ytDlpExecutor = ytDlpExecutor;
        this.mediaConversionService = mediaConversionService;
        int workers = Math.max(1, Math.min(16, poolSize));
        this.executorService = new java.util.concurrent.ThreadPoolExecutor(workers, workers, 0, TimeUnit.SECONDS,
                new java.util.concurrent.ArrayBlockingQueue<>(100), new java.util.concurrent.ThreadPoolExecutor.AbortPolicy());
    }

    @Override
    public void submitDownloadJob(UUID jobId, URI sourceUri, String targetFormat, String targetQuality) {
        submitDownloadJob(jobId, sourceUri, targetFormat, targetQuality, null);
    }

    @Override
    public void submitDownloadJob(UUID jobId, URI sourceUri, String targetFormat, String targetQuality, ConversionOptions editOptions) {
        Path scratchDir = storageService.getScratchDirectory(jobId);
        DownloadTask task = new DownloadTask(jobId, sourceUri, targetFormat, targetQuality, maxFileSizeBytes, scratchDir, editOptions);
        activeTasks.put(jobId, task);

        // Update to QUEUED status
        jobRepository.findById(jobId).ifPresent(job -> {
            job.setStatus(JobStatus.QUEUED);
            jobRepository.save(job);
        });

        try { executorService.submit(() -> executeDownload(task)); }
        catch (java.util.concurrent.RejectedExecutionException ex) {
            activeTasks.remove(jobId);
            storageService.cleanupScratch(jobId);
            handleFailure(jobId, new IOException("Download queue is full. Please try again later."));
        }
        log.info("Submitted download job {} for host {} (hasEditOptions: {})", jobId, sourceUri.getHost(), editOptions != null);
    }

    private void executeDownload(DownloadTask task) {
        UUID jobId = task.getJobId();

        try {
            if (task.isCancelled()) {
                handleCancellation(jobId);
                return;
            }

            // Transition to PROCESSING
            MediaJob activeJob = jobRepository.findById(jobId).orElse(null);
            if (activeJob != null) {
                activeJob.setStatus(JobStatus.PROCESSING);
                activeJob.setStartedAt(OffsetDateTime.now());
                jobRepository.save(activeJob);

                eventRepository.save(new JobEvent(UUID.randomUUID(), activeJob,
                        "DOWNLOAD_STARTED", "Media stream download connection initiated"));
            }

            MediaSourceAdapter adapter = adapterRegistry.getAdapter(task.getSourceUri());

            DownloadedMedia downloadedMedia = adapter.download(task, progress -> {
                if (task.isCancelled()) return;
                // If edit options present, scale raw download progress up to 75%
                int rawPct = progress.getPercent();
                int effectivePct = (task.getEditOptions() != null) ? (int) (rawPct * 0.75) : rawPct;
                updateProgress(jobId, effectivePct);
            });

            if (task.isCancelled()) {
                handleCancellation(jobId);
                return;
            }

            Path finalFilePath = downloadedMedia.getFilePath();
            String finalContainerFormat = downloadedMedia.getContainerFormat();
            String finalMimeType = downloadedMedia.getMimeType();
            long finalFileSize = downloadedMedia.getFileSize();
            String requestedFormat = task.getTargetFormat();
            String outputFormat = requestedFormat == null || requestedFormat.isBlank()
                    ? finalContainerFormat : requestedFormat.toLowerCase(java.util.Locale.ROOT);
            boolean needsConversion = !outputFormat.equalsIgnoreCase(finalContainerFormat);
            var sourceProbe = outputVerifier.inspect(finalFilePath);
            boolean audioExpected = !DownloadOutputVerifier.isAudio(outputFormat)
                    && (downloadedMedia.isAudioExpected() || sourceProbe.hasAudio());
            if (task.getEditOptions() != null && Boolean.TRUE.equals(task.getEditOptions().getRemoveAudio())) {
                audioExpected = false;
            }
            if (!DownloadOutputVerifier.isAudio(outputFormat) && !sourceProbe.hasVideo()) {
                throw new IOException("Requested video, but the downloaded source contains only audio. Video output cannot be created.");
            }

            // Post-download editing / conversion if options were requested
            boolean needsEdits = task.getEditOptions() != null
                    && (!downloadedMedia.isSelectionApplied() || hasContentEdits(task.getEditOptions()));
            if (needsConversion || needsEdits) {
                if (mediaConversionService == null) {
                    throw new IllegalStateException("Media conversion is unavailable for the requested format.");
                }
                log.info("Applying post-download media editing with FFmpeg for job {}", jobId);
                if (activeJob != null) {
                    eventRepository.save(new JobEvent(UUID.randomUUID(), activeJob,
                            "EDIT_STARTED", "Post-download media editing and transcoding initiated"));
                }

                File scratchEditOutput = new File(task.getOutputPath().toFile(), "edited_" + UUID.randomUUID() + "." + outputFormat);
                try {
                    ConversionResult editResult = mediaConversionService.convert(
                            jobId,
                            downloadedMedia.getFilePath().toFile(),
                            scratchEditOutput,
                            outputFormat,
                            task.getEditOptions() != null ? task.getEditOptions() : new ConversionOptions(),
                            convProgress -> {
                                if (!task.isCancelled()) {
                                    // Scale editing progress between 75% and 99%
                                    int p = Math.min(99, 75 + (int) (convProgress.getProgress() * 0.24));
                                    updateProgress(jobId, p);
                                }
                            }
                    );
                    if (editResult.isSuccess() && scratchEditOutput.exists() && scratchEditOutput.length() > 0) {
                        finalFilePath = scratchEditOutput.toPath();
                        finalContainerFormat = outputFormat;
                        finalFileSize = scratchEditOutput.length();
                        if (editResult.getMimeType() != null) {
                            finalMimeType = editResult.getMimeType();
                        }
                    } else {
                        throw new IOException("Media conversion did not produce the requested output.");
                    }
                } catch (Exception editEx) {
                    log.error("Post-download editing failed for job {}: {}", jobId, editEx.getMessage(), editEx);
                    throw new RuntimeException("Post-download media editing failed: " + editEx.getMessage(), editEx);
                }
            }

            // Verify the final bytes after all edits, before persisting a successful output.
            outputVerifier.verify(finalFilePath, outputFormat, audioExpected);
            finalFileSize = java.nio.file.Files.size(finalFilePath);
            finalMimeType = DownloadOutputVerifier.mimeType(outputFormat);
            if (task.isCancelled()) {
                handleCancellation(jobId);
                return;
            }
            // Store file into storage and complete job
            MediaJob job = jobRepository.findById(jobId).orElse(null);
            if (job != null) {
                try {
                    MediaFile savedFile = storageService.storeDownloadedFile(
                            job,
                            downloadedMedia.getOriginalFilename().replaceFirst("\\.[^.]+$", "") + "." + finalContainerFormat,
                            finalFilePath,
                            finalMimeType,
                            finalFileSize
                    );

                    job.setStatus(JobStatus.COMPLETED);
                    job.setProgress(100);
                    job.setOutputFormat(finalContainerFormat);
                    job.setOutputFileId(savedFile.getId());
                    job.setCompletedAt(OffsetDateTime.now());
                    jobRepository.save(job);

                    eventRepository.save(new JobEvent(UUID.randomUUID(), job,
                            "DOWNLOAD_COMPLETED",
                            String.format("Media file saved successfully: %s (%d bytes)",
                                    savedFile.getStoredFilename(), savedFile.getFileSize())));

                    log.info("Job {} successfully completed, stored file id: {}", jobId, savedFile.getId());
                } catch (Exception e) {
                    throw new RuntimeException("Failed to store downloaded file: " + e.getMessage(), e);
                }
            }

        } catch (Exception ex) {
            if (task.isCancelled()) {
                handleCancellation(jobId);
            } else {
                handleFailure(jobId, ex);
            }
        } finally {
            try { storageService.cleanupScratch(jobId); }
            finally { activeTasks.remove(jobId); }
        }
    }

    private void updateProgress(UUID jobId, int percent) {
        try {
            jobRepository.findById(jobId).ifPresent(job -> {
                if (job.getStatus() == JobStatus.PROCESSING && job.getProgress() != percent) {
                    job.setProgress(Math.max(job.getProgress(), Math.min(99, percent)));
                    jobRepository.save(job);
                }
            });
        } catch (Exception ex) {
            log.debug("Progress update skipped for job {}: {}", jobId, ex.getMessage());
        }
    }

    private static boolean hasContentEdits(ConversionOptions options) {
        // Resolution/bitrate alone have already been applied by the extractor's verified normalization.
        return options.hasTrim() || options.hasCut() || options.hasCrop()
                || options.getAspectRatio() != null && !"original".equals(options.getAspectRatio())
                || options.getQualityPreset() != null || options.getVideoBitrate() != null
                || options.getCrf() != null || options.getFrameRate() != null
                || options.getVideoCodec() != null || options.getAudioCodec() != null
                || Boolean.TRUE.equals(options.getRemoveAudio()) || Boolean.TRUE.equals(options.getRemoveSilence())
                || options.getVolume() != null && Math.abs(options.getVolume() - 1.0) > 0.01
                || options.getFadeInDuration() != null && options.getFadeInDuration() > 0
                || options.getFadeOutDuration() != null && options.getFadeOutDuration() > 0;
    }

    private void handleCancellation(UUID jobId) {
        log.info("Handling cancellation for job: {}", jobId);
        jobRepository.findById(jobId).ifPresent(job -> {
            job.setStatus(JobStatus.CANCELLED);
            job.setCompletedAt(OffsetDateTime.now());
            jobRepository.save(job);

            eventRepository.save(new JobEvent(UUID.randomUUID(), job,
                    "DOWNLOAD_CANCELLED", "Media download was cancelled by user"));
        });
    }

    private void handleFailure(UUID jobId, Exception ex) {
        String safeMessage = ExtractorErrors.redact(ex.getMessage());
        log.error("Download job {} failed ({}): {}", jobId, ex.getClass().getSimpleName(), safeMessage);
        jobRepository.findById(jobId).ifPresent(job -> {
            job.setStatus(JobStatus.FAILED);
            job.setErrorMessage(safeMessage);
            job.setCompletedAt(OffsetDateTime.now());
            jobRepository.save(job);

            eventRepository.save(new JobEvent(UUID.randomUUID(), job,
                    "DOWNLOAD_FAILED", "Media download failed: " + safeMessage));
        });
    }

    @Override
    public boolean cancelActiveDownload(UUID jobId) {
        DownloadTask task = activeTasks.get(jobId);
        if (task != null) {
            task.cancel();
            if (ytDlpExecutor != null) {
                ytDlpExecutor.cancel(jobId);
            }
            handleCancellation(jobId);
            return true;
        }
        return false;
    }

    @Override
    public boolean isJobActive(UUID jobId) {
        return activeTasks.containsKey(jobId);
    }

    @PreDestroy
    public void shutdown() {
        log.info("Shutting down MediaDownloadService executor pool...");
        executorService.shutdown();
        try {
            if (!executorService.awaitTermination(5, TimeUnit.SECONDS)) {
                executorService.shutdownNow();
            }
        } catch (InterruptedException e) {
            executorService.shutdownNow();
            Thread.currentThread().interrupt();
        }
    }
}
