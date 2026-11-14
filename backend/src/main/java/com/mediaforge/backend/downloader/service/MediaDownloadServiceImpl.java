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

    @org.springframework.beans.factory.annotation.Autowired
    public MediaDownloadServiceImpl(
            MediaSourceAdapterRegistry adapterRegistry,
            MediaStorageService storageService,
            MediaJobRepository jobRepository,
            JobEventRepository eventRepository,
            @Value("${app.downloader.pool-size:5}") int poolSize,
            @Nullable YtDlpProcessExecutor ytDlpExecutor,
            @Nullable MediaConversionService mediaConversionService) {
        this.adapterRegistry = adapterRegistry;
        this.storageService = storageService;
        this.jobRepository = jobRepository;
        this.eventRepository = eventRepository;
        this.ytDlpExecutor = ytDlpExecutor;
        this.mediaConversionService = mediaConversionService;
        this.executorService = Executors.newFixedThreadPool(Math.max(2, poolSize));
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

        executorService.submit(() -> executeDownload(task));
        log.info("Submitted download job {} to executor pool for source: {} (hasEditOptions: {})",
                jobId, sourceUri, editOptions != null);
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

            // Post-download editing / conversion if options were requested
            if (task.getEditOptions() != null && mediaConversionService != null) {
                log.info("Applying post-download media editing with FFmpeg for job {}", jobId);
                if (activeJob != null) {
                    eventRepository.save(new JobEvent(UUID.randomUUID(), activeJob,
                            "EDIT_STARTED", "Post-download media editing and transcoding initiated"));
                }

                File scratchEditOutput = new File(task.getOutputPath().toFile(), "edited_" + UUID.randomUUID() + "." + finalContainerFormat);
                try {
                    ConversionResult editResult = mediaConversionService.convert(
                            jobId,
                            downloadedMedia.getFilePath().toFile(),
                            scratchEditOutput,
                            finalContainerFormat,
                            task.getEditOptions(),
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
                        finalFileSize = scratchEditOutput.length();
                        if (editResult.getMimeType() != null) {
                            finalMimeType = editResult.getMimeType();
                        }
                    }
                } catch (Exception editEx) {
                    log.error("Post-download editing failed for job {}: {}", jobId, editEx.getMessage(), editEx);
                    throw new RuntimeException("Post-download media editing failed: " + editEx.getMessage(), editEx);
                }
            }

            // Store file into storage and complete job
            MediaJob job = jobRepository.findById(jobId).orElse(null);
            if (job != null) {
                try {
                    MediaFile savedFile = storageService.storeDownloadedFile(
                            job,
                            downloadedMedia.getOriginalFilename(),
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
            activeTasks.remove(jobId);
            storageService.cleanupScratch(jobId);
        }
    }

    private void updateProgress(UUID jobId, int percent) {
        try {
            jobRepository.findById(jobId).ifPresent(job -> {
                if (job.getStatus() == JobStatus.PROCESSING && job.getProgress() != percent) {
                    job.setProgress(percent);
                    jobRepository.save(job);
                }
            });
        } catch (Exception ex) {
            log.debug("Progress update skipped for job {}: {}", jobId, ex.getMessage());
        }
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
        log.error("Download job failed: {}", jobId, ex);
        jobRepository.findById(jobId).ifPresent(job -> {
            job.setStatus(JobStatus.FAILED);
            job.setErrorMessage(ex.getMessage() != null ? ex.getMessage() : "Unknown download failure");
            job.setCompletedAt(OffsetDateTime.now());
            jobRepository.save(job);

            eventRepository.save(new JobEvent(UUID.randomUUID(), job,
                    "DOWNLOAD_FAILED", "Media download failed: " + ex.getMessage()));
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
