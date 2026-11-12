package com.mediaforge.backend.converter.service;

import com.mediaforge.backend.entity.MediaFile;
import com.mediaforge.backend.entity.MediaJob;
import com.mediaforge.backend.repository.MediaFileRepository;
import com.mediaforge.backend.repository.MediaJobRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.util.ReflectionTestUtils;

import java.io.File;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

class ConversionStorageServiceTest {

    @Mock
    private MediaFileRepository fileRepository;

    @Mock
    private MediaJobRepository jobRepository;

    @TempDir
    Path tempDir;

    private ConversionStorageServiceImpl storageService;

    @BeforeEach
    void setUp() {
        MockitoAnnotations.openMocks(this);
        storageService = new ConversionStorageServiceImpl(fileRepository, jobRepository);
        ReflectionTestUtils.setField(storageService, "basePathStr", tempDir.toString());
        ReflectionTestUtils.setField(storageService, "retentionHours", 24);
        ReflectionTestUtils.setField(storageService, "maxFileSizeBytes", 10485760L);
        storageService.init();
    }

    @Test
    @DisplayName("Should successfully store valid media upload")
    void testStoreUploadedFileSuccess() throws IOException {
        byte[] validPng = new byte[]{(byte) 0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, 0, 0, 0, 0};
        MockMultipartFile file = new MockMultipartFile("file", "test.png", "image/png", validPng);

        when(fileRepository.save(any(MediaFile.class))).thenAnswer(i -> i.getArgument(0));

        MediaFile stored = storageService.storeUploadedFile(file);
        assertNotNull(stored);
        assertEquals("test.png", stored.getOriginalFilename());
        assertTrue(stored.getStoredFilename().endsWith(".png"));
    }

    @Test
    @DisplayName("Should reject executable files based on extension")
    void testRejectExecutableExtension() {
        byte[] content = new byte[]{1, 2, 3, 4, 5, 6, 7, 8};
        MockMultipartFile file = new MockMultipartFile("file", "malware.exe", "application/octet-stream", content);

        assertThrows(SecurityException.class, () -> storageService.storeUploadedFile(file));
    }

    @Test
    @DisplayName("Should reject Windows PE executable based on magic bytes")
    void testRejectExecutableMagicBytes() {
        byte[] peHeader = new byte[]{0x4D, 0x5A, 0, 0, 0, 0, 0, 0}; // MZ header
        MockMultipartFile file = new MockMultipartFile("file", "disguised.mp4", "video/mp4", peHeader);

        assertThrows(SecurityException.class, () -> storageService.storeUploadedFile(file));
    }

    @Test
    @DisplayName("Should create scratch file inside scratch directory")
    void testCreateScratchFile() throws IOException {
        UUID jobId = UUID.randomUUID();
        File scratch = storageService.createScratchFile(jobId, "mp4");
        assertNotNull(scratch);
        assertTrue(scratch.getAbsolutePath().contains("scratch"));
        assertTrue(scratch.getName().endsWith(".mp4"));
    }

    @Test
    @DisplayName("Should promote scratch file to output media file")
    void testPromoteToOutputFile() throws IOException {
        UUID jobId = UUID.randomUUID();
        MediaJob job = new MediaJob();
        job.setId(jobId);
        when(jobRepository.findById(jobId)).thenReturn(Optional.of(job));
        when(fileRepository.save(any(MediaFile.class))).thenAnswer(i -> i.getArgument(0));

        File scratch = storageService.createScratchFile(jobId, "mp3");
        Files.write(scratch.toPath(), "audio-bytes-data".getBytes());

        MediaFile promoted = storageService.promoteToOutputFile(jobId, scratch, "source.mp4", "mp3", "audio/mpeg");
        assertNotNull(promoted);
        assertEquals("source.mp3", promoted.getOriginalFilename());
        assertEquals("audio/mpeg", promoted.getMimeType());
        assertFalse(scratch.exists()); // atomically moved
    }
}
