package com.mediaforge.backend.exception;

public class ProcessorNotAvailableException extends RuntimeException {
    public ProcessorNotAvailableException(String message) {
        super(message);
    }
}
