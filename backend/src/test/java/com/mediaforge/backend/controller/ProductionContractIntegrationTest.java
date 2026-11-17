package com.mediaforge.backend.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.client.TestRestTemplate;
import org.springframework.http.*;
import org.springframework.test.context.ActiveProfiles;
import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT, properties = {
        "app.storage.base-path=./target/production-contract-storage", "app.storage.minimum-free-bytes=0",
        "app.runtime-checks.tools-enabled=false", "app.security.cors.allowed-origins=https://studio.example.com",
        "app.rate-limit.requests-per-minute=1000"})
@ActiveProfiles("prod")
class ProductionContractIntegrationTest {
    @Autowired TestRestTemplate http;
    @Autowired ObjectMapper mapper;
    @Autowired com.mediaforge.backend.converter.service.ConversionWorker worker;
    @Test void productionHonorsSingleConversionWorker() {
        var executor = (org.springframework.scheduling.concurrent.ThreadPoolTaskExecutor)
                org.springframework.test.util.ReflectionTestUtils.getField(worker, "taskExecutor");
        assertThat(executor.getMaxPoolSize()).isEqualTo(1);
        assertThat(executor.getCorePoolSize()).isEqualTo(1);
    }
    @Test void healthIsMinimalAndOtherActuatorEndpointsAreClosed() throws Exception {
        var response = http.getForEntity("/actuator/health", String.class);
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(mapper.readTree(response.getBody()).has("components")).isFalse();
        assertThat(response.getBody()).doesNotContain("details", "ffmpeg", "storage", "path");
        assertThat(mapper.readTree(response.getBody()).path("status").asText()).isEqualTo("UP");
        for (String path : new String[]{"/actuator/env", "/actuator/info", "/actuator/configprops"}) {
            assertThat(http.getForEntity(path, String.class).getStatusCode()).isEqualTo(HttpStatus.FORBIDDEN);
        }
    }
    @Test void rootUnknownAndInvalidRequestsKeepHttpSemantics() throws Exception {
        for (String path : new String[]{"/", "/api/v1", "/does-not-exist"}) {
            var response = http.getForEntity(path, String.class);
            assertThat(response.getStatusCode()).isEqualTo(HttpStatus.NOT_FOUND);
            assertThat(mapper.readTree(response.getBody()).path("code").asText()).isEqualTo("RESOURCE_NOT_FOUND");
        }
        var headers = new HttpHeaders(); headers.setContentType(MediaType.APPLICATION_JSON);
        var response = http.postForEntity("/api/v1/conversions", new HttpEntity<>("{}", headers), String.class);
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
        assertThat(response.getBody()).doesNotContain("trace", "java.lang", "storagePath");
        assertThat(http.getForEntity("/api/v1/health", String.class).getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(http.getForEntity("/api/v1/conversions/formats", String.class).getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(http.getForEntity("/v3/api-docs", String.class).getStatusCode()).isEqualTo(HttpStatus.NOT_FOUND);
        assertThat(http.getForEntity("/api/v1/jobs", String.class).getStatusCode()).isEqualTo(HttpStatus.FORBIDDEN);
    }
    @Test void corsAllowsOnlyConfiguredOriginAndExposesDownloadFilename() {
        var headers = new HttpHeaders(); headers.setOrigin("https://studio.example.com");
        headers.setAccessControlRequestMethod(HttpMethod.POST);
        var allowed = http.exchange("/api/v1/conversions", HttpMethod.OPTIONS, new HttpEntity<>(headers), String.class);
        assertThat(allowed.getHeaders().getAccessControlAllowOrigin()).isEqualTo("https://studio.example.com");
        assertThat(allowed.getHeaders().getAccessControlAllowCredentials()).isFalse();
        headers.setOrigin("https://untrusted.example.com");
        assertThat(http.exchange("/api/v1/conversions", HttpMethod.OPTIONS, new HttpEntity<>(headers), String.class)
                .getStatusCode()).isEqualTo(HttpStatus.FORBIDDEN);
    }
}
