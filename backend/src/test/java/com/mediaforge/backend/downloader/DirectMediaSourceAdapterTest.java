package com.mediaforge.backend.downloader;

import com.mediaforge.backend.downloader.adapter.DirectMediaSourceAdapter;
import com.mediaforge.backend.downloader.model.MediaMetadata;
import com.mediaforge.backend.downloader.service.HttpDownloadClient;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.io.IOException;
import java.net.URI;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class DirectMediaSourceAdapterTest {

    @Mock
    private HttpDownloadClient httpClient;

    private DirectMediaSourceAdapter adapter;

    @BeforeEach
    void setUp() {
        adapter = new DirectMediaSourceAdapter(httpClient);
    }

    @Test
    @DisplayName("Should support direct video and audio URLs")
    void testSupports() {
        assertTrue(adapter.supports(URI.create("https://example.com/sample.mp4")));
        assertTrue(adapter.supports(URI.create("https://example.com/audio/song.mp3")));
        assertTrue(adapter.supports(URI.create("https://example.com/clip.webm")));
        assertTrue(adapter.supports(URI.create("https://example.com/movie.mkv")));
        assertFalse(adapter.supports(URI.create("https://example.com/photo.png")));
        assertFalse(adapter.supports(URI.create("https://example.com/page.html")));
    }

    @Test
    @DisplayName("Should extract genuine video metadata and format options")
    void testExtractVideoMetadata() throws IOException {
        URI uri = URI.create("https://example.com/videos/sample_1080p.mp4");

        HttpDownloadClient.HttpResponse mockResponse = new HttpDownloadClient.HttpResponse(
                uri,
                200,
                "video/mp4",
                15728640L, // 15MB
                "attachment; filename=\"sample_1080p.mp4\""
        );

        when(httpClient.probeHeaders(any(URI.class))).thenReturn(mockResponse);
        when(httpClient.extractFilename(any(), any(), any())).thenReturn("sample_1080p.mp4");
        when(httpClient.extractExtension(any(), any())).thenReturn("mp4");

        MediaMetadata metadata = adapter.extractMetadata(uri);

        assertNotNull(metadata);
        assertEquals("sample 1080p", metadata.getTitle());
        assertEquals("VIDEO", metadata.getMediaType());
        assertEquals("video/mp4", metadata.getMimeType());
        assertEquals("mp4", metadata.getContainerFormat());
        assertEquals(15728640L, metadata.getFileSize());
        assertEquals("1920x1080", metadata.getResolution());
        assertTrue(metadata.getAvailableQualities().contains("1080p (Full HD)"));
        assertFalse(metadata.getAvailableFormats().isEmpty());

        // Native stream option
        assertTrue(metadata.getAvailableFormats().stream().anyMatch(f -> f.isNativeStream() && "mp4".equals(f.getFormat())));
        // Conversion required option
        assertTrue(metadata.getAvailableFormats().stream().anyMatch(f -> f.isRequiresConversion() && "mp3".equals(f.getFormat())));
    }
}
