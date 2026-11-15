package com.mediaforge.backend.downloader;

import com.mediaforge.backend.downloader.adapter.MediaSourceAdapter;
import com.mediaforge.backend.converter.service.MediaConversionService;
import com.mediaforge.backend.converter.model.ConversionResult;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import com.mediaforge.backend.downloader.adapter.MediaSourceAdapterRegistry;
import com.mediaforge.backend.downloader.model.DownloadedMedia;
import com.mediaforge.backend.downloader.service.MediaDownloadService;
import com.mediaforge.backend.downloader.service.MediaDownloadServiceImpl;
import com.mediaforge.backend.downloader.service.MediaStorageService;
import com.mediaforge.backend.downloader.service.DownloadOutputVerifier;
import com.mediaforge.backend.converter.model.MediaProbeResult;
import com.mediaforge.backend.converter.model.VideoStreamInfo;
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
    @Mock private DownloadOutputVerifier verifier;

    @BeforeEach
    void setUp() throws Exception {
        MediaProbeResult input = new MediaProbeResult();
        input.getVideoStreams().add(new VideoStreamInfo());
        lenient().when(verifier.inspect(any())).thenReturn(input);
        downloadService = new MediaDownloadServiceImpl(
                adapterRegistry,
                storageService,
                jobRepository,
                eventRepository,
                2, null, null, verifier
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

    @ParameterizedTest
    @ValueSource(strings = {"avi", "mkv", "mov", "flv", "wav", "mp3"})
    void convertsDirectDownloadToRequestedFormat(String format) throws Exception {
        downloadService.shutdown();
        MediaConversionService converter = mock(MediaConversionService.class);
        downloadService = new MediaDownloadServiceImpl(adapterRegistry, storageService,
                jobRepository, eventRepository, 2, null, converter, verifier);
        UUID jobId = UUID.randomUUID();
        URI uri = URI.create("https://example.com/stream.mp4");
        MediaJob job = new MediaJob(jobId, null, JobType.DOWNLOAD, SourceType.URL, null, format);
        when(jobRepository.findById(jobId)).thenReturn(Optional.of(job));
        when(storageService.getScratchDirectory(jobId)).thenReturn(tempDir);
        when(adapterRegistry.getAdapter(uri)).thenReturn(mockAdapter);
        Path input = Files.writeString(tempDir.resolve("input.mp4"), "source");
        when(mockAdapter.download(any(), any())).thenReturn(new DownloadedMedia(
                input, "stream.mp4", "stream.mp4", "video/mp4", 6L, "mp4"));
        String mime = DownloadOutputVerifier.mimeType(format);
        when(converter.convert(any(), any(), any(), eq(format), any(), any())).thenAnswer(call -> {
            java.io.File output = call.getArgument(2);
            Files.writeString(output.toPath(), "converted");
            return ConversionResult.success(output, format, 1, output.length(), mime);
        });
        MediaFile stored = new MediaFile(UUID.randomUUID(), job, "stream." + format,
                "stored." + format, "media/stored." + format, mime, 9L, OffsetDateTime.now().plusHours(24));
        when(storageService.storeDownloadedFile(any(), any(), any(), any(), anyLong())).thenReturn(stored);
        downloadService.submitDownloadJob(jobId, uri, format, "original");
        for (int i = 0; i < 100 && downloadService.isJobActive(jobId); i++) Thread.sleep(20);
        assertEquals(JobStatus.COMPLETED, job.getStatus());
        assertEquals(format, job.getOutputFormat());
        verify(storageService).storeDownloadedFile(eq(job), eq("stream." + format), any(), eq(mime), eq(9L));
    }

    @Test void audioOnlyResultFailsVideoJobWithoutSavingFile() throws Exception {
        UUID id = UUID.randomUUID();
        URI uri = URI.create("https://example.com/video");
        MediaJob job = new MediaJob(id, null, JobType.DOWNLOAD, SourceType.URL, null, "mp4");
        when(jobRepository.findById(id)).thenReturn(Optional.of(job));
        when(storageService.getScratchDirectory(id)).thenReturn(tempDir);
        when(adapterRegistry.getAdapter(uri)).thenReturn(mockAdapter);
        Path audio = Files.writeString(tempDir.resolve("audio.m4a"), "audio");
        when(mockAdapter.download(any(), any())).thenReturn(new DownloadedMedia(audio, "audio.m4a", "audio.m4a", "audio/mp4", 5, "m4a"));
        when(verifier.inspect(audio)).thenReturn(new MediaProbeResult());
        downloadService.submitDownloadJob(id, uri, "mp4", "720p");
        for (int i = 0; i < 100 && downloadService.isJobActive(id); i++) Thread.sleep(20);
        assertEquals(JobStatus.FAILED, job.getStatus());
        assertTrue(job.getErrorMessage().contains("only audio"));
        assertNull(job.getOutputFileId());
        verify(storageService, never()).storeDownloadedFile(any(), any(), any(), any(), anyLong());
    }

    @Test void finalVerificationFailureFailsJobWithoutSavingFile() throws Exception {
        UUID id = UUID.randomUUID();
        URI uri = URI.create("https://example.com/video.mp4");
        MediaJob job = new MediaJob(id, null, JobType.DOWNLOAD, SourceType.URL, null, "mp4");
        when(jobRepository.findById(id)).thenReturn(Optional.of(job));
        when(storageService.getScratchDirectory(id)).thenReturn(tempDir);
        when(adapterRegistry.getAdapter(uri)).thenReturn(mockAdapter);
        Path output = Files.writeString(tempDir.resolve("bad.mp4"), "invalid");
        when(mockAdapter.download(any(), any())).thenReturn(new DownloadedMedia(output, "video.mp4", "video.mp4", "video/mp4", 7, "mp4"));
        when(verifier.verify(eq(output), eq("mp4"), anyBoolean())).thenThrow(new IOException("FFprobe rejected missing video stream"));
        downloadService.submitDownloadJob(id, uri, "mp4", "720p");
        for (int i = 0; i < 100 && downloadService.isJobActive(id); i++) Thread.sleep(20);
        assertEquals(JobStatus.FAILED, job.getStatus());
        assertTrue(job.getErrorMessage().contains("FFprobe rejected"));
        verify(storageService, never()).storeDownloadedFile(any(), any(), any(), any(), anyLong());
    }
}
