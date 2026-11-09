package com.mediaforge.backend.validation;

import com.mediaforge.backend.exception.UrlSecurityException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;

import java.net.URI;

import static org.junit.jupiter.api.Assertions.*;

class UrlSecurityValidatorTest {

    private UrlSecurityValidator validator;

    @BeforeEach
    void setUp() {
        validator = new UrlSecurityValidator();
    }

    @Test
    @DisplayName("Should accept valid HTTPS public URL")
    void testValidPublicUrl() {
        URI uri = validator.validate("https://example.com/watch?v=12345");
        assertNotNull(uri);
        assertEquals("example.com", uri.getHost());
        assertEquals("https", uri.getScheme());
        assertEquals("example", validator.extractPlatform(uri));
    }

    @ParameterizedTest
    @ValueSource(strings = {
            "ftp://example.com/media.mp4",
            "file:///etc/passwd",
            "gopher://example.com",
            "data:text/plain;base64,SGVsbG8="
    })
    @DisplayName("Should reject non-HTTP/HTTPS schemes")
    void testRejectUnsupportedSchemes(String url) {
        UrlSecurityException ex = assertThrows(UrlSecurityException.class, () -> validator.validate(url));
        assertTrue(ex.getMessage().contains("Unsupported URL scheme"));
    }

    @ParameterizedTest
    @ValueSource(strings = {
            "http://localhost/video",
            "http://localhost:8080/test",
            "http://127.0.0.1/test",
            "http://0.0.0.0/test",
            "http://metadata.google.internal/computeMetadata/v1",
            "http://169.254.169.254/latest/meta-data",
            "http://instance-data/latest"
    })
    @DisplayName("Should reject SSRF, loopback, and cloud metadata targets")
    void testRejectSsrfTargets(String url) {
        assertThrows(UrlSecurityException.class, () -> validator.validate(url));
    }

    @Test
    @DisplayName("Should reject blank and empty URLs")
    void testRejectEmptyUrl() {
        assertThrows(UrlSecurityException.class, () -> validator.validate(""));
        assertThrows(UrlSecurityException.class, () -> validator.validate("   "));
        assertThrows(UrlSecurityException.class, () -> validator.validate(null));
    }
}
