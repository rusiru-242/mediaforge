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

    ConversionResponse createConversion(ConversionCreateRequest request);
    default ConversionResponse createConversion(ConversionCreateRequest request, UUID unusedUserId) {
        return createConversion(request);
    }

    BatchConversionResponse createBatchConversion(BatchConversionRequest request);
    default BatchConversionResponse createBatchConversion(BatchConversionRequest request, UUID unusedUserId) {
        return createBatchConversion(request);
    }

    ConversionProgressResponse getConversionProgress(UUID jobId);

    void cancelConversion(UUID jobId);
    default void cancelConversion(UUID jobId, UUID unusedUserId) {
        cancelConversion(jobId);
    }

    Resource createBatchZipResource(UUID batchId) throws IOException;
}
