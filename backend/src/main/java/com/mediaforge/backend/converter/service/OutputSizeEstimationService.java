package com.mediaforge.backend.converter.service;

import com.mediaforge.backend.dto.request.SizeEstimationRequest;
import com.mediaforge.backend.dto.response.SizeEstimationResponse;

public interface OutputSizeEstimationService {

    SizeEstimationResponse estimateSize(SizeEstimationRequest request);
}
