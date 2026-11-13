package com.mediaforge.backend.downloader;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.mediaforge.backend.converter.service.FFmpegProcessExecutor;
import com.mediaforge.backend.downloader.model.MediaMetadata;
import com.mediaforge.backend.downloader.service.YtDlpProcessExecutor;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.net.URI;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

class YtDlpProcessExecutorTest {

    private YtDlpProcessExecutor executor;

    @BeforeEach
    void setUp() {
        executor = new YtDlpProcessExecutor(new ObjectMapper(), new FFmpegProcessExecutor());
    }

    @Test
    void testIsAvailable() {
        // yt-dlp is installed in python user scripts
        boolean available = executor.isAvailable();
        assertThat(available).isTrue();
    }

    @Test
    void testExecutableCommandResolution() {
        List<String> cmd = executor.getExecutableCommand();
        assertThat(cmd).isNotEmpty();
    }

    @Test
    void testExtractMetadataForInvalidVideo() {
        // Non-existent video returns sanitized error message rather than throwing an unhandled exception
        MediaMetadata meta = executor.extractMetadata(URI.create("https://www.youtube.com/watch?v=00000000000"));
        assertThat(meta).isNotNull();
        assertThat(meta.getAvailableFormats()).isEmpty();
        assertThat(meta.getMessage()).containsIgnoringCase("unavailable");
    }
}
