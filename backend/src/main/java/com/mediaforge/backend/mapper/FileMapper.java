package com.mediaforge.backend.mapper;

import com.mediaforge.backend.dto.response.FileMetadataResponse;
import com.mediaforge.backend.entity.MediaFile;
import org.springframework.stereotype.Component;

@Component
public class FileMapper {

    public FileMetadataResponse toResponse(MediaFile file) {
        if (file == null) {
            return null;
        }

        return new FileMetadataResponse(
                file.getId(),
                file.getJob() != null ? file.getJob().getId() : null,
                file.getOriginalFilename(),
                file.getStoredFilename(),
                file.getMimeType(),
                file.getFileSize(),
                file.getCreatedAt(),
                file.getExpiresAt()
        );
    }
}

