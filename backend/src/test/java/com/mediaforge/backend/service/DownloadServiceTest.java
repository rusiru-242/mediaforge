package com.mediaforge.backend.service;

import com.mediaforge.backend.downloader.service.MediaDownloadService;
import com.mediaforge.backend.downloader.service.MediaMetadataService;
import com.mediaforge.backend.dto.request.DownloadCreateRequest;
import com.mediaforge.backend.dto.request.DownloadValidateRequest;
import com.mediaforge.backend.dto.response.DownloadResponse;
import com.mediaforge.backend.dto.response.DownloadValidateResponse;
import com.mediaforge.backend.entity.MediaJob;
import com.mediaforge.backend.enums.JobStatus;
import com.mediaforge.backend.exception.UrlSecurityException;
import com.mediaforge.backend.mapper.JobMapper;
import com.mediaforge.backend.repository.DownloadRequestRepository;
import com.mediaforge.backend.repository.JobEventRepository;
import com.mediaforge.backend.repository.MediaJobRepository;
import com.mediaforge.backend.service.impl.DownloadServiceImpl;
import com.mediaforge.backend.validation.UrlSecurityValidator;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class DownloadServiceTest {

    @Mock
    private MediaJobRepository jobRepository;

    @Mock
    private DownloadRequestRepository downloadRequestRepository;

    @Mock
    private JobEventRepository eventRepository;

    @Mock
    private MediaMetadataService metadataService;

    @Mock
    private MediaDownloadService mediaDownloadService;

    private UrlSecurityValidator urlValidator;
    private JobMapper jobMapper;
    private DownloadService downloadService;

    @BeforeEach
    void setUp() {
        urlValidator = new UrlSecurityValidator();
        jobMapper = new JobMapper();
        downloadService = new DownloadServiceImpl(
                urlValidator,
                metadataService,
                mediaDownloadService,
                jobRepository,
                downloadRequestRepository,
                eventRepository,
                jobMapper
        );
    }

    @Test
    @DisplayName("Should validate supported public media URL")
    void testValidateUrlSuccess() {
        DownloadValidateRequest request = new DownloadValidateRequest("https://example.com/video/100");
        DownloadValidateResponse response = downloadService.validateUrl(request);

        assertNotNull(response);
        assertTrue(response.isValid());
        assertEquals("example", response.getPlatform());
        assertTrue(response.getAvailableFormats().contains("mp4"));
        assertTrue(response.getAvailableQualities().contains("1080p"));
    }

    @Test
    @DisplayName("Should reject invalid loopback URL during validation")
    void testValidateUrlRejection() {
        DownloadValidateRequest request = new DownloadValidateRequest("http://127.0.0.1:8080/video");
        assertThrows(UrlSecurityException.class, () -> downloadService.validateUrl(request));
    }

    @Test
    @DisplayName("Should create and enqueue download job")
    void testCreateDownloadSuccess() {
        DownloadCreateRequest request = new DownloadCreateRequest("https://example.com/watch", "mp4", "1080p");

        when(jobRepository.save(any(MediaJob.class))).thenAnswer(invocation -> {
            MediaJob job = invocation.getArgument(0);
            job.setId(UUID.randomUUID());
            return job;
        });

        DownloadResponse response = downloadService.createDownload(request);

        assertNotNull(response);
        assertNotNull(response.getJobId());
        assertEquals("example", response.getPlatform());
        assertEquals("mp4", response.getSelectedFormat());
        assertEquals("1080p", response.getSelectedQuality());
        assertEquals(JobStatus.QUEUED.name(), response.getStatus());

        verify(jobRepository, times(1)).save(any(MediaJob.class));
        verify(downloadRequestRepository, times(1)).save(any());
        verify(eventRepository, times(1)).save(any());
        verify(mediaDownloadService, times(1)).submitDownloadJob(any(), any(), any(), any());
    }
}
