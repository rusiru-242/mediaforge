package com.mediaforge.backend.controller;

import com.mediaforge.backend.dto.request.ConversionCreateRequest;
import com.mediaforge.backend.dto.response.ConversionResponse;
import com.mediaforge.backend.service.ConversionService;
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
        ConversionResponse response = conversionService.createConversion(request, null);
        return ResponseEntity.status(HttpStatus.ACCEPTED).body(response);
    }
}

