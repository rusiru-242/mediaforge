package com.mediaforge.backend.downloader.service;

import java.util.Locale;
import java.util.regex.Pattern;

/** Stable, credential-free messages suitable for the API and job state. */
public final class ExtractorErrors {
    private static final Pattern HTTP_429 = Pattern.compile(
            "(?i)(?:\\bHTTP(?:\\s+Error)?\\s+429\\b|\\b429\\s+Too Many Requests\\b|\\bToo Many Requests\\b|\\bRate[- ]Limit(?:ed|ing)?\\b)");
    private static final Pattern HTTP_5XX = Pattern.compile(
            "(?i)(?:\\bHTTP(?:\\s+Error)?\\s+5\\d\\d\\b|\\b5\\d\\d\\s+(?:Server Error|Service Unavailable|Bad Gateway|Gateway Timeout)\\b)");
    private static final Pattern HTTP_403 = Pattern.compile("(?i)\\bHTTP(?:\\s+Error)?\\s+403\\b");

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
        String text = raw == null ? "" : raw.toLowerCase(Locale.ROOT).replace('\u2018', '\'').replace('\u2019', '\'');
        if (isVerificationChallenge(text)) return "[SOURCE_ACCESS_DENIED] The platform requires an access check that this server cannot complete. Only publicly accessible media is supported.";
        if (text.contains("drm")) return "[DRM_PROTECTED] This media is DRM-protected and cannot be downloaded.";
        if (HTTP_429.matcher(text).find()) return "[RATE_LIMITED] The source is rate limiting requests. Try again later.";
        if (text.contains("private video") || text.contains("private content")) return "[PRIVATE_CONTENT] The source media is private.";
        if (requiresAuthentication(text)) return "[LOGIN_REQUIRED] This source requires authentication. Only publicly accessible media is supported.";
        if (text.contains("country") || text.contains("region") || text.contains("geo")) return "[REGION_RESTRICTED] This media is not accessible from the server region.";
        if (isSourceAccessDenied(text)) return "[SOURCE_ACCESS_DENIED] The platform did not provide accessible media details to this server. Try another public link or import your own media file.";
        if (HTTP_5XX.matcher(text).find()) return "[UPSTREAM_FAILURE] The source server encountered a temporary error. Retry shortly.";
        if (text.contains("404") || text.contains("not available") || text.contains("unavailable") || text.contains("removed")) return "[MEDIA_UNAVAILABLE] The media is unavailable or has been removed.";
        if (text.contains("unsupported url")) return "[UNSUPPORTED_MEDIA] No supported media extractor is available for this URL.";
        if (text.contains("timed out") || text.contains("timeout") || text.contains("resolve") || text.contains("connection") || text.contains("network")) return "[NETWORK_FAILURE] The source could not be reached. Check the link and retry later.";
        if (text.contains("requested format") || text.contains("no video formats")) return "[FORMAT_UNAVAILABLE] The requested stream or watermark-free version is not available from this source.";
        if (text.contains("ffmpeg") || text.contains("ffprobe")) return "[PROCESSING_UNAVAILABLE] FFmpeg/FFprobe could not process this media. Check the server media-tool configuration.";
        return "[EXTRACTOR_FAILURE] The platform returned media data the extractor could not read. Try another public link or retry later.";
    }

    static boolean isRetryable(String raw) {
        String text = raw == null ? "" : raw.toLowerCase(Locale.ROOT).replace('\u2018', '\'').replace('\u2019', '\'');
        if (isVerificationChallenge(text) || isSourceAccessDenied(text) || HTTP_429.matcher(text).find()
                || requiresAuthentication(text) || text.contains("private video") || text.contains("private content")
                || text.contains("drm") || text.contains("age-restricted") || text.contains("members-only")
                || text.contains("country") || text.contains("region")) {
            return false;
        }
        return HTTP_5XX.matcher(text).find()
                || text.contains("timed out")
                || text.contains("timeout")
                || text.contains("connection reset")
                || text.contains("connection aborted")
                || text.contains("remote end closed connection")
                || text.contains("unexpected eof")
                || text.contains("temporary failure in name resolution")
                || text.contains("temporary failure resolving");
    }

    private static boolean isVerificationChallenge(String text) {
        return text.contains("confirm you're not a bot")
                || text.contains("confirm that you're not a bot")
                || text.contains("verify you are human")
                || text.contains("unusual traffic")
                || text.contains("captcha")
                || text.contains("automated queries");
    }

    private static boolean isSourceAccessDenied(String text) {
        return text.contains("unexpected response from webpage request")
                || HTTP_403.matcher(text).find()
                || text.contains("403 forbidden")
                || text.contains("forbidden");
    }

    private static boolean requiresAuthentication(String text) {
        return text.contains("login required")
                || text.contains("log in required")
                || text.contains("authentication required")
                || text.contains("requires authentication")
                || text.contains("sign in to confirm your age")
                || text.contains("sign in to access")
                || text.contains("please sign in")
                || text.contains("please log in")
                || text.contains("members-only")
                || text.contains("members only")
                || text.contains("age-restricted")
                || text.contains("age restricted");
    }
}
