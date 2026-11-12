package com.mediaforge.backend.service;

import com.mediaforge.backend.dto.request.BatchConversionRequest;
import com.mediaforge.backend.dto.request.ConversionCreateRequest;
import com.mediaforge.backend.dto.response.BatchConversionResponse;
import com.mediaforge.backend.dto.response.ConversionProgressResponse;
import com.mediaforge.backend.dto.response.ConversionResponse;
import org.springframework.core.io.Resource;

import java.io.IOException;
import java.util.UUID;

public interface ConversionService {

    ConversionResponse createConversion(ConversionCreateRequest request, UUID requestingUserId);

    BatchConversionResponse createBatchConversion(BatchConversionRequest request, UUID requestingUserId);

    ConversionProgressResponse getConversionProgress(UUID jobId);

    void cancelConversion(UUID jobId, UUID requestingUserId);

    Resource createBatchZipResource(UUID batchId) throws IOException;
}
