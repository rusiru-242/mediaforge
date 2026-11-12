package com.mediaforge.backend.controller;

import com.mediaforge.backend.dto.request.DownloadCreateRequest;
import com.mediaforge.backend.dto.request.DownloadValidateRequest;
import com.mediaforge.backend.dto.response.DownloadResponse;
import com.mediaforge.backend.dto.response.DownloadValidateResponse;
import com.mediaforge.backend.dto.response.MediaFormatOptionDto;
import com.mediaforge.backend.dto.response.MediaMetadataResponse;
import com.mediaforge.backend.service.DownloadService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/downloads")
@Tag(name = "Media Downloader", description = "Endpoints for validating media URLs, extracting metadata, and initiating downloads")
public class DownloadController {

    private final DownloadService downloadService;

    public DownloadController(DownloadService downloadService) {
        this.downloadService = downloadService;
    }

    @PostMapping("/validate")
    @Operation(summary = "Validate media URL and retrieve basic options",
            description = "Validates URL format, ensures SSRF protection, and retrieves supported format/quality selections")
    public ResponseEntity<DownloadValidateResponse> validateUrl(@Valid @RequestBody DownloadValidateRequest request) {
        DownloadValidateResponse response = downloadService.validateUrl(request);
        return ResponseEntity.ok(response);
    }

    @PostMapping("/metadata")
    @Operation(summary = "Extract real media metadata",
            description = "Probes the media source securely to retrieve genuine title, file size, dimensions, resolution, and available streams")
    public ResponseEntity<MediaMetadataResponse> getMetadata(@Valid @RequestBody DownloadValidateRequest request) {
        MediaMetadataResponse response = downloadService.getMetadata(request);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/formats")
    @Operation(summary = "Get available formats for a URL",
            description = "Returns the genuine format and quality options available for the given media URL")
    public ResponseEntity<List<MediaFormatOptionDto>> getFormats(
            @Parameter(description = "URL of the media stream") @RequestParam(required = false) String url) {
        List<MediaFormatOptionDto> formats = downloadService.getFormats(url);
        return ResponseEntity.ok(formats);
    }

    @PostMapping
    @Operation(summary = "Submit a media download job",
            description = "Validates the URL, creates an in-memory download job, and begins asynchronous downloading")
    public ResponseEntity<DownloadResponse> createDownload(@Valid @RequestBody DownloadCreateRequest request) {
        DownloadResponse response = downloadService.createDownload(request);
        return ResponseEntity.status(HttpStatus.ACCEPTED).body(response);
    }
}
