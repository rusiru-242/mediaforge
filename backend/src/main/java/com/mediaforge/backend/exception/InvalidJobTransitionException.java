package com.mediaforge.backend.exception;

import com.mediaforge.backend.enums.JobStatus;

public class InvalidJobTransitionException extends RuntimeException {
    public InvalidJobTransitionException(JobStatus current, JobStatus target) {
        super(String.format("Cannot transition job from status '%s' to '%s'", current, target));
    }
}

