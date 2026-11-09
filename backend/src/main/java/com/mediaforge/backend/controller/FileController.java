package com.mediaforge.backend.controller;

import com.mediaforge.backend.dto.response.FileMetadataResponse;
import com.mediaforge.backend.service.FileService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.UUID;

@RestController
@RequestMapping("/api/v1/files")
@Tag(name = "File Management", description = "Endpoints for inspecting stored media file metadata")
public class FileController {

    private final FileService fileService;

    public FileController(FileService fileService) {
        this.fileService = fileService;
    }

    @GetMapping("/{id}/metadata")
    @Operation(summary = "Get file metadata by ID", description = "Retrieves technical metadata, MIME type, and expiration for a file")
    public ResponseEntity<FileMetadataResponse> getFileMetadata(
            @Parameter(description = "UUID of the media file") @PathVariable UUID id) {
        FileMetadataResponse response = fileService.getFileMetadata(id);
        return ResponseEntity.ok(response);
    }
}
