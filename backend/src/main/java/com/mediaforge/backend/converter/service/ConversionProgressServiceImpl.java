package com.mediaforge.backend.converter.service;

import com.mediaforge.backend.converter.model.ConversionProgress;
import com.mediaforge.backend.enums.JobStatus;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.io.IOException;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.CopyOnWriteArrayList;

@Service
public class ConversionProgressServiceImpl implements ConversionProgressService {

    private static final Logger log = LoggerFactory.getLogger(ConversionProgressServiceImpl.class);

    private final Map<UUID, ConversionProgress> progressCache = new ConcurrentHashMap<>();
    private final Map<UUID, List<SseEmitter>> emitterMap = new ConcurrentHashMap<>();

    @Override
    public void updateProgress(UUID jobId, ConversionProgress progress) {
        if (jobId == null || progress == null) return;

        progressCache.put(jobId, progress);

        List<SseEmitter> emitters = emitterMap.get(jobId);
        if (emitters != null && !emitters.isEmpty()) {
            List<SseEmitter> deadEmitters = new CopyOnWriteArrayList<>();

            for (SseEmitter emitter : emitters) {
                try {
                    emitter.send(SseEmitter.event()
                            .id(UUID.randomUUID().toString())
                            .name("progress")
                            .data(progress));
                } catch (Exception e) {
                    deadEmitters.add(emitter);
                }
            }

            if (!deadEmitters.isEmpty()) {
                emitters.removeAll(deadEmitters);
            }
        }

        if (progress.getStatus() == JobStatus.COMPLETED ||
                progress.getStatus() == JobStatus.FAILED ||
                progress.getStatus() == JobStatus.CANCELLED) {
            complete(jobId);
        }
    }

    @Override
    public ConversionProgress getProgress(UUID jobId) {
        if (jobId == null) return null;
        return progressCache.get(jobId);
    }

    @Override
    public SseEmitter subscribe(UUID jobId) {
        // 10-minute timeout for conversion progress SSE stream
        SseEmitter emitter = new SseEmitter(600_000L);

        emitterMap.computeIfAbsent(jobId, k -> new CopyOnWriteArrayList<>()).add(emitter);

        emitter.onCompletion(() -> removeEmitter(jobId, emitter));
        emitter.onTimeout(() -> removeEmitter(jobId, emitter));
        emitter.onError(e -> removeEmitter(jobId, emitter));

        // Immediately send current cached state if available
        ConversionProgress current = progressCache.get(jobId);
        if (current != null) {
            try {
                emitter.send(SseEmitter.event()
                        .name("progress")
                        .data(current));
            } catch (IOException e) {
                removeEmitter(jobId, emitter);
            }
        }

        return emitter;
    }

    @Override
    public void complete(UUID jobId) {
        List<SseEmitter> emitters = emitterMap.remove(jobId);
        if (emitters != null) {
            for (SseEmitter emitter : emitters) {
                try {
                    emitter.complete();
                } catch (Exception ignored) {
                }
            }
        }
    }

    private void removeEmitter(UUID jobId, SseEmitter emitter) {
        List<SseEmitter> emitters = emitterMap.get(jobId);
        if (emitters != null) {
            emitters.remove(emitter);
            if (emitters.isEmpty()) {
                emitterMap.remove(jobId);
            }
        }
    }
}
