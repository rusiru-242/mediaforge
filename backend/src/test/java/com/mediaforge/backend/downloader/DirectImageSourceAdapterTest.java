package com.mediaforge.backend.downloader;

import com.mediaforge.backend.downloader.adapter.DirectImageSourceAdapter;
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
class DirectImageSourceAdapterTest {

    @Mock
    private HttpDownloadClient httpClient;

    private DirectImageSourceAdapter adapter;

    @BeforeEach
    void setUp() {
        adapter = new DirectImageSourceAdapter(httpClient);
    }

    @Test
    @DisplayName("Should support direct image URLs")
    void testSupports() {
        assertTrue(adapter.supports(URI.create("https://example.com/banner.png")));
        assertTrue(adapter.supports(URI.create("https://example.com/photo.jpg")));
        assertTrue(adapter.supports(URI.create("https://example.com/graphic.webp")));
        assertFalse(adapter.supports(URI.create("https://example.com/movie.mp4")));
    }

    @Test
    @DisplayName("Should extract genuine image metadata")
    void testExtractImageMetadata() throws IOException {
        URI uri = URI.create("https://example.com/images/wallpaper.png");

        HttpDownloadClient.HttpResponse mockResponse = new HttpDownloadClient.HttpResponse(
                uri,
                200,
                "image/png",
                2097152L, // 2MB
                "inline; filename=\"wallpaper.png\""
        );

        when(httpClient.probeHeaders(any(URI.class))).thenReturn(mockResponse);
        when(httpClient.extractFilename(any(), any(), any())).thenReturn("wallpaper.png");
        when(httpClient.extractExtension(any(), any())).thenReturn("png");

        MediaMetadata metadata = adapter.extractMetadata(uri);

        assertNotNull(metadata);
        assertEquals("wallpaper", metadata.getTitle());
        assertEquals("IMAGE", metadata.getMediaType());
        assertEquals("image/png", metadata.getMimeType());
        assertEquals("png", metadata.getContainerFormat());
        assertEquals(2097152L, metadata.getFileSize());
        assertEquals(uri.toString(), metadata.getThumbnailUri());
        assertTrue(metadata.getAvailableFormats().stream().anyMatch(f -> f.isNativeStream() && "png".equals(f.getFormat())));
    }
}
