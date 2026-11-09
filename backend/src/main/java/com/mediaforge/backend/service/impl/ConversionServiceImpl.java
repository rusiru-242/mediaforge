package com.mediaforge.backend.service.impl;

import com.mediaforge.backend.dto.request.ConversionCreateRequest;
import com.mediaforge.backend.dto.response.ConversionResponse;
import com.mediaforge.backend.dto.response.JobResponse;
import com.mediaforge.backend.entity.ConversionRequest;
import com.mediaforge.backend.entity.JobEvent;
import com.mediaforge.backend.entity.MediaFile;
import com.mediaforge.backend.entity.MediaJob;
import com.mediaforge.backend.entity.User;
import com.mediaforge.backend.enums.JobStatus;
import com.mediaforge.backend.enums.JobType;
import com.mediaforge.backend.enums.SourceType;
import com.mediaforge.backend.exception.ResourceNotFoundException;
import com.mediaforge.backend.mapper.JobMapper;
import com.mediaforge.backend.repository.ConversionRequestRepository;
import com.mediaforge.backend.repository.JobEventRepository;
import com.mediaforge.backend.repository.MediaFileRepository;
import com.mediaforge.backend.repository.MediaJobRepository;
import com.mediaforge.backend.repository.UserRepository;
import com.mediaforge.backend.service.ConversionService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

@Service
@Transactional
public class ConversionServiceImpl implements ConversionService {

    private static final Logger log = LoggerFactory.getLogger(ConversionServiceImpl.class);

    private final MediaJobRepository jobRepository;
    private final MediaFileRepository fileRepository;
    private final ConversionRequestRepository conversionRequestRepository;
    private final JobEventRepository eventRepository;
    private final UserRepository userRepository;
    private final JobMapper jobMapper;

    public ConversionServiceImpl(MediaJobRepository jobRepository,
                                 MediaFileRepository fileRepository,
                                 ConversionRequestRepository conversionRequestRepository,
                                 JobEventRepository eventRepository,
                                 UserRepository userRepository,
                                 JobMapper jobMapper) {
        this.jobRepository = jobRepository;
        this.fileRepository = fileRepository;
        this.conversionRequestRepository = conversionRequestRepository;
        this.eventRepository = eventRepository;
        this.userRepository = userRepository;
        this.jobMapper = jobMapper;
    }

    @Override
    public ConversionResponse createConversion(ConversionCreateRequest request, UUID requestingUserId) {
        User user = null;
        if (requestingUserId != null) {
            user = userRepository.findById(requestingUserId)
                    .orElseThrow(() -> new ResourceNotFoundException("User not found with id: " + requestingUserId));
        }

        MediaFile inputFile = null;
        if (request.getInputFileId() != null) {
            inputFile = fileRepository.findById(request.getInputFileId())
                    .orElseThrow(() -> new ResourceNotFoundException("Input media file not found: " + request.getInputFileId()));
        }

        String inputFormat = request.getInputFormat();
        if (inputFormat == null && inputFile != null) {
            inputFormat = inputFile.getOriginalFilename().contains(".")
                    ? inputFile.getOriginalFilename().substring(inputFile.getOriginalFilename().lastIndexOf('.') + 1)
                    : null;
        }

        MediaJob job = new MediaJob(
                UUID.randomUUID(),
                user,
                JobType.CONVERSION,
                SourceType.UPLOAD,
                inputFormat,
                request.getOutputFormat().toLowerCase()
        );
        job.setStatus(JobStatus.PENDING);
        job.setProgress(0);
        MediaJob savedJob = jobRepository.save(job);

        ConversionRequest convRequest = new ConversionRequest(
                UUID.randomUUID(),
                savedJob,
                inputFile,
                request.getOutputFormat().toLowerCase(),
                request.getTargetResolution(),
                request.getAudioBitrate()
        );
        conversionRequestRepository.save(convRequest);

        JobEvent event = new JobEvent(
                UUID.randomUUID(),
                savedJob,
                "CONVERSION_QUEUED",
                String.format("Conversion request queued: target format %s, resolution %s",
                        request.getOutputFormat(), request.getTargetResolution())
        );
        eventRepository.save(event);

        log.info("Conversion job created: {} -> format: {}", savedJob.getId(), request.getOutputFormat());

        JobResponse jobResponse = jobMapper.toResponse(savedJob);
        return new ConversionResponse(
                savedJob.getId(),
                jobResponse,
                request.getOutputFormat(),
                request.getTargetResolution(),
                request.getAudioBitrate(),
                JobStatus.PENDING.name(),
                "Conversion job successfully accepted and queued. FFmpeg processing worker execution will be enabled in Phase 05."
        );
    }
}

