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

    ConversionResponse submitJob(ConversionCreateRequest request, UUID requestingUserId);

    BatchConversionResponse submitBatch(BatchConversionRequest request, UUID requestingUserId);

    ConversionProgressResponse getProgress(UUID jobId);

    boolean cancelJob(UUID jobId, UUID requestingUserId);

    Resource createBatchZip(UUID batchId) throws IOException;
}
