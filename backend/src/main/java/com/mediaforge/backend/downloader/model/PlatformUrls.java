package com.mediaforge.backend.downloader.model;

import java.net.URI;
import java.util.Locale;

/** Host-based identification; never infer a platform from query strings or lookalike domains. */
public final class PlatformUrls {
    private PlatformUrls() {}
    public static boolean matches(String host, String domain) {
        return host != null && (host.equalsIgnoreCase(domain) || host.toLowerCase(Locale.ROOT).endsWith("." + domain));
    }
    public static String platform(URI uri) {
        String host = uri == null ? null : uri.getHost();
        if (matches(host,"youtube.com") || matches(host,"youtu.be") || matches(host,"youtube-nocookie.com")) return "youtube";
        if (matches(host,"tiktok.com")) return "tiktok";
        if (matches(host,"facebook.com") || matches(host,"fb.watch") || matches(host,"fb.com")) return "facebook";
        if (matches(host,"instagram.com")) return "instagram";
        if (matches(host,"twitter.com") || matches(host,"x.com") || matches(host,"t.co")) return "twitter";
        if (matches(host,"vimeo.com")) return "vimeo";
        return "direct";
    }
    public static URI normalize(URI uri) {
        if (uri.getUserInfo() != null) throw new IllegalArgumentException("Credentials in URLs are not supported.");
        // Retain raw path/query encoding and all media identifiers; fragments are never sent over HTTP.
        String raw = uri.toASCIIString();
        int fragment = raw.indexOf('#');
        return URI.create(fragment < 0 ? raw : raw.substring(0, fragment));
    }
}
