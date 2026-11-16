package com.mediaforge.backend.security;

import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import static org.junit.jupiter.api.Assertions.*;

class RateLimitingFilterTest {
    private MockHttpServletResponse call(RateLimitingFilter filter, String method, String path) throws Exception {
        var request = new MockHttpServletRequest(method, path);
        request.setRemoteAddr("127.0.0.1");
        var response = new MockHttpServletResponse();
        filter.doFilter(request, response, (req, res) -> res.getWriter().write("ok"));
        return response;
    }

    @Test void progressPollingDoesNotBlockStartingOrSavingDownloads() throws Exception {
        var filter = new RateLimitingFilter(60);
        for (int i = 0; i < 150; i++) {
            assertEquals(200, call(filter, "GET", "/api/v1/jobs/11111111-1111-1111-1111-111111111111").getStatus());
        }
        assertEquals(200, call(filter, "POST", "/api/v1/downloads").getStatus());
        assertEquals(200, call(filter, "GET", "/api/v1/files/output/download").getStatus());
    }

    @Test void expensiveOperationsRemainLimitedWithRetryAfter() throws Exception {
        var filter = new RateLimitingFilter(1);
        assertEquals(200, call(filter, "POST", "/api/v1/downloads/metadata").getStatus());
        var rejected = call(filter, "POST", "/api/v1/downloads");
        assertEquals(429, rejected.getStatus());
        assertNotNull(rejected.getHeader("Retry-After"));
        assertTrue(rejected.getContentAsString().contains("RATE_LIMIT_EXCEEDED"));
        assertEquals(200, call(filter, "GET", "/api/v1/jobs/11111111-1111-1111-1111-111111111111").getStatus());
    }
}
