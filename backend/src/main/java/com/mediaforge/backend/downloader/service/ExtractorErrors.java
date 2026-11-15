package com.mediaforge.backend.downloader.service;

import java.util.Locale;

/** Stable, credential-free messages suitable for the API and job state. */
public final class ExtractorErrors {
    private ExtractorErrors() {}
    public static String redact(String message) {
        if (message == null || message.isBlank()) return "Media download or processing failed.";
        String safe = message.replaceAll("(?i)https?://\\S+", "[remote URL]")
                .replaceAll("[A-Za-z]:[\\\\/][^\\r\\n]*", "[local path]")
                .replaceAll("(?<![\\w:])/(?:[\\w.-]+/)+[\\w.-]+", "[local path]")
                .replaceAll("[\\r\\n]+", " ");
        return safe.length() > 500 ? safe.substring(0,500) : safe;
    }
    public static String describe(String raw) {
        String text = raw == null ? "" : raw.toLowerCase(Locale.ROOT);
        if (text.contains("drm")) return "[DRM_PROTECTED] This media is DRM-protected and cannot be downloaded.";
        if (text.contains("429") || text.contains("too many requests") || text.contains("rate limit")) return "[RATE_LIMITED] The source is rate limiting requests. Try again later.";
        if (text.contains("private video") || text.contains("private content")) return "[PRIVATE_CONTENT] The source media is private.";
        if (text.contains("sign in") || text.contains("login") || text.contains("log in") || text.contains("authentication") || text.contains("cookies")) return "[LOGIN_REQUIRED] This source requires authentication. Only publicly accessible media is supported.";
        if (text.contains("country") || text.contains("region") || text.contains("geo")) return "[REGION_RESTRICTED] This media is not accessible from the server region.";
        if (text.contains("404") || text.contains("not available") || text.contains("unavailable") || text.contains("removed")) return "[MEDIA_UNAVAILABLE] The media is unavailable or has been removed.";
        if (text.contains("unsupported url")) return "[UNSUPPORTED_MEDIA] No supported media extractor is available for this URL.";
        if (text.contains("timed out") || text.contains("timeout") || text.contains("resolve") || text.contains("connection") || text.contains("network")) return "[NETWORK_FAILURE] The source could not be reached. Check the link and retry later.";
        if (text.contains("unexpected response from webpage request") || text.contains("403") || text.contains("forbidden")) return "[SOURCE_ACCESS_DENIED] The platform did not provide accessible media details to this server. Try another public link or import your own media file.";
        if (text.contains("requested format") || text.contains("no video formats")) return "[FORMAT_UNAVAILABLE] The requested stream or watermark-free version is not available from this source.";
        if (text.contains("ffmpeg") || text.contains("ffprobe")) return "[PROCESSING_UNAVAILABLE] FFmpeg/FFprobe could not process this media. Check the server media-tool configuration.";
        return "[EXTRACTOR_FAILURE] The platform returned media data the extractor could not read. Try another public link or retry later.";
    }
}
