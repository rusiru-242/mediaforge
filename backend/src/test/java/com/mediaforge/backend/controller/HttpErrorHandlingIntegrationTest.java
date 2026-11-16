package com.mediaforge.backend.controller;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.mediaforge.backend.exception.GlobalExceptionHandler;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.web.context.request.ServletWebRequest;
import org.springframework.web.servlet.NoHandlerFoundException;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.boot.test.system.CapturedOutput;
import org.springframework.boot.test.system.OutputCaptureExtension;
import org.springframework.boot.test.web.client.TestRestTemplate;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Import;
import org.springframework.http.*;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@ActiveProfiles("test")
@Import(HttpErrorHandlingIntegrationTest.FailureConfiguration.class)
@ExtendWith(OutputCaptureExtension.class)
class HttpErrorHandlingIntegrationTest {
    @Autowired TestRestTemplate http;
    @Autowired ObjectMapper mapper;
    @Autowired GlobalExceptionHandler handler;

    @ParameterizedTest
    @ValueSource(strings = {"/", "/api/v1", "/intentionally-unknown", "/missing-asset.js"})
    void missingRoutesReturn404(String path) throws Exception {
        ResponseEntity<String> response = http.getForEntity(path, String.class);
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.NOT_FOUND);
        JsonNode body = mapper.readTree(response.getBody());
        assertThat(body.path("status").asInt()).isEqualTo(404);
        assertThat(body.path("code").asText()).isEqualTo("RESOURCE_NOT_FOUND");
        assertThat(body.path("path").asText()).isEqualTo(path);
        assertThat(body.has("timestamp")).isTrue();
        assertThat(body.has("validationErrors")).isTrue();
        assertThat(body.has("trace")).isFalse();
    }

    @Test void missingHandlerWithoutStaticResourceMappingsIs404() throws Exception {
        ResponseEntity<Object> response = handler.handleException(
                new NoHandlerFoundException("GET", "/no-mapping", HttpHeaders.EMPTY),
                new ServletWebRequest(new MockHttpServletRequest("GET", "/no-mapping")));
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.NOT_FOUND);
        assertThat(mapper.valueToTree(response.getBody()).path("code").asText()).isEqualTo("RESOURCE_NOT_FOUND");
    }

    @Test void healthAndFormatApisRemainCompatible() throws Exception {
        ResponseEntity<String> health = http.getForEntity("/api/v1/health", String.class);
        assertThat(health.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(mapper.readTree(health.getBody()).path("status").asText()).isEqualTo("UP");
        ResponseEntity<String> formats = http.getForEntity("/api/v1/conversions/formats", String.class);
        assertThat(formats.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(mapper.readTree(formats.getBody()).path("videoFormats").toString()).contains("mp4");
        assertThat(http.getForEntity("/actuator/health", String.class).getStatusCode()).isEqualTo(HttpStatus.OK);
    }

    @Test void beanValidationKeepsExistingErrorStructure() throws Exception {
        ResponseEntity<String> response = post("/api/v1/conversions", "{}", MediaType.APPLICATION_JSON);
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
        JsonNode body = mapper.readTree(response.getBody());
        assertThat(body.path("code").asText()).isEqualTo("VALIDATION_FAILED");
        assertThat(body.path("validationErrors").has("outputFormat")).isTrue();
    }

    @Test void malformedJsonAndInvalidPathParameterAre400() throws Exception {
        ResponseEntity<String> malformed = post("/api/v1/conversions", "{", MediaType.APPLICATION_JSON);
        assertThat(malformed.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
        assertThat(mapper.readTree(malformed.getBody()).path("code").asText()).isEqualTo("INVALID_REQUEST");
        assertThat(http.getForEntity("/api/v1/jobs/not-a-uuid", String.class).getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
    }

    @Test void methodAndContentTypeErrorsKeepHttpSemantics() {
        ResponseEntity<String> method = post("/api/v1/health", "", MediaType.APPLICATION_JSON);
        assertThat(method.getStatusCode()).isEqualTo(HttpStatus.METHOD_NOT_ALLOWED);
        assertThat(method.getHeaders().getAllow()).contains(HttpMethod.GET);
        assertThat(post("/api/v1/conversions", "text", MediaType.TEXT_PLAIN).getStatusCode()).isEqualTo(HttpStatus.UNSUPPORTED_MEDIA_TYPE);
    }

    @Test void responseStatusExceptionKeepsItsStatusWithoutLeakingDetails() {
        ResponseEntity<String> response = http.getForEntity("/__test/status", String.class);
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.I_AM_A_TEAPOT);
        assertThat(response.getBody()).doesNotContain("private status details");
    }

    @Test void unexpectedFailureStillReturns500AndLogsStackTrace(CapturedOutput output) {
        ResponseEntity<String> response = http.getForEntity("/__test/failure", String.class);
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.INTERNAL_SERVER_ERROR);
        assertThat(response.getBody()).contains("INTERNAL_SERVER_ERROR").doesNotContain("private diagnostic marker", "IllegalStateException");
        assertThat(output.getAll()).contains("Unhandled server exception at /__test/failure", "IllegalStateException: private diagnostic marker");
    }

    private ResponseEntity<String> post(String path, String body, MediaType type) {
        HttpHeaders headers = new HttpHeaders(); headers.setContentType(type);
        return http.exchange(path, HttpMethod.POST, new HttpEntity<>(body, headers), String.class);
    }

    @TestConfiguration(proxyBeanMethods = false)
    static class FailureConfiguration {
        @Bean TestFailures testFailures() { return new TestFailures(); }
    }
    @RestController
    static class TestFailures {
        @GetMapping("/__test/failure") String unexpected() { throw new IllegalStateException("private diagnostic marker"); }
        @GetMapping("/__test/status") String status() { throw new ResponseStatusException(HttpStatus.I_AM_A_TEAPOT, "private status details"); }
    }
}
