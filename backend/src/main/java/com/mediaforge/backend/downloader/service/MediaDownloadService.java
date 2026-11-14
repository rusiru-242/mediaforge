package com.mediaforge.backend.downloader.service;

import com.mediaforge.backend.converter.model.ConversionOptions;
import java.net.URI;
import java.util.UUID;

public interface MediaDownloadService {

    /**
     * Enqueues and begins asynchronous execution of a media download.
     */
    void submitDownloadJob(UUID jobId, URI sourceUri, String targetFormat, String targetQuality);

    default void submitDownloadJob(UUID jobId, URI sourceUri, String targetFormat, String targetQuality, ConversionOptions editOptions) {
        submitDownloadJob(jobId, sourceUri, targetFormat, targetQuality);
    }

    /**
     * Cancels an active or queued download job and releases file locks.
     */
    boolean cancelActiveDownload(UUID jobId);

    /**
     * Checks if a download is currently running in the worker pool.
     */
    boolean isJobActive(UUID jobId);
}
