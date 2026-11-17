package com.mediaforge.backend.config;

import jakarta.annotation.PostConstruct;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Profile;
import java.net.URI;

@Configuration
@Profile("prod")
public class ProductionSafetyConfiguration {
    @Value("${app.security.cors.allowed-origins:}") private String origins;
    @PostConstruct
    void validateOrigins() {
        for (String value : origins.split(",")) {
            if (value.isBlank()) continue;
            URI uri;
            try { uri = URI.create(value.trim()); }
            catch (IllegalArgumentException ex) { throw new IllegalStateException("Invalid production CORS origin"); }
            if (!"https".equals(uri.getScheme()) || uri.getHost() == null || uri.getUserInfo() != null
                    || uri.getQuery() != null || uri.getFragment() != null
                    || (uri.getPath() != null && !uri.getPath().isEmpty()) || value.contains("*")) {
                throw new IllegalStateException("Production CORS origins must be exact HTTPS origins without paths or wildcards");
            }
        }
    }
}
