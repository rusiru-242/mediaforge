package com.mediaforge.backend;

import org.springframework.boot.SpringBootVersion;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

@SpringBootApplication
@EnableScheduling
public class MediaForgeApplication {

    private static final Logger log = LoggerFactory.getLogger(MediaForgeApplication.class);

    public static void main(String[] args) {
        log.info("Starting MediaForge Backend Application with Spring Boot {}", SpringBootVersion.getVersion());
        SpringApplication.run(MediaForgeApplication.class, args);
    }
}
