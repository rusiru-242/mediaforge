package com.mediaforge.backend.service.impl;

import com.mediaforge.backend.dto.response.FileMetadataResponse;
import com.mediaforge.backend.entity.MediaFile;
import com.mediaforge.backend.exception.ResourceNotFoundException;
import com.mediaforge.backend.mapper.FileMapper;
import com.mediaforge.backend.repository.MediaFileRepository;
import com.mediaforge.backend.service.FileService;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

@Service
@Transactional(readOnly = true)
public class FileServiceImpl implements FileService {

    private final MediaFileRepository fileRepository;
    private final FileMapper fileMapper;

    public FileServiceImpl(MediaFileRepository fileRepository, FileMapper fileMapper) {
        this.fileRepository = fileRepository;
        this.fileMapper = fileMapper;
    }

    @Override
    public FileMetadataResponse getFileMetadata(UUID id) {
        MediaFile file = fileRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Media file metadata not found for id: " + id));
        return fileMapper.toResponse(file);
    }
}
