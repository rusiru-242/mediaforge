package com.mediaforge.backend.downloader.service;

import com.mediaforge.backend.entity.MediaFile;
import com.mediaforge.backend.entity.MediaJob;
import org.springframework.core.io.Resource;

import java.io.IOException;
import java.nio.file.Path;
import java.util.UUID;

public interface MediaStorageService {

    /**
     * Allocates a secure scratch directory for active downloads.
     */
    Path getScratchDirectory(UUID jobId);

    /**
     * Persists a downloaded file into permanent ephemeral storage.
     */
    MediaFile storeDownloadedFile(MediaJob job, String originalFilename, Path tempFilePath, String mimeType, long fileSize) throws IOException;

    /**
     * Resolves a stored media file for download.
     */
    Resource loadAsResource(UUID fileId) throws IOException;

    /**
     * Resolves a media file entity by ID.
     */
    MediaFile getMediaFile(UUID fileId);

    /**
     * Deletes temporary scratch files for a given job.
     */
    void cleanupScratch(UUID jobId);

    /**
     * Purges expired media files from disk and database.
     */
    int cleanupExpiredFiles();
}

