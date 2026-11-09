package com.mediaforge.backend.exception;

import com.mediaforge.backend.enums.JobStatus;

public class JobCancellationException extends RuntimeException {
    public JobCancellationException(JobStatus status) {
        super(String.format("Job cannot be cancelled in status '%s'", status));
    }
}
