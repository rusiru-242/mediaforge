package com.mediaforge.backend.service;

import com.mediaforge.backend.dto.request.DownloadCreateRequest;
import com.mediaforge.backend.dto.request.DownloadValidateRequest;
import com.mediaforge.backend.dto.response.DownloadResponse;
import com.mediaforge.backend.dto.response.DownloadValidateResponse;
import com.mediaforge.backend.dto.response.MediaFormatOptionDto;
import com.mediaforge.backend.dto.response.MediaMetadataResponse;

import java.util.List;
import java.util.UUID;

public interface DownloadService {
    DownloadValidateResponse validateUrl(DownloadValidateRequest request);
    MediaMetadataResponse getMetadata(DownloadValidateRequest request);
    List<MediaFormatOptionDto> getFormats(String url);
    DownloadResponse createDownload(DownloadCreateRequest request);
    default DownloadResponse createDownload(DownloadCreateRequest request, UUID requestingUserId) {
        return createDownload(request);
    }
}
