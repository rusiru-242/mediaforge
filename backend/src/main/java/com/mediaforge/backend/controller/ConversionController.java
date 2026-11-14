package com.mediaforge.backend.controller;

import com.mediaforge.backend.dto.request.BatchConversionRequest;
import com.mediaforge.backend.dto.request.ConversionCreateRequest;
import com.mediaforge.backend.dto.request.SizeEstimationRequest;
import com.mediaforge.backend.dto.response.BatchConversionResponse;
import com.mediaforge.backend.dto.response.ConversionResponse;
import com.mediaforge.backend.dto.response.SizeEstimationResponse;
import com.mediaforge.backend.service.ConversionService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.core.io.Resource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.io.IOException;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/conversions")
@Tag(name = "Media Converter", description = "Endpoints for initiating media transcoding and conversion jobs")
public class ConversionController {

    private final ConversionService conversionService;

    public ConversionController(ConversionService conversionService) {
        this.conversionService = conversionService;
    }

    @PostMapping
    @Operation(summary = "Submit a media conversion job",
            description = "Validates conversion options, persists the request, and initializes a background conversion job")
    public ResponseEntity<ConversionResponse> createConversion(@Valid @RequestBody ConversionCreateRequest request) {
        ConversionResponse response = conversionService.createConversion(request);
        return ResponseEntity.status(HttpStatus.ACCEPTED).body(response);
    }

    @PostMapping("/batch")
    @Operation(summary = "Submit a batch media conversion job",
            description = "Submits multiple media files for concurrent conversion under a common batch group")
    public ResponseEntity<BatchConversionResponse> createBatchConversion(@Valid @RequestBody BatchConversionRequest request) {
        BatchConversionResponse response = conversionService.createBatchConversion(request);
        return ResponseEntity.status(HttpStatus.ACCEPTED).body(response);
    }

    @PostMapping("/estimate-size")
    @Operation(summary = "Estimate output file size",
            description = "Calculates realistic output file size and range based on bitrate, duration, resolution, quality, and container overhead")
    public ResponseEntity<SizeEstimationResponse> estimateSize(@RequestBody SizeEstimationRequest request) {
        SizeEstimationResponse response = conversionService.estimateSize(request);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/formats")
    @Operation(summary = "Get supported converter formats and options",
            description = "Lists all supported video, audio, and image containers, codecs, and resolution options")
    public ResponseEntity<Map<String, Object>> getConversionFormats() {
        Map<String, Object> formats = Map.of(
                "videoFormats", List.of("mp4", "webm", "mkv", "mov", "avi"),
                "audioFormats", List.of("mp3", "wav", "aac", "flac", "m4a", "ogg"),
                "imageFormats", List.of("jpg", "jpeg", "png", "webp", "avif"),
                "resolutions", List.of("source", "1080p", "720p", "480p", "360p", "240p"),
                "videoBitrates", List.of("auto", "5000k", "2500k", "1000k", "500k"),
                "audioBitrates", List.of("auto", "320k", "256k", "192k", "128k", "64k"),
                "sampleRates", List.of(48000, 44100, 32000, 22050),
                "presets", List.of("ultrafast", "superfast", "veryfast", "faster", "fast", "medium", "slow")
        );
        return ResponseEntity.ok(formats);
    }

    @GetMapping("/batch/{batchId}/zip")
    @Operation(summary = "Download all converted files in batch as ZIP",
            description = "Packages all successfully completed conversion outputs of a batch into a downloadable ZIP archive")
    public ResponseEntity<Resource> downloadBatchZip(
            @Parameter(description = "UUID of the batch") @PathVariable UUID batchId) throws IOException {
        Resource zipResource = conversionService.createBatchZipResource(batchId);
        return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType("application/zip"))
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"batch_" + batchId + ".zip\"")
                .body(zipResource);
    }
}
