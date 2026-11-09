package com.mediaforge.backend.controller;

import com.mediaforge.backend.dto.request.DownloadCreateRequest;
import com.mediaforge.backend.dto.request.DownloadValidateRequest;
import com.mediaforge.backend.dto.response.DownloadResponse;
import com.mediaforge.backend.dto.response.DownloadValidateResponse;
import com.mediaforge.backend.service.DownloadService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/downloads")
@Tag(name = "Media Downloader", description = "Endpoints for validating media URLs and initiating downloads")
public class DownloadController {

    private final DownloadService downloadService;

    public DownloadController(DownloadService downloadService) {
        this.downloadService = downloadService;
    }

    @PostMapping("/validate")
    @Operation(summary = "Validate media URL and retrieve format options",
            description = "Validates URL format, ensures SSRF protection, and retrieves supported format/quality selections")
    public ResponseEntity<DownloadValidateResponse> validateUrl(@Valid @RequestBody DownloadValidateRequest request) {
        DownloadValidateResponse response = downloadService.validateUrl(request);
        return ResponseEntity.ok(response);
    }

    @PostMapping
    @Operation(summary = "Submit a media download job",
            description = "Validates the URL, creates a persistent download job, and enqueues the request")
    public ResponseEntity<DownloadResponse> createDownload(@Valid @RequestBody DownloadCreateRequest request) {
        DownloadResponse response = downloadService.createDownload(request, null);
        return ResponseEntity.status(HttpStatus.ACCEPTED).body(response);
    }
}
