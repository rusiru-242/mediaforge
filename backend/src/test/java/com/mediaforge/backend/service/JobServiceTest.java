package com.mediaforge.backend.service;

import com.mediaforge.backend.dto.request.JobCreateRequest;
import com.mediaforge.backend.dto.response.JobResponse;
import com.mediaforge.backend.entity.MediaJob;
import com.mediaforge.backend.enums.JobStatus;
import com.mediaforge.backend.enums.JobType;
import com.mediaforge.backend.enums.SourceType;
import com.mediaforge.backend.exception.InvalidJobTransitionException;
import com.mediaforge.backend.exception.JobCancellationException;
import com.mediaforge.backend.exception.ResourceNotFoundException;
import com.mediaforge.backend.mapper.JobMapper;
import com.mediaforge.backend.repository.JobEventRepository;
import com.mediaforge.backend.repository.MediaJobRepository;
import com.mediaforge.backend.repository.UserRepository;
import com.mediaforge.backend.service.impl.JobServiceImpl;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class JobServiceTest {

    @Mock
    private MediaJobRepository jobRepository;

    @Mock
    private JobEventRepository eventRepository;

    @Mock
    private UserRepository userRepository;

    private JobMapper jobMapper;
    private JobService jobService;

    @BeforeEach
    void setUp() {
        jobMapper = new JobMapper();
        jobService = new JobServiceImpl(jobRepository, eventRepository, userRepository, jobMapper);
    }

    @Test
    @DisplayName("Should successfully create a new media job")
    void testCreateJobSuccess() {
        JobCreateRequest request = new JobCreateRequest(JobType.DOWNLOAD, SourceType.URL, null, "mp4");

        when(jobRepository.save(any(MediaJob.class))).thenAnswer(invocation -> {
            MediaJob job = invocation.getArgument(0);
            job.setId(UUID.randomUUID());
            return job;
        });

        JobResponse response = jobService.createJob(request, null);

        assertNotNull(response);
        assertNotNull(response.getId());
        assertEquals(JobType.DOWNLOAD, response.getJobType());
        assertEquals(SourceType.URL, response.getSourceType());
        assertEquals(JobStatus.PENDING, response.getStatus());
        assertEquals(0, response.getProgress());
        assertEquals("mp4", response.getOutputFormat());

        verify(jobRepository, times(1)).save(any(MediaJob.class));
        verify(eventRepository, times(1)).save(any());
    }

    @Test
    @DisplayName("Should retrieve job by ID")
    void testGetJobById() {
        UUID jobId = UUID.randomUUID();
        MediaJob job = new MediaJob(jobId, null, JobType.CONVERSION, SourceType.UPLOAD, "mov", "mp4");
        job.setStatus(JobStatus.PROCESSING);
        job.setProgress(50);

        when(jobRepository.findById(jobId)).thenReturn(Optional.of(job));

        JobResponse response = jobService.getJobById(jobId, null);

        assertNotNull(response);
        assertEquals(jobId, response.getId());
        assertEquals(JobStatus.PROCESSING, response.getStatus());
        assertEquals(50, response.getProgress());
    }

    @Test
    @DisplayName("Should throw ResourceNotFoundException when job does not exist")
    void testGetJobNotFound() {
        UUID jobId = UUID.randomUUID();
        when(jobRepository.findById(jobId)).thenReturn(Optional.empty());

        assertThrows(ResourceNotFoundException.class, () -> jobService.getJobById(jobId, null));
    }

    @Test
    @DisplayName("Should successfully cancel an active job")
    void testCancelJobSuccess() {
        UUID jobId = UUID.randomUUID();
        MediaJob job = new MediaJob(jobId, null, JobType.DOWNLOAD, SourceType.URL, null, "mp4");
        job.setStatus(JobStatus.PROCESSING);

        when(jobRepository.findById(jobId)).thenReturn(Optional.of(job));
        when(jobRepository.save(any(MediaJob.class))).thenAnswer(invocation -> invocation.getArgument(0));

        JobResponse response = jobService.cancelJob(jobId, null);

        assertNotNull(response);
        assertEquals(JobStatus.CANCELLED, response.getStatus());
        verify(jobRepository).save(any(MediaJob.class));
        verify(eventRepository).save(any());
    }

    @Test
    @DisplayName("Should reject cancellation of completed job")
    void testCancelCompletedJobFails() {
        UUID jobId = UUID.randomUUID();
        MediaJob job = new MediaJob(jobId, null, JobType.DOWNLOAD, SourceType.URL, null, "mp4");
        job.setStatus(JobStatus.COMPLETED);

        when(jobRepository.findById(jobId)).thenReturn(Optional.of(job));

        assertThrows(JobCancellationException.class, () -> jobService.cancelJob(jobId, null));
        verify(jobRepository, never()).save(any());
    }

    @Test
    @DisplayName("Should update progress within valid range 0-100")
    void testUpdateProgress() {
        UUID jobId = UUID.randomUUID();
        MediaJob job = new MediaJob(jobId, null, JobType.DOWNLOAD, SourceType.URL, null, "mp4");
        job.setStatus(JobStatus.PROCESSING);

        when(jobRepository.findById(jobId)).thenReturn(Optional.of(job));
        when(jobRepository.save(any(MediaJob.class))).thenAnswer(invocation -> invocation.getArgument(0));

        JobResponse response = jobService.updateProgress(jobId, 75);
        assertEquals(75, response.getProgress());

        assertThrows(IllegalArgumentException.class, () -> jobService.updateProgress(jobId, -5));
        assertThrows(IllegalArgumentException.class, () -> jobService.updateProgress(jobId, 105));
    }

    @Test
    @DisplayName("Should reject invalid job status transitions")
    void testInvalidStatusTransition() {
        UUID jobId = UUID.randomUUID();
        MediaJob job = new MediaJob(jobId, null, JobType.DOWNLOAD, SourceType.URL, null, "mp4");
        job.setStatus(JobStatus.COMPLETED);

        when(jobRepository.findById(jobId)).thenReturn(Optional.of(job));

        assertThrows(InvalidJobTransitionException.class, () -> jobService.updateStatus(jobId, JobStatus.PROCESSING, null));
    }

    @Test
    @DisplayName("Should list jobs with pagination")
    void testListJobs() {
        PageRequest pageRequest = PageRequest.of(0, 10);
        MediaJob job = new MediaJob(UUID.randomUUID(), null, JobType.DOWNLOAD, SourceType.URL, null, "mp4");
        when(jobRepository.findAll(pageRequest)).thenReturn(new PageImpl<>(List.of(job)));

        Page<JobResponse> result = jobService.listJobs(null, null, pageRequest);

        assertNotNull(result);
        assertEquals(1, result.getTotalElements());
    }
}

