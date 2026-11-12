package com.mediaforge.backend.converter.service;

import com.mediaforge.backend.entity.MediaFile;
import org.springframework.core.io.Resource;
import org.springframework.web.multipart.MultipartFile;

import java.io.File;
import java.io.IOException;
import java.nio.file.Path;
import java.util.UUID;

public interface ConversionStorageService {

    /**
     * Stores an uploaded multipart file securely after verifying magic bytes, MIME, and path traversal.
     */
    MediaFile storeUploadedFile(MultipartFile file) throws IOException;

    /**
     * Resolves the real filesystem path for an existing stored MediaFile.
     */
    Path resolveFilePath(MediaFile mediaFile);

    /**
     * Creates a temporary scratch file for transcoding output.
     */
    File createScratchFile(UUID jobId, String outputExtension) throws IOException;

    /**
     * Atomically promotes a finished scratch file to permanent output storage and creates a MediaFile record.
     */
    MediaFile promoteToOutputFile(UUID jobId, File scratchFile, String originalFilename, String targetFormat, String mimeType) throws IOException;

    /**
     * Loads a stored media file as a Spring Resource for downloading.
     */
    Resource loadAsResource(UUID fileId) throws IOException;

    /**
     * Retrieves the MediaFile entity by ID.
     */
    MediaFile getMediaFile(UUID fileId);

    /**
     * Deletes temporary scratch files for a given job.
     */
    void deleteScratchFiles(UUID jobId);

    /**
     * Performs scheduled cleanup of files older than retention policy (24 hours).
     */
    void cleanupExpiredFiles();
}
