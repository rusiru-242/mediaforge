package com.mediaforge.backend.exception;

public class UnauthorizedJobAccessException extends RuntimeException {
    public UnauthorizedJobAccessException(String message) {
        super(message);
    }
}

