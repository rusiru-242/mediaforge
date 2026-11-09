package com.mediaforge.backend.controller;

import com.mediaforge.backend.dto.response.FormatListResponse;
import com.mediaforge.backend.service.FormatService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/formats")
@Tag(name = "Format Catalog", description = "Endpoints for inspecting supported video, audio, and image formats")
public class FormatController {

    private final FormatService formatService;

    public FormatController(FormatService formatService) {
        this.formatService = formatService;
    }

    @GetMapping
    @Operation(summary = "Get all supported formats", description = "Returns complete catalog of video, audio, and image formats")
    public ResponseEntity<Map<String, List<String>>> getAllFormats() {
        return ResponseEntity.ok(formatService.getAllFormats());
    }

    @GetMapping("/video")
    @Operation(summary = "Get supported video formats", description = "Returns available video codecs and extensions")
    public ResponseEntity<FormatListResponse> getVideoFormats() {
        return ResponseEntity.ok(formatService.getVideoFormats());
    }

    @GetMapping("/audio")
    @Operation(summary = "Get supported audio formats", description = "Returns available audio codecs and extensions")
    public ResponseEntity<FormatListResponse> getAudioFormats() {
        return ResponseEntity.ok(formatService.getAudioFormats());
    }

    @GetMapping("/image")
    @Operation(summary = "Get supported image formats", description = "Returns available image types and extensions")
    public ResponseEntity<FormatListResponse> getImageFormats() {
        return ResponseEntity.ok(formatService.getImageFormats());
    }
}

