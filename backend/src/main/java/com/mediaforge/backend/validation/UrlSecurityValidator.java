package com.mediaforge.backend.validation;

import com.mediaforge.backend.exception.UrlSecurityException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;

import java.net.Inet4Address;
import java.net.Inet6Address;
import java.net.InetAddress;
import java.net.URI;
import java.net.UnknownHostException;
import java.util.Locale;
import java.util.Set;

@Component
public class UrlSecurityValidator {

    private static final Logger log = LoggerFactory.getLogger(UrlSecurityValidator.class);

    private static final Set<String> ALLOWED_SCHEMES = Set.of("http", "https");

    private static final Set<String> FORBIDDEN_HOSTNAMES = Set.of(
            "localhost",
            "metadata.google.internal",
            "169.254.169.254",
            "instance-data",
            "0.0.0.0",
            "100.100.100.200" // Alibaba cloud metadata
    );

    /**
     * Validates a URL string against SSRF and unauthorized schemes/targets.
     * Throws UrlSecurityException if the URL violates security constraints.
     *
     * @param urlString URL string to validate
     * @return normalized URI
     */
    public URI validate(String urlString) {
        if (urlString == null || urlString.trim().isEmpty()) {
            throw new UrlSecurityException("URL must not be empty");
        }

        URI uri;
        try {
            uri = URI.create(urlString.trim());
        } catch (IllegalArgumentException ex) {
            throw new UrlSecurityException("Malformed URL format: " + ex.getMessage());
        }

        return validateUri(uri);
    }

    /**
     * Validates a parsed URI against SSRF and scheme constraints.
     */
    public URI validateUri(URI uri) {
        if (uri == null) {
            throw new UrlSecurityException("URI must not be null");
        }

        String scheme = uri.getScheme();
        if (scheme == null || !ALLOWED_SCHEMES.contains(scheme.toLowerCase(Locale.ROOT))) {
            throw new UrlSecurityException(String.format("Unsupported URL scheme '%s'. Only HTTP and HTTPS are permitted.", scheme));
        }

        String host = uri.getHost();
        if (host == null || host.trim().isEmpty()) {
            throw new UrlSecurityException("URL must contain a valid hostname");
        }

        String normalizedHost = host.toLowerCase(Locale.ROOT);

        // Check against forbidden hostname blacklist
        if (FORBIDDEN_HOSTNAMES.contains(normalizedHost) ||
                normalizedHost.endsWith(".localhost") ||
                normalizedHost.endsWith(".local") ||
                normalizedHost.endsWith(".internal")) {
            throw new UrlSecurityException("Access to local, internal, or cloud metadata endpoints is prohibited: " + host);
        }

        // Resolve DNS and verify IP address boundaries
        try {
            InetAddress[] addresses = InetAddress.getAllByName(normalizedHost);
            if (addresses == null || addresses.length == 0) {
                throw new UrlSecurityException("Unable to resolve host: " + normalizedHost);
            }
            for (InetAddress addr : addresses) {
                validateAddress(addr, normalizedHost);
            }
        } catch (UnknownHostException ex) {
            throw new UrlSecurityException("Unable to resolve host: " + normalizedHost);
        } catch (SecurityException ex) {
            throw new UrlSecurityException("Security manager rejected host resolution: " + ex.getMessage());
        }

        return uri;
    }

    /**
     * Verifies that an IP address is strictly public and not in any private, loopback,
     * carrier-grade NAT, or link-local subnet.
     */
    public void validateAddress(InetAddress addr, String host) {
        if (addr == null) {
            throw new UrlSecurityException("Resolved address cannot be null");
        }

        if (addr.isLoopbackAddress()) {
            throw new UrlSecurityException("Loopback addresses are forbidden: " + host + " (" + addr.getHostAddress() + ")");
        }

        if (addr.isAnyLocalAddress()) {
            throw new UrlSecurityException("Wildcard local addresses are forbidden: " + host + " (" + addr.getHostAddress() + ")");
        }

        if (addr.isLinkLocalAddress()) {
            throw new UrlSecurityException("Link-local addresses are forbidden: " + host + " (" + addr.getHostAddress() + ")");
        }

        if (addr.isSiteLocalAddress()) {
            throw new UrlSecurityException("Private network addresses (RFC 1918) are forbidden: " + host + " (" + addr.getHostAddress() + ")");
        }

        if (addr.isMulticastAddress()) {
            throw new UrlSecurityException("Multicast addresses are forbidden: " + host + " (" + addr.getHostAddress() + ")");
        }

        byte[] bytes = addr.getAddress();

        if (addr instanceof Inet4Address) {
            int b0 = bytes[0] & 0xFF;
            int b1 = bytes[1] & 0xFF;

            // 0.0.0.0/8 (Broadcast/Current network)
            if (b0 == 0) {
                throw new UrlSecurityException("Zero-network address is forbidden: " + addr.getHostAddress());
            }

            // 10.0.0.0/8 (RFC 1918)
            if (b0 == 10) {
                throw new UrlSecurityException("Private 10.0.0.0/8 subnet is forbidden: " + addr.getHostAddress());
            }

            // 127.0.0.0/8 (Loopback)
            if (b0 == 127) {
                throw new UrlSecurityException("Loopback 127.0.0.0/8 subnet is forbidden: " + addr.getHostAddress());
            }

            // 172.16.0.0/12 (RFC 1918: 172.16.0.0 - 172.31.255.255)
            if (b0 == 172 && (b1 >= 16 && b1 <= 31)) {
                throw new UrlSecurityException("Private 172.16.0.0/12 subnet is forbidden: " + addr.getHostAddress());
            }

            // 192.168.0.0/16 (RFC 1918)
            if (b0 == 192 && b1 == 168) {
                throw new UrlSecurityException("Private 192.168.0.0/16 subnet is forbidden: " + addr.getHostAddress());
            }

            // 169.254.0.0/16 (Link Local / Cloud Metadata)
            if (b0 == 169 && b1 == 254) {
                throw new UrlSecurityException("Link-local / cloud metadata subnet is forbidden: " + addr.getHostAddress());
            }

            // 100.64.0.0/10 (Shared Address Space / CGNAT)
            if (b0 == 100 && (b1 >= 64 && b1 <= 127)) {
                throw new UrlSecurityException("Carrier-grade NAT subnet is forbidden: " + addr.getHostAddress());
            }
        } else if (addr instanceof Inet6Address) {
            // IPv6 Unique Local Address fc00::/7
            int b0 = bytes[0] & 0xFF;
            if ((b0 & 0xFE) == 0xFC) {
                throw new UrlSecurityException("IPv6 Unique Local Address is forbidden: " + addr.getHostAddress());
            }
            // IPv6 Link-Local fe80::/10
            if (b0 == 0xFE && (bytes[1] & 0xC0) == 0x80) {
                throw new UrlSecurityException("IPv6 Link-Local address is forbidden: " + addr.getHostAddress());
            }
        }
    }

    /**
     * Extracts platform identifier from a valid host (e.g., example.com -> example).
     */
    public String extractPlatform(URI uri) {
        String host = uri.getHost();
        if (host == null) {
            return "unknown";
        }
        host = host.toLowerCase(Locale.ROOT);
        if (host.startsWith("www.")) {
            host = host.substring(4);
        }
        int dotIndex = host.indexOf('.');
        return dotIndex > 0 ? host.substring(0, dotIndex) : host;
    }
}
