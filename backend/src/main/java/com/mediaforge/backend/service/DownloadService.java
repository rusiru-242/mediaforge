package com.mediaforge.backend.service;

import com.mediaforge.backend.dto.request.DownloadCreateRequest;
import com.mediaforge.backend.dto.request.DownloadValidateRequest;
import com.mediaforge.backend.dto.response.DownloadResponse;
import com.mediaforge.backend.dto.response.DownloadValidateResponse;

import java.util.UUID;

public interface DownloadService {
    DownloadValidateResponse validateUrl(DownloadValidateRequest request);
    DownloadResponse createDownload(DownloadCreateRequest request, UUID requestingUserId);
}
