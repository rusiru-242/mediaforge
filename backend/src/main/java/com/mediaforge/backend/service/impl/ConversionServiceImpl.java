package com.mediaforge.backend.service.impl;

import com.mediaforge.backend.converter.service.ConversionJobService;
import com.mediaforge.backend.dto.request.BatchConversionRequest;
import com.mediaforge.backend.dto.request.ConversionCreateRequest;
import com.mediaforge.backend.dto.response.BatchConversionResponse;
import com.mediaforge.backend.dto.response.ConversionProgressResponse;
import com.mediaforge.backend.dto.response.ConversionResponse;
import com.mediaforge.backend.service.ConversionService;
import org.springframework.core.io.Resource;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.io.IOException;
import java.util.UUID;

@Service
@Transactional
public class ConversionServiceImpl implements ConversionService {

    private final ConversionJobService conversionJobService;

    public ConversionServiceImpl(ConversionJobService conversionJobService) {
        this.conversionJobService = conversionJobService;
    }

    @Override
    public ConversionResponse createConversion(ConversionCreateRequest request, UUID requestingUserId) {
        return conversionJobService.submitJob(request, requestingUserId);
    }

    @Override
    public BatchConversionResponse createBatchConversion(BatchConversionRequest request, UUID requestingUserId) {
        return conversionJobService.submitBatch(request, requestingUserId);
    }

    @Override
    public ConversionProgressResponse getConversionProgress(UUID jobId) {
        return conversionJobService.getProgress(jobId);
    }

    @Override
    public void cancelConversion(UUID jobId, UUID requestingUserId) {
        conversionJobService.cancelJob(jobId, requestingUserId);
    }

    @Override
    public Resource createBatchZipResource(UUID batchId) throws IOException {
        return conversionJobService.createBatchZip(batchId);
    }
}
