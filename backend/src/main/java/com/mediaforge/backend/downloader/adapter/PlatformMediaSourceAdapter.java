package com.mediaforge.backend.downloader.adapter;

import com.mediaforge.backend.downloader.model.DownloadTask;
import com.mediaforge.backend.downloader.model.DownloadedMedia;
import com.mediaforge.backend.downloader.model.MediaMetadata;
import com.mediaforge.backend.downloader.model.ProgressCallback;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.net.URI;
import java.util.Collections;
import java.util.Locale;
import java.util.Set;

@Component
@Order(30)
public class PlatformMediaSourceAdapter implements MediaSourceAdapter {

    private static final Set<String> SOCIAL_PLATFORMS = Set.of(
            "youtube.com", "youtu.be",
            "tiktok.com",
            "instagram.com",
            "facebook.com", "fb.watch",
            "twitter.com", "x.com",
            "vimeo.com"
    );

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
        metadata.setTitle(platformName + " Stream Request");
        metadata.setSourceName(platformName);
        metadata.setMediaType("VIDEO");
        metadata.setMimeType("video/mp4");
        metadata.setContainerFormat("mp4");
        metadata.setAvailableQualities(Collections.emptyList());
        metadata.setAvailableFormats(Collections.emptyList());
        metadata.setRequiresConversion(false);
        metadata.setDirectStreamUri(null);

        // Explicit legal / terms warning
        return metadata;
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
