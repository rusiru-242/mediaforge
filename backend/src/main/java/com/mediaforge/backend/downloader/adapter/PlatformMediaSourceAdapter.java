package com.mediaforge.backend.downloader.adapter;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.mediaforge.backend.downloader.model.DownloadTask;
import com.mediaforge.backend.downloader.model.DownloadedMedia;
import com.mediaforge.backend.downloader.model.MediaMetadata;
import com.mediaforge.backend.downloader.model.ProgressCallback;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.net.URI;
import java.net.URLEncoder;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.Collections;
import java.util.Locale;
import java.util.Set;

@Component
@Order(30)
public class PlatformMediaSourceAdapter implements MediaSourceAdapter {

    private static final Logger log = LoggerFactory.getLogger(PlatformMediaSourceAdapter.class);

    private static final Set<String> SOCIAL_PLATFORMS = Set.of(
            "youtube.com", "youtu.be",
            "tiktok.com",
            "instagram.com",
            "facebook.com", "fb.watch",
            "twitter.com", "x.com",
            "vimeo.com"
    );

    private final ObjectMapper objectMapper;
    private final HttpClient httpClient;

    public PlatformMediaSourceAdapter() {
        this(new ObjectMapper());
    }

    public PlatformMediaSourceAdapter(ObjectMapper objectMapper) {
        this.objectMapper = objectMapper != null ? objectMapper : new ObjectMapper();
        this.httpClient = HttpClient.newBuilder()
                .connectTimeout(Duration.ofSeconds(5))
                .followRedirects(HttpClient.Redirect.NORMAL)
                .build();
    }

    @Override
    public String getSourceName() {
        return "Third-Party Social Platform (Policy-Protected)";
    }

    @Override
    public boolean supports(URI uri) {
        String host = uri.getHost();
        if (host == null) return false;
        String lowerHost = host.toLowerCase(Locale.ROOT);
        return SOCIAL_PLATFORMS.stream().anyMatch(lowerHost::contains);
    }

    @Override
    public MediaMetadata extractMetadata(URI uri) throws IOException {
        String host = uri.getHost() != null ? uri.getHost().toLowerCase(Locale.ROOT) : "platform";
        String platformName = identifyPlatform(host);

        MediaMetadata metadata = new MediaMetadata();
        metadata.setTitle(platformName + " Stream (Protected)");
        metadata.setSourceName(platformName);
        metadata.setMediaType("VIDEO");
        metadata.setMimeType("video/mp4");
        metadata.setContainerFormat("mp4");
        metadata.setAvailableQualities(Collections.emptyList());
        metadata.setAvailableFormats(Collections.emptyList());
        metadata.setRequiresConversion(false);
        metadata.setDirectStreamUri(null);

        // Attempt public oEmbed query for supported platforms (e.g. YouTube, Vimeo)
        if (host.contains("youtube") || host.contains("youtu.be")) {
            fetchYoutubeOembed(uri, metadata);
        } else if (host.contains("vimeo")) {
            fetchVimeoOembed(uri, metadata);
        }

        return metadata;
    }

    private void fetchYoutubeOembed(URI uri, MediaMetadata metadata) {
        try {
            String endpoint = "https://www.youtube.com/oembed?url=" +
                    URLEncoder.encode(uri.toString(), StandardCharsets.UTF_8) + "&format=json";
            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create(endpoint))
                    .timeout(Duration.ofSeconds(5))
                    .header("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) MediaForge/1.0")
                    .GET()
                    .build();

            HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
            if (response.statusCode() == 200) {
                JsonNode root = objectMapper.readTree(response.body());
                String title = root.path("title").asText(null);
                String author = root.path("author_name").asText(null);
                String thumbnail = root.path("thumbnail_url").asText(null);

                if (title != null && !title.isBlank()) {
                    metadata.setTitle(title);
                }
                if (author != null && !author.isBlank()) {
                    metadata.setSourceName("YouTube (" + author + ")");
                }
                if (thumbnail != null && !thumbnail.isBlank()) {
                    metadata.setThumbnailUri(thumbnail);
                }
            } else {
                log.warn("YouTube oEmbed returned HTTP {}", response.statusCode());
            }
        } catch (Exception ex) {
            log.warn("Failed to fetch YouTube oEmbed metadata for {}: {}", uri, ex.getMessage());
        }
    }

    private void fetchVimeoOembed(URI uri, MediaMetadata metadata) {
        try {
            String endpoint = "https://vimeo.com/api/oembed.json?url=" +
                    URLEncoder.encode(uri.toString(), StandardCharsets.UTF_8);
            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create(endpoint))
                    .timeout(Duration.ofSeconds(5))
                    .header("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) MediaForge/1.0")
                    .GET()
                    .build();

            HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
            if (response.statusCode() == 200) {
                JsonNode root = objectMapper.readTree(response.body());
                String title = root.path("title").asText(null);
                String author = root.path("author_name").asText(null);
                String thumbnail = root.path("thumbnail_url").asText(null);

                if (title != null && !title.isBlank()) {
                    metadata.setTitle(title);
                }
                if (author != null && !author.isBlank()) {
                    metadata.setSourceName("Vimeo (" + author + ")");
                }
                if (thumbnail != null && !thumbnail.isBlank()) {
                    metadata.setThumbnailUri(thumbnail);
                }
            }
        } catch (Exception ex) {
            log.warn("Failed to fetch Vimeo oEmbed metadata for {}: {}", uri, ex.getMessage());
        }
    }

    @Override
    public DownloadedMedia download(DownloadTask task, ProgressCallback progressCallback) throws IOException {
        String host = task.getSourceUri().getHost() != null ? task.getSourceUri().getHost().toLowerCase(Locale.ROOT) : "Platform";
        String platformName = identifyPlatform(host);
        throw new UnsupportedOperationException(String.format(
                "Direct downloading from %s requires official developer API credentials. In accordance with platform Terms of Service and DRM compliance, unauthorized stream scraping is disabled.",
                platformName
        ));
    }

    private String identifyPlatform(String host) {
        if (host.contains("youtube") || host.contains("youtu.be")) return "YouTube";
        if (host.contains("tiktok")) return "TikTok";
        if (host.contains("instagram")) return "Instagram";
        if (host.contains("facebook") || host.contains("fb.watch")) return "Facebook";
        if (host.contains("twitter") || host.contains("x.com")) return "X / Twitter";
        if (host.contains("vimeo")) return "Vimeo";
        return "Protected Platform";
    }
}
