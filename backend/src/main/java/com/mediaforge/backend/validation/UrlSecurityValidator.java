package com.mediaforge.backend.validation;

import com.mediaforge.backend.exception.UrlSecurityException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;

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
            "0.0.0.0"
    );

    /**
     * Validates a URL against SSRF and unauthorized schemes/targets.
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
        if (FORBIDDEN_HOSTNAMES.contains(normalizedHost) || normalizedHost.endsWith(".localhost") || normalizedHost.endsWith(".local")) {
            throw new UrlSecurityException("Access to local, internal, or cloud metadata endpoints is prohibited: " + host);
        }

        // Resolve DNS and verify IP address boundaries
        try {
            InetAddress[] addresses = InetAddress.getAllByName(normalizedHost);
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

    private void validateAddress(InetAddress addr, String host) {
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

        String ip = addr.getHostAddress();
        // Check for AWS/Azure/GCP metadata IP explicitly
        if ("169.254.169.254".equals(ip) || ip.startsWith("127.") || ip.startsWith("10.") || ip.startsWith("192.168.")) {
            throw new UrlSecurityException("Target IP belongs to restricted address range: " + ip);
        }
    }

    /**
     * Extracts platform identifier from a valid host (e.g., example.com -> example).
     */
    public String extractPlatform(URI uri) {
        String host = uri.getHost().toLowerCase(Locale.ROOT);
        if (host.startsWith("www.")) {
            host = host.substring(4);
        }
        int dotIndex = host.indexOf('.');
        return dotIndex > 0 ? host.substring(0, dotIndex) : host;
    }
}
