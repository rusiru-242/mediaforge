package com.mediaforge.backend.downloader.service;

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
import org.springframework.stereotype.Service;
import org.springframework.transaction.support.TransactionTemplate;

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
    private final TransactionTemplate transactionTemplate;
    private final ExecutorService executorService;
    private final Map<UUID, DownloadTask> activeTasks = new ConcurrentHashMap<>();

    @Value("${app.downloader.max-file-size-bytes:524288000}")
    private long maxFileSizeBytes;

    public MediaDownloadServiceImpl(
            MediaSourceAdapterRegistry adapterRegistry,
            MediaStorageService storageService,
            MediaJobRepository jobRepository,
            JobEventRepository eventRepository,
            TransactionTemplate transactionTemplate,
            @Value("${app.downloader.pool-size:5}") int poolSize) {
        this.adapterRegistry = adapterRegistry;
        this.storageService = storageService;
        this.jobRepository = jobRepository;
        this.eventRepository = eventRepository;
        this.transactionTemplate = transactionTemplate;
        this.executorService = Executors.newFixedThreadPool(Math.max(2, poolSize));
    }

    @Override
    public void submitDownloadJob(UUID jobId, URI sourceUri, String targetFormat, String targetQuality) {
        Path scratchDir = storageService.getScratchDirectory(jobId);
        DownloadTask task = new DownloadTask(jobId, sourceUri, targetFormat, targetQuality, maxFileSizeBytes, scratchDir);
        activeTasks.put(jobId, task);

        // Update to QUEUED status
        transactionTemplate.executeWithoutResult(status -> {
            jobRepository.findById(jobId).ifPresent(job -> {
                job.setStatus(JobStatus.QUEUED);
                jobRepository.save(job);
            });
        });

        executorService.submit(() -> executeDownload(task));
        log.info("Submitted download job {} to executor pool for source: {}", jobId, sourceUri);
    }

    private void executeDownload(DownloadTask task) {
        UUID jobId = task.getJobId();

        try {
            if (task.isCancelled()) {
                handleCancellation(jobId);
                return;
            }

            // Transition to PROCESSING
            transactionTemplate.executeWithoutResult(status -> {
                jobRepository.findById(jobId).ifPresent(job -> {
                    job.setStatus(JobStatus.PROCESSING);
                    job.setStartedAt(OffsetDateTime.now());
                    jobRepository.save(job);
                });
                eventRepository.save(new JobEvent(UUID.randomUUID(), jobRepository.getReferenceById(jobId),
                        "DOWNLOAD_STARTED", "Media stream download connection initiated"));
            });

            MediaSourceAdapter adapter = adapterRegistry.getAdapter(task.getSourceUri());

            DownloadedMedia downloadedMedia = adapter.download(task, progress -> {
                if (task.isCancelled()) return;
                updateProgress(jobId, progress.getPercent());
            });

            if (task.isCancelled()) {
                handleCancellation(jobId);
                return;
            }

            // Store file into storage and complete job
            transactionTemplate.executeWithoutResult(status -> {
                MediaJob job = jobRepository.findById(jobId).orElse(null);
                if (job == null) return;

                try {
                    MediaFile savedFile = storageService.storeDownloadedFile(
                            job,
                            downloadedMedia.getOriginalFilename(),
                            downloadedMedia.getFilePath(),
                            downloadedMedia.getMimeType(),
                            downloadedMedia.getFileSize()
                    );

                    job.setStatus(JobStatus.COMPLETED);
                    job.setProgress(100);
                    job.setOutputFormat(downloadedMedia.getContainerFormat());
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
            });

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
            transactionTemplate.executeWithoutResult(status -> {
                jobRepository.findById(jobId).ifPresent(job -> {
                    if (job.getStatus() == JobStatus.PROCESSING && job.getProgress() != percent) {
                        job.setProgress(percent);
                        jobRepository.save(job);
                    }
                });
            });
        } catch (Exception ex) {
            log.debug("Progress update skipped for job {}: {}", jobId, ex.getMessage());
        }
    }

    private void handleCancellation(UUID jobId) {
        log.info("Handling cancellation for job: {}", jobId);
        transactionTemplate.executeWithoutResult(status -> {
            jobRepository.findById(jobId).ifPresent(job -> {
                job.setStatus(JobStatus.CANCELLED);
                job.setCompletedAt(OffsetDateTime.now());
                jobRepository.save(job);
            });
            eventRepository.save(new JobEvent(UUID.randomUUID(), jobRepository.getReferenceById(jobId),
                    "DOWNLOAD_CANCELLED", "Download job was cancelled by user request"));
        });
    }

    private void handleFailure(UUID jobId, Throwable ex) {
        log.error("Download failed for job {}: {}", jobId, ex.getMessage());
        transactionTemplate.executeWithoutResult(status -> {
            jobRepository.findById(jobId).ifPresent(job -> {
                job.setStatus(JobStatus.FAILED);
                job.setErrorMessage(ex.getMessage() != null ? ex.getMessage() : "Unknown download failure");
                job.setCompletedAt(OffsetDateTime.now());
                jobRepository.save(job);
            });
            eventRepository.save(new JobEvent(UUID.randomUUID(), jobRepository.getReferenceById(jobId),
                    "DOWNLOAD_FAILED", "Download failed: " + ex.getMessage()));
        });
    }

    @Override
    public boolean cancelActiveDownload(UUID jobId) {
        DownloadTask task = activeTasks.get(jobId);
        if (task != null) {
            task.cancel();
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
        log.info("Shutting down media download worker thread pool...");
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

