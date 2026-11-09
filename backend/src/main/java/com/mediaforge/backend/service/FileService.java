package com.mediaforge.backend.service;

import com.mediaforge.backend.dto.response.FileMetadataResponse;

import java.util.UUID;

public interface FileService {
    FileMetadataResponse getFileMetadata(UUID id);
}
