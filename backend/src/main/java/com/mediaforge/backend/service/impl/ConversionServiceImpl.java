package com.mediaforge.backend.service.impl;

import com.mediaforge.backend.converter.service.ConversionJobService;
import com.mediaforge.backend.converter.service.OutputSizeEstimationService;
import com.mediaforge.backend.dto.request.BatchConversionRequest;
import com.mediaforge.backend.dto.request.ConversionCreateRequest;
import com.mediaforge.backend.dto.request.SizeEstimationRequest;
import com.mediaforge.backend.dto.response.BatchConversionResponse;
import com.mediaforge.backend.dto.response.ConversionProgressResponse;
import com.mediaforge.backend.dto.response.ConversionResponse;
import com.mediaforge.backend.dto.response.SizeEstimationResponse;
import com.mediaforge.backend.service.ConversionService;
import org.springframework.core.io.Resource;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.util.UUID;

@Service
public class ConversionServiceImpl implements ConversionService {

    private final ConversionJobService conversionJobService;
    private final OutputSizeEstimationService estimationService;

    public ConversionServiceImpl(ConversionJobService conversionJobService,
                                 OutputSizeEstimationService estimationService) {
        this.conversionJobService = conversionJobService;
        this.estimationService = estimationService;
    }

    @Override
    public ConversionResponse createConversion(ConversionCreateRequest request) {
        return conversionJobService.submitJob(request);
    }

    @Override
    public BatchConversionResponse createBatchConversion(BatchConversionRequest request) {
        return conversionJobService.submitBatch(request);
    }

    @Override
    public ConversionProgressResponse getConversionProgress(UUID jobId) {
        return conversionJobService.getProgress(jobId);
    }

    @Override
    public void cancelConversion(UUID jobId) {
        conversionJobService.cancelJob(jobId);
    }

    @Override
    public Resource createBatchZipResource(UUID batchId) throws IOException {
        return conversionJobService.createBatchZip(batchId);
    }

    @Override
    public SizeEstimationResponse estimateSize(SizeEstimationRequest request) {
        return estimationService.estimateSize(request);
    }
}
