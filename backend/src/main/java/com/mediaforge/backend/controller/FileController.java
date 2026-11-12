package com.mediaforge.backend.controller;

import com.mediaforge.backend.converter.service.ConversionStorageService;
import com.mediaforge.backend.downloader.service.MediaStorageService;
import com.mediaforge.backend.dto.response.FileMetadataResponse;
import com.mediaforge.backend.dto.response.FileUploadResponse;
import com.mediaforge.backend.entity.MediaFile;
import com.mediaforge.backend.service.FileService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.core.io.Resource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/files")
@Tag(name = "File Management", description = "Endpoints for inspecting stored media file metadata, uploading files, and downloading processed media")
public class FileController {

    private final FileService fileService;
    private final MediaStorageService downloaderStorageService;
    private final ConversionStorageService conversionStorageService;

    public FileController(FileService fileService,
                          MediaStorageService downloaderStorageService,
                          ConversionStorageService conversionStorageService) {
        this.fileService = fileService;
        this.downloaderStorageService = downloaderStorageService;
        this.conversionStorageService = conversionStorageService;
    }

    @PostMapping(value = "/upload", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @Operation(summary = "Upload media file for conversion", description = "Securely uploads media file, verifying magic bytes, MIME type, and rejecting executables")
    public ResponseEntity<FileUploadResponse> uploadFile(@RequestParam("file") MultipartFile file) throws IOException {
        MediaFile saved = conversionStorageService.storeUploadedFile(file);
        String mediaType = determineMediaType(saved.getMimeType());

        FileUploadResponse response = new FileUploadResponse(
                saved.getId(),
                saved.getOriginalFilename(),
                saved.getStoredFilename(),
                saved.getMimeType(),
                saved.getFileSize(),
                mediaType,
                saved.getCreatedAt()
        );
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @GetMapping("/{id}/metadata")
    @Operation(summary = "Get file metadata by ID", description = "Retrieves technical metadata, MIME type, and expiration for a file")
    public ResponseEntity<FileMetadataResponse> getFileMetadata(
            @Parameter(description = "UUID of the media file") @PathVariable UUID id) {
        FileMetadataResponse response = fileService.getFileMetadata(id);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/{id}/download")
    @Operation(summary = "Download stored media file", description = "Streams the downloaded or converted media file with Content-Disposition headers. Optional access token validates short-lived download authorization.")
    public ResponseEntity<Resource> downloadFile(
            @Parameter(description = "UUID of the media file") @PathVariable UUID id,
            @Parameter(description = "Optional short-lived access token") @RequestParam(required = false) String token) throws IOException {
        MediaFile file;
        Resource resource;

        try {
            file = conversionStorageService.getMediaFile(id);
            resource = conversionStorageService.loadAsResource(id);
        } catch (Exception e) {
            file = downloaderStorageService.getMediaFile(id);
            resource = downloaderStorageService.loadAsResource(id);
        }

        if (token != null && !token.isBlank() && file.getAccessToken() != null) {
            if (!file.getAccessToken().equals(token)) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
            }
        }

        String filename = file.getOriginalFilename();
        if (filename == null || filename.isBlank()) {
            filename = file.getStoredFilename();
        }

        MediaType mediaType;
        try {
            mediaType = MediaType.parseMediaType(file.getMimeType());
        } catch (Exception ex) {
            mediaType = MediaType.APPLICATION_OCTET_STREAM;
        }

        return ResponseEntity.ok()
                .contentType(mediaType)
                .contentLength(file.getFileSize())
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + filename + "\"")
                .body(resource);
    }

    private String determineMediaType(String mimeType) {
        if (mimeType == null) return "UNKNOWN";
        if (mimeType.startsWith("video/")) return "VIDEO";
        if (mimeType.startsWith("audio/")) return "AUDIO";
        if (mimeType.startsWith("image/")) return "IMAGE";
        return "DOCUMENT";
    }
}
