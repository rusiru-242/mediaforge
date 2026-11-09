package com.mediaforge.backend.enums;

import java.util.Set;

public enum JobStatus {
    PENDING,
    QUEUED,
    PROCESSING,
    COMPLETED,
    FAILED,
    CANCELLED;

    public boolean isTerminal() {
        return this == COMPLETED || this == FAILED || this == CANCELLED;
    }

    public boolean canBeCancelled() {
        return this == PENDING || this == QUEUED || this == PROCESSING;
    }

    public boolean canTransitionTo(JobStatus target) {
        if (this == target) {
            return true;
        }
        if (isTerminal()) {
            return false;
        }

        return switch (this) {
            case PENDING -> Set.of(QUEUED, CANCELLED, FAILED).contains(target);
            case QUEUED -> Set.of(PROCESSING, CANCELLED, FAILED).contains(target);
            case PROCESSING -> Set.of(COMPLETED, FAILED, CANCELLED).contains(target);
            default -> false;
        };
    }
}

