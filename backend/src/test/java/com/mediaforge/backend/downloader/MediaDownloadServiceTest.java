package com.mediaforge.backend.downloader;

import com.mediaforge.backend.downloader.adapter.MediaSourceAdapter;
import com.mediaforge.backend.downloader.adapter.MediaSourceAdapterRegistry;
import com.mediaforge.backend.downloader.model.DownloadedMedia;
import com.mediaforge.backend.downloader.service.MediaDownloadService;
import com.mediaforge.backend.downloader.service.MediaDownloadServiceImpl;
import com.mediaforge.backend.downloader.service.MediaStorageService;
import com.mediaforge.backend.entity.MediaFile;
import com.mediaforge.backend.entity.MediaJob;
import com.mediaforge.backend.enums.JobStatus;
import com.mediaforge.backend.enums.JobType;
import com.mediaforge.backend.enums.SourceType;
import com.mediaforge.backend.repository.JobEventRepository;
import com.mediaforge.backend.repository.MediaJobRepository;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.junit.jupiter.api.io.TempDir;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.io.IOException;
import java.net.URI;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.OffsetDateTime;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class MediaDownloadServiceTest {

    @TempDir
    Path tempDir;

    @Mock
    private MediaSourceAdapterRegistry adapterRegistry;

    @Mock
    private MediaSourceAdapter mockAdapter;

    @Mock
    private MediaStorageService storageService;

    @Mock
    private MediaJobRepository jobRepository;

    @Mock
    private JobEventRepository eventRepository;

    private MediaDownloadServiceImpl downloadService;

    @BeforeEach
    void setUp() {
        downloadService = new MediaDownloadServiceImpl(
                adapterRegistry,
                storageService,
                jobRepository,
                eventRepository,
                2
        );
    }

    @AfterEach
    void tearDown() {
        downloadService.shutdown();
    }

    @Test
    @DisplayName("Should submit and execute media download job asynchronously")
    void testSubmitDownloadJobSuccess() throws Exception {
        UUID jobId = UUID.randomUUID();
        URI uri = URI.create("https://example.com/stream.mp4");

        MediaJob job = new MediaJob(jobId, null, JobType.DOWNLOAD, SourceType.URL, null, "mp4");
        job.setStatus(JobStatus.PENDING);

        when(jobRepository.findById(jobId)).thenReturn(Optional.of(job));
        when(storageService.getScratchDirectory(jobId)).thenReturn(tempDir);
        when(adapterRegistry.getAdapter(uri)).thenReturn(mockAdapter);

        Path sampleOutput = tempDir.resolve("downloaded.mp4");
        Files.writeString(sampleOutput, "sample video bytes");

        DownloadedMedia media = new DownloadedMedia(sampleOutput, "stream.mp4", "stored.mp4", "video/mp4", 18L, "mp4");
        when(mockAdapter.download(any(), any())).thenReturn(media);

        MediaFile mockStoredFile = new MediaFile(UUID.randomUUID(), job, "stream.mp4", "stored.mp4", "media/stored.mp4", "video/mp4", 18L, OffsetDateTime.now().plusHours(24));
        when(storageService.storeDownloadedFile(any(), any(), any(), any(), anyLong())).thenReturn(mockStoredFile);

        downloadService.submitDownloadJob(jobId, uri, "mp4", "1080p");

        // Wait up to 3 seconds for async execution to complete
        int waited = 0;
        while (downloadService.isJobActive(jobId) && waited < 30) {
            Thread.sleep(100);
            waited++;
        }

        assertEquals(JobStatus.COMPLETED, job.getStatus());
        assertEquals(100, job.getProgress());
        verify(storageService, times(1)).storeDownloadedFile(any(), any(), any(), any(), anyLong());
    }

    @Test
    @DisplayName("Should cancel active download task when requested")
    void testCancelActiveDownload() {
        UUID jobId = UUID.randomUUID();
        URI uri = URI.create("https://example.com/big_stream.mp4");

        when(storageService.getScratchDirectory(jobId)).thenReturn(tempDir);
        when(jobRepository.findById(jobId)).thenReturn(Optional.of(new MediaJob()));

        downloadService.submitDownloadJob(jobId, uri, "mp4", "1080p");
        assertTrue(downloadService.isJobActive(jobId));

        boolean cancelled = downloadService.cancelActiveDownload(jobId);
        assertTrue(cancelled);
    }
}
