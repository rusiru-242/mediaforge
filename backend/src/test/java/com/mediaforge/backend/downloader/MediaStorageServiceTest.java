package com.mediaforge.backend.downloader;

import com.mediaforge.backend.downloader.service.LocalStorageServiceImpl;
import com.mediaforge.backend.downloader.service.MediaStorageService;
import com.mediaforge.backend.entity.MediaFile;
import com.mediaforge.backend.entity.MediaJob;
import com.mediaforge.backend.enums.JobType;
import com.mediaforge.backend.enums.SourceType;
import com.mediaforge.backend.repository.MediaFileRepository;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.junit.jupiter.api.io.TempDir;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.core.io.Resource;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class MediaStorageServiceTest {

    @TempDir
    Path tempStorageDir;

    @Mock
    private MediaFileRepository mediaFileRepository;

    private MediaStorageService storageService;

    @BeforeEach
    void setUp() {
        storageService = new LocalStorageServiceImpl(
                tempStorageDir.toString(),
                24,
                mediaFileRepository
        );
    }

    @Test
    @DisplayName("Should create isolated scratch directory for job")
    void testGetScratchDirectory() {
        UUID jobId = UUID.randomUUID();
        Path scratch = storageService.getScratchDirectory(jobId);

        assertNotNull(scratch);
        assertTrue(Files.exists(scratch));
        assertTrue(scratch.startsWith(tempStorageDir));
    }

    @Test
    @DisplayName("Should safely store downloaded media and clean scratch")
    void testStoreDownloadedFile() throws IOException {
        UUID jobId = UUID.randomUUID();
        Path scratch = storageService.getScratchDirectory(jobId);
        Path sampleFile = scratch.resolve("video.mp4");
        Files.writeString(sampleFile, "dummy video content bytes");

        MediaJob job = new MediaJob(jobId, null, JobType.DOWNLOAD, SourceType.URL, null, "mp4");

        when(mediaFileRepository.save(any(MediaFile.class))).thenAnswer(invocation -> invocation.getArgument(0));

        MediaFile stored = storageService.storeDownloadedFile(job, "video.mp4", sampleFile, "video/mp4", 24L);

        assertNotNull(stored);
        assertEquals("video.mp4", stored.getOriginalFilename());
        assertEquals("video/mp4", stored.getMimeType());
        assertNotNull(stored.getExpiresAt());

        // Verify physical file was moved into media directory
        Path mediaDir = tempStorageDir.resolve("media");
        assertTrue(Files.exists(mediaDir.resolve(stored.getStoredFilename())));

        // Verify scratch cleanup
        storageService.cleanupScratch(jobId);
        assertFalse(Files.exists(scratch.resolve("video.mp4")));
    }

    @Test
    @DisplayName("Should purge expired media files based on retention policy")
    void testCleanupExpiredFiles() throws IOException {
        UUID expiredId = UUID.randomUUID();
        Path mediaDir = tempStorageDir.resolve("media");
        Path expiredFile = mediaDir.resolve(expiredId + ".mp4");
        Files.writeString(expiredFile, "expired media bytes");

        MediaFile expiredMediaFile = new MediaFile(
                expiredId,
                null,
                "old.mp4",
                expiredId + ".mp4",
                "media/" + expiredId + ".mp4",
                "video/mp4",
                100L,
                OffsetDateTime.now().minusHours(2) // Expired 2 hours ago
        );

        when(mediaFileRepository.findAll()).thenReturn(List.of(expiredMediaFile));

        int purged = storageService.cleanupExpiredFiles();

        assertEquals(1, purged);
        assertFalse(Files.exists(expiredFile));
        verify(mediaFileRepository, times(1)).delete(expiredMediaFile);
    }
}

