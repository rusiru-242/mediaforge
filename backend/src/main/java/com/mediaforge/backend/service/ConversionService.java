package com.mediaforge.backend.service;

import com.mediaforge.backend.dto.request.ConversionCreateRequest;
import com.mediaforge.backend.dto.response.ConversionResponse;

import java.util.UUID;

public interface ConversionService {
    ConversionResponse createConversion(ConversionCreateRequest request, UUID requestingUserId);
}

