package com.mediaforge.backend.exception;

import com.mediaforge.backend.dto.response.ApiErrorResponse;
import jakarta.servlet.http.HttpServletRequest;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.HttpStatusCode;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.context.request.WebRequest;
import org.springframework.web.context.request.ServletWebRequest;
import org.springframework.web.servlet.mvc.method.annotation.ResponseEntityExceptionHandler;

import java.util.HashMap;
import java.util.Map;

@RestControllerAdvice
public class GlobalExceptionHandler extends ResponseEntityExceptionHandler {

    private static final Logger log = LoggerFactory.getLogger(GlobalExceptionHandler.class);

    @ExceptionHandler(ResourceNotFoundException.class)
    public ResponseEntity<ApiErrorResponse> handleResourceNotFound(ResourceNotFoundException ex, HttpServletRequest request) {
        log.warn("Resource not found: {}", ex.getMessage());
        ApiErrorResponse error = new ApiErrorResponse(
                HttpStatus.NOT_FOUND.value(),
                HttpStatus.NOT_FOUND.getReasonPhrase(),
                "RESOURCE_NOT_FOUND",
                ex.getMessage(),
                request.getRequestURI()
        );
        return ResponseEntity.status(HttpStatus.NOT_FOUND).body(error);
    }

    @ExceptionHandler(InvalidJobTransitionException.class)
    public ResponseEntity<ApiErrorResponse> handleInvalidJobTransition(InvalidJobTransitionException ex, HttpServletRequest request) {
        log.warn("Invalid job transition: {}", ex.getMessage());
        ApiErrorResponse error = new ApiErrorResponse(
                HttpStatus.BAD_REQUEST.value(),
                HttpStatus.BAD_REQUEST.getReasonPhrase(),
                "INVALID_STATUS_TRANSITION",
                ex.getMessage(),
                request.getRequestURI()
        );
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(error);
    }

    @ExceptionHandler(JobCancellationException.class)
    public ResponseEntity<ApiErrorResponse> handleJobCancellation(JobCancellationException ex, HttpServletRequest request) {
        log.warn("Job cancellation rejected: {}", ex.getMessage());
        ApiErrorResponse error = new ApiErrorResponse(
                HttpStatus.BAD_REQUEST.value(),
                HttpStatus.BAD_REQUEST.getReasonPhrase(),
                "JOB_CANCELLATION_FAILED",
                ex.getMessage(),
                request.getRequestURI()
        );
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(error);
    }

    @ExceptionHandler(UrlSecurityException.class)
    public ResponseEntity<ApiErrorResponse> handleUrlSecurity(UrlSecurityException ex, HttpServletRequest request) {
        log.warn("URL security rejection: {}", ex.getMessage());
        ApiErrorResponse error = new ApiErrorResponse(
                HttpStatus.BAD_REQUEST.value(),
                HttpStatus.BAD_REQUEST.getReasonPhrase(),
                "URL_SECURITY_VIOLATION",
                ex.getMessage(),
                request.getRequestURI()
        );
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(error);
    }

    @ExceptionHandler(ProcessorNotAvailableException.class)
    public ResponseEntity<ApiErrorResponse> handleProcessorNotAvailable(ProcessorNotAvailableException ex, HttpServletRequest request) {
        log.info("Media processor not implemented/available: {}", ex.getMessage());
        ApiErrorResponse error = new ApiErrorResponse(
                HttpStatus.NOT_IMPLEMENTED.value(),
                HttpStatus.NOT_IMPLEMENTED.getReasonPhrase(),
                "PROCESSOR_NOT_AVAILABLE",
                ex.getMessage(),
                request.getRequestURI()
        );
        return ResponseEntity.status(HttpStatus.NOT_IMPLEMENTED).body(error);
    }

    @ExceptionHandler(UnauthorizedJobAccessException.class)
    public ResponseEntity<ApiErrorResponse> handleUnauthorizedJobAccess(UnauthorizedJobAccessException ex, HttpServletRequest request) {
        log.warn("Unauthorized job access attempt: {}", ex.getMessage());
        ApiErrorResponse error = new ApiErrorResponse(
                HttpStatus.FORBIDDEN.value(),
                HttpStatus.FORBIDDEN.getReasonPhrase(),
                "ACCESS_DENIED",
                ex.getMessage(),
                request.getRequestURI()
        );
        return ResponseEntity.status(HttpStatus.FORBIDDEN).body(error);
    }

    @Override
    protected ResponseEntity<Object> handleMethodArgumentNotValid(MethodArgumentNotValidException ex,
            HttpHeaders headers, HttpStatusCode status, WebRequest request) {
        Map<String, String> errors = new HashMap<>();
        for (FieldError fieldError : ex.getBindingResult().getFieldErrors()) {
            errors.put(fieldError.getField(), fieldError.getDefaultMessage());
        }

        ApiErrorResponse error = new ApiErrorResponse(
                HttpStatus.BAD_REQUEST.value(),
                HttpStatus.BAD_REQUEST.getReasonPhrase(),
                "VALIDATION_FAILED",
                "Input validation failed for one or more fields",
                requestPath(request),
                errors
        );
        return handleExceptionInternal(ex, error, headers, status, request);
    }

    /** Keep Spring MVC's HTTP semantics and headers, using our existing JSON envelope. */
    @Override
    protected ResponseEntity<Object> handleExceptionInternal(Exception ex, Object body,
            HttpHeaders headers, HttpStatusCode status, WebRequest request) {
        String path = requestPath(request);
        if (status.is5xxServerError()) {
            log.error("Framework server exception at {}", path, ex);
        } else {
            log.debug("HTTP {} at {} ({})", status.value(), path, ex.getClass().getSimpleName());
        }
        if (!(body instanceof ApiErrorResponse)) {
            HttpStatus known = HttpStatus.resolve(status.value());
            String reason = known != null ? known.getReasonPhrase() : "HTTP " + status.value();
            String code = switch (status.value()) {
                case 400 -> "INVALID_REQUEST";
                case 404 -> "RESOURCE_NOT_FOUND";
                case 405 -> "METHOD_NOT_ALLOWED";
                case 406 -> "NOT_ACCEPTABLE";
                case 413 -> "PAYLOAD_TOO_LARGE";
                case 415 -> "UNSUPPORTED_MEDIA_TYPE";
                default -> known != null ? known.name() : "HTTP_ERROR";
            };
            String message = status.is5xxServerError()
                    ? "An unexpected server error occurred. Please try again later."
                    : status.value() == 404 ? "The requested resource was not found." : reason;
            body = new ApiErrorResponse(status.value(), reason, code, message, path);
        }
        return super.handleExceptionInternal(ex, body, headers, status, request);
    }

    private String requestPath(WebRequest request) {
        return request instanceof ServletWebRequest servletRequest
                ? servletRequest.getRequest().getRequestURI() : request.getDescription(false);
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<ApiErrorResponse> handleGeneralException(Exception ex, HttpServletRequest request) {
        log.error("Unhandled server exception at {}", request.getRequestURI(), ex);
        ApiErrorResponse error = new ApiErrorResponse(
                HttpStatus.INTERNAL_SERVER_ERROR.value(),
                HttpStatus.INTERNAL_SERVER_ERROR.getReasonPhrase(),
                "INTERNAL_SERVER_ERROR",
                "An unexpected server error occurred. Please try again later.",
                request.getRequestURI()
        );
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(error);
    }
}
