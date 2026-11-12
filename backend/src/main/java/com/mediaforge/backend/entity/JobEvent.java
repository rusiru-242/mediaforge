package com.mediaforge.backend.entity;

import java.time.OffsetDateTime;
import java.util.UUID;

/**
 * In-memory representation of a media job audit event.
 */
public class JobEvent {

    private UUID id;
    private MediaJob job;
    private String eventType;
    private String message;
    private OffsetDateTime createdAt;

    public JobEvent() {
        this.id = UUID.randomUUID();
        this.createdAt = OffsetDateTime.now();
    }

    public JobEvent(UUID id, MediaJob job, String eventType, String message) {
        this.id = id != null ? id : UUID.randomUUID();
        this.job = job;
        this.eventType = eventType;
        this.message = message;
        this.createdAt = OffsetDateTime.now();
    }

    public UUID getId() {
        return id;
    }

    public void setId(UUID id) {
        this.id = id;
    }

    public MediaJob getJob() {
        return job;
    }

    public void setJob(MediaJob job) {
        this.job = job;
    }

    public String getEventType() {
        return eventType;
    }

    public void setEventType(String eventType) {
        this.eventType = eventType;
    }

    public String getMessage() {
        return message;
    }

    public void setMessage(String message) {
        this.message = message;
    }

    public OffsetDateTime getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(OffsetDateTime createdAt) {
        this.createdAt = createdAt;
    }
}
