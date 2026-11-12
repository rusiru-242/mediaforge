package com.mediaforge.backend.converter.service;

import com.mediaforge.backend.converter.model.ConversionProgress;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.util.UUID;

public interface ConversionProgressService {

    /**
     * Updates and broadcasts conversion progress to SSE subscribers and in-memory cache.
     */
    void updateProgress(UUID jobId, ConversionProgress progress);

    /**
     * Retrieves the latest progress for polling clients.
     */
    ConversionProgress getProgress(UUID jobId);

    /**
     * Subscribes a client to real-time progress via Server-Sent Events.
     */
    SseEmitter subscribe(UUID jobId);

    /**
     * Cleans up emitters and cached state when a job completes or is cancelled.
     */
    void complete(UUID jobId);
}
