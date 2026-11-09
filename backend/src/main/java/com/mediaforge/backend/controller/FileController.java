package com.mediaforge.backend.controller;

import com.mediaforge.backend.downloader.service.MediaStorageService;
import com.mediaforge.backend.dto.response.FileMetadataResponse;
import com.mediaforge.backend.entity.MediaFile;
import com.mediaforge.backend.service.FileService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.core.io.Resource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.io.IOException;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/files")
@Tag(name = "File Management", description = "Endpoints for inspecting stored media file metadata and downloading media")
public class FileController {

    private final FileService fileService;
    private final MediaStorageService storageService;

    public FileController(FileService fileService, MediaStorageService storageService) {
        this.fileService = fileService;
        this.storageService = storageService;
    }

    @GetMapping("/{id}/metadata")
    @Operation(summary = "Get file metadata by ID", description = "Retrieves technical metadata, MIME type, and expiration for a file")
    public ResponseEntity<FileMetadataResponse> getFileMetadata(
            @Parameter(description = "UUID of the media file") @PathVariable UUID id) {
        FileMetadataResponse response = fileService.getFileMetadata(id);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/{id}/download")
    @Operation(summary = "Download stored media file", description = "Streams the downloaded or processed media file with Content-Disposition headers")
    public ResponseEntity<Resource> downloadFile(
            @Parameter(description = "UUID of the media file") @PathVariable UUID id) throws IOException {
        MediaFile file = storageService.getMediaFile(id);
        Resource resource = storageService.loadAsResource(id);

        String filename = file.getOriginalFilename();
        if (filename == null || filename.isBlank()) {
            filename = file.getStoredFilename();
        }

        MediaType mediaType;
        try {
            mediaType = MediaType.parseMediaType(file.getMimeType());
        } catch (Exception e) {
            mediaType = MediaType.APPLICATION_OCTET_STREAM;
        }

        return ResponseEntity.ok()
                .contentType(mediaType)
                .contentLength(file.getFileSize())
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + filename + "\"")
                .body(resource);
    }
}
