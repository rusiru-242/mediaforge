package com.mediaforge.backend.security;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.mediaforge.backend.config.MediaRuntimeHealthIndicator;
import com.mediaforge.backend.dto.response.ApiErrorResponse;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;
import java.io.IOException;

@Component
@Profile("prod")
public class StorageAdmissionFilter extends OncePerRequestFilter {
    private final MediaRuntimeHealthIndicator health;
    private final ObjectMapper mapper;
    public StorageAdmissionFilter(MediaRuntimeHealthIndicator health, ObjectMapper mapper) {
        this.health = health; this.mapper = mapper;
    }
    @Override protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response,
            FilterChain chain) throws ServletException, IOException {
        String path = request.getRequestURI();
        if ("POST".equals(request.getMethod()) && (path.equals("/api/v1/files/upload")
                || path.startsWith("/api/v1/downloads") || path.startsWith("/api/v1/conversions"))
                && !health.storageAvailable()) {
            response.setStatus(503); response.setHeader("Retry-After", "60");
            response.setContentType("application/json");
            mapper.writeValue(response.getWriter(), new ApiErrorResponse(503, "Service Unavailable",
                    "STORAGE_UNAVAILABLE", "Media storage is temporarily unavailable. Retry later.", path));
            return;
        }
        chain.doFilter(request, response);
    }
}
