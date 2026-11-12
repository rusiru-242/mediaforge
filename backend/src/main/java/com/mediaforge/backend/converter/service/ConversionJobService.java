package com.mediaforge.backend.converter.service;

import com.mediaforge.backend.dto.request.BatchConversionRequest;
import com.mediaforge.backend.dto.request.ConversionCreateRequest;
import com.mediaforge.backend.dto.response.BatchConversionResponse;
import com.mediaforge.backend.dto.response.ConversionProgressResponse;
import com.mediaforge.backend.dto.response.ConversionResponse;
import org.springframework.core.io.Resource;

import java.io.IOException;
import java.util.UUID;

public interface ConversionJobService {

    ConversionResponse submitJob(ConversionCreateRequest request);
    default ConversionResponse submitJob(ConversionCreateRequest request, UUID unusedUserId) {
        return submitJob(request);
    }

    BatchConversionResponse submitBatch(BatchConversionRequest request);
    default BatchConversionResponse submitBatch(BatchConversionRequest request, UUID unusedUserId) {
        return submitBatch(request);
    }

    ConversionProgressResponse getProgress(UUID jobId);

    boolean cancelJob(UUID jobId);
    default boolean cancelJob(UUID jobId, UUID unusedUserId) {
        return cancelJob(jobId);
    }

    Resource createBatchZip(UUID batchId) throws IOException;
}
