package com.mediaforge.backend.downloader.service;

import com.mediaforge.backend.downloader.model.DownloadProgress;
import com.mediaforge.backend.downloader.model.DownloadTask;
import com.mediaforge.backend.downloader.model.DownloadedMedia;
import com.mediaforge.backend.downloader.model.ProgressCallback;
import com.mediaforge.backend.enums.JobStatus;
import com.mediaforge.backend.exception.UrlSecurityException;
import com.mediaforge.backend.validation.UrlSecurityValidator;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.io.BufferedInputStream;
import java.io.BufferedOutputStream;
import java.io.FileOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.net.HttpURLConnection;
import java.net.URI;
import java.net.URL;
import java.net.URLDecoder;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Locale;
import java.util.UUID;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Component
public class HttpDownloadClient {

    private static final Logger log = LoggerFactory.getLogger(HttpDownloadClient.class);

    private static final Pattern FILENAME_STAR_PATTERN = Pattern.compile("filename\\*=(?:UTF-8''|utf-8'')?([^;]+)", Pattern.CASE_INSENSITIVE);
    private static final Pattern FILENAME_PATTERN = Pattern.compile("filename=[\"']?([^\"';]+)[\"']?", Pattern.CASE_INSENSITIVE);

    private final UrlSecurityValidator urlSecurityValidator;

    @Value("${app.downloader.connect-timeout-ms:10000}")
    private int connectTimeoutMs;

    @Value("${app.downloader.read-timeout-ms:30000}")
    private int readTimeoutMs;

    @Value("${app.downloader.max-redirects:5}")
    private int maxRedirects;

    @Value("${app.downloader.max-file-size-bytes:524288000}")
    private long defaultMaxSizeBytes;

    @Value("${app.downloader.user-agent:MediaForge-Downloader/1.0}")
    private String userAgent;

    public HttpDownloadClient(UrlSecurityValidator urlSecurityValidator) {
        this.urlSecurityValidator = urlSecurityValidator;
    }

    /**
     * Executes safe HTTP HEAD request to probe media headers and metadata.
     */
    public HttpResponse probeHeaders(URI uri) throws IOException {
        URI currentUri = uri;
        int redirectCount = 0;

        while (redirectCount <= maxRedirects) {
            urlSecurityValidator.validateUri(currentUri);
            HttpURLConnection conn = openConnection(currentUri, "HEAD");
            int responseCode = conn.getResponseCode();

            if (isRedirect(responseCode)) {
                String location = conn.getHeaderField("Location");
                conn.disconnect();
                if (location == null || location.trim().isEmpty()) {
                    throw new IOException("Redirect received with missing Location header");
                }
                currentUri = currentUri.resolve(location.trim());
                redirectCount++;
                continue;
            }

            if (responseCode >= 400 && responseCode != 405) {
                conn.disconnect();
                throw new IOException("Target media server returned HTTP error: " + responseCode);
            }

            // Some servers return 405 Method Not Allowed for HEAD requests, fall back to GET
            if (responseCode == 405) {
                conn.disconnect();
                return probeWithGet(currentUri);
            }

            String contentType = conn.getContentType();
            long contentLength = conn.getContentLengthLong();
            String contentDisposition = conn.getHeaderField("Content-Disposition");
            conn.disconnect();

            return new HttpResponse(currentUri, responseCode, contentType, contentLength, contentDisposition);
        }

        throw new IOException("Too many redirects: exceeded maximum of " + maxRedirects);
    }

    private HttpResponse probeWithGet(URI uri) throws IOException {
        urlSecurityValidator.validateUri(uri);
        HttpURLConnection conn = openConnection(uri, "GET");
        conn.setRequestProperty("Range", "bytes=0-1");
        int responseCode = conn.getResponseCode();
        String contentType = conn.getContentType();
        long contentLength = conn.getContentLengthLong();
        String contentDisposition = conn.getHeaderField("Content-Disposition");
        conn.disconnect();

        return new HttpResponse(uri, responseCode, contentType, contentLength, contentDisposition);
    }

    /**
     * Downloads media safely into a local target file while tracking progress and enforcing limits.
     */
    public DownloadedMedia download(DownloadTask task, ProgressCallback progressCallback) throws IOException {
        URI currentUri = task.getSourceUri();
        int redirectCount = 0;
        long maxBytes = task.getMaxSizeBytes() > 0 ? task.getMaxSizeBytes() : defaultMaxSizeBytes;

        while (redirectCount <= maxRedirects) {
            if (task.isCancelled()) {
                throw new IOException("Download cancelled by user request");
            }

            urlSecurityValidator.validateUri(currentUri);
            HttpURLConnection conn = openConnection(currentUri, "GET");
            int responseCode = conn.getResponseCode();

            if (isRedirect(responseCode)) {
                String location = conn.getHeaderField("Location");
                conn.disconnect();
                if (location == null || location.trim().isEmpty()) {
                    throw new IOException("Redirect received with missing Location header");
                }
                currentUri = currentUri.resolve(location.trim());
                redirectCount++;
                continue;
            }

            if (responseCode != HttpURLConnection.HTTP_OK && responseCode != HttpURLConnection.HTTP_PARTIAL) {
                conn.disconnect();
                throw new IOException("Target media server returned HTTP status: " + responseCode);
            }

            long contentLength = conn.getContentLengthLong();
            if (contentLength > maxBytes) {
                conn.disconnect();
                throw new IOException(String.format("File size %d bytes exceeds maximum permitted limit of %d bytes",
                        contentLength, maxBytes));
            }

            String contentType = conn.getContentType();
            String contentDisposition = conn.getHeaderField("Content-Disposition");
            String originalFilename = extractFilename(currentUri, contentDisposition, contentType);
            String extension = extractExtension(originalFilename, contentType);

            String storedFilename = task.getJobId() + "." + extension;
            Path targetFile = task.getOutputPath().resolve(storedFilename);

            // Ensure parent directories exist
            Files.createDirectories(targetFile.getParent());

            long startTime = System.currentTimeMillis();
            long totalBytesRead = 0;
            byte[] buffer = new byte[16384]; // 16 KB chunks

            try (InputStream in = new BufferedInputStream(conn.getInputStream());
                 BufferedOutputStream out = new BufferedOutputStream(new FileOutputStream(targetFile.toFile()))) {

                int bytesRead;
                long lastReportTime = startTime;
                int lastReportPercent = -1;

                while ((bytesRead = in.read(buffer)) != -1) {
                    if (task.isCancelled()) {
                        cleanupFile(targetFile);
                        throw new IOException("Download cancelled by user request");
                    }

                    out.write(buffer, 0, bytesRead);
                    totalBytesRead += bytesRead;

                    if (totalBytesRead > maxBytes) {
                        cleanupFile(targetFile);
                        throw new IOException(String.format("Download exceeded maximum allowed size of %d bytes", maxBytes));
                    }

                    long now = System.currentTimeMillis();
                    int percent = contentLength > 0 ? (int) Math.min(99, (totalBytesRead * 100) / contentLength) : -1;

                    // Report progress every 300ms or when percent changes
                    if (progressCallback != null && (now - lastReportTime >= 300 || percent != lastReportPercent)) {
                        double elapsedSeconds = Math.max(0.001, (now - startTime) / 1000.0);
                        double speed = totalBytesRead / elapsedSeconds;

                        DownloadProgress progress = new DownloadProgress(
                                task.getJobId(),
                                totalBytesRead,
                                contentLength,
                                Math.max(0, percent),
                                speed,
                                JobStatus.PROCESSING,
                                String.format("Downloading media (%s / %s)",
                                        formatBytes(totalBytesRead),
                                        contentLength > 0 ? formatBytes(contentLength) : "unknown size")
                        );
                        progressCallback.onProgress(progress);
                        lastReportTime = now;
                        lastReportPercent = percent;
                    }
                }
                out.flush();
            } catch (Exception ex) {
                cleanupFile(targetFile);
                throw ex;
            } finally {
                conn.disconnect();
            }

            // Final 100% progress report
            if (progressCallback != null) {
                DownloadProgress finalProgress = new DownloadProgress(
                        task.getJobId(),
                        totalBytesRead,
                        totalBytesRead,
                        100,
                        0,
                        JobStatus.COMPLETED,
                        "Download complete"
                );
                progressCallback.onProgress(finalProgress);
            }

            String cleanMimeType = contentType != null ? contentType.split(";")[0].trim() : "application/octet-stream";
            return new DownloadedMedia(targetFile, originalFilename, storedFilename, cleanMimeType, totalBytesRead, extension);
        }

        throw new IOException("Too many redirects: exceeded maximum of " + maxRedirects);
    }

    private HttpURLConnection openConnection(URI uri, String method) throws IOException {
        URL url = uri.toURL();
        HttpURLConnection conn = (HttpURLConnection) url.openConnection();
        conn.setRequestMethod(method);
        conn.setConnectTimeout(connectTimeoutMs);
        conn.setReadTimeout(readTimeoutMs);
        conn.setInstanceFollowRedirects(false); // Handle redirects manually with SSRF checks!
        conn.setRequestProperty("User-Agent", userAgent);
        conn.setRequestProperty("Accept", "*/*");
        return conn;
    }

    private boolean isRedirect(int status) {
        return status == HttpURLConnection.HTTP_MOVED_PERM ||
                status == HttpURLConnection.HTTP_MOVED_TEMP ||
                status == HttpURLConnection.HTTP_SEE_OTHER ||
                status == 307 || status == 308;
    }

    private void cleanupFile(Path file) {
        try {
            Files.deleteIfExists(file);
        } catch (IOException ignored) {
        }
    }

    public String extractFilename(URI uri, String contentDisposition, String contentType) {
        if (contentDisposition != null && !contentDisposition.trim().isEmpty()) {
            Matcher starMatcher = FILENAME_STAR_PATTERN.matcher(contentDisposition);
            if (starMatcher.find()) {
                try {
                    String decoded = URLDecoder.decode(starMatcher.group(1).trim(), StandardCharsets.UTF_8);
                    return sanitizeFilename(decoded);
                } catch (Exception ignored) {
                }
            }

            Matcher stdMatcher = FILENAME_PATTERN.matcher(contentDisposition);
            if (stdMatcher.find()) {
                return sanitizeFilename(stdMatcher.group(1).trim());
            }
        }

        // Extract from path
        String path = uri.getPath();
        if (path != null && !path.trim().isEmpty() && !path.endsWith("/")) {
            int lastSlash = path.lastIndexOf('/');
            String name = lastSlash >= 0 ? path.substring(lastSlash + 1) : path;
            if (!name.trim().isEmpty()) {
                try {
                    String decoded = URLDecoder.decode(name, StandardCharsets.UTF_8);
                    return sanitizeFilename(decoded);
                } catch (Exception ignored) {
                    return sanitizeFilename(name);
                }
            }
        }

        String ext = inferExtensionFromMime(contentType);
        return "media_" + UUID.randomUUID().toString().substring(0, 8) + "." + ext;
    }

    public String sanitizeFilename(String filename) {
        if (filename == null || filename.trim().isEmpty()) {
            return "download";
        }
        // Remove directory traversal characters
        String clean = filename.replace("\\", "/");
        int lastSlash = clean.lastIndexOf('/');
        if (lastSlash >= 0) {
            clean = clean.substring(lastSlash + 1);
        }
        clean = clean.replaceAll("[^a-zA-Z0-9._-]", "_");
        if (clean.isEmpty() || clean.equals(".")) {
            clean = "download";
        }
        return clean;
    }

    public String extractExtension(String filename, String mimeType) {
        int dot = filename.lastIndexOf('.');
        if (dot > 0 && dot < filename.length() - 1) {
            String ext = filename.substring(dot + 1).toLowerCase(Locale.ROOT);
            if (ext.length() <= 5 && ext.matches("^[a-z0-9]+$")) {
                return ext;
            }
        }
        return inferExtensionFromMime(mimeType);
    }

    public String inferExtensionFromMime(String mimeType) {
        if (mimeType == null) return "bin";
        String clean = mimeType.toLowerCase(Locale.ROOT).split(";")[0].trim();
        return switch (clean) {
            case "video/mp4" -> "mp4";
            case "video/webm" -> "webm";
            case "video/x-matroska" -> "mkv";
            case "video/quicktime" -> "mov";
            case "video/x-msvideo" -> "avi";
            case "audio/mpeg" -> "mp3";
            case "audio/wav", "audio/x-wav" -> "wav";
            case "audio/flac" -> "flac";
            case "audio/aac" -> "aac";
            case "audio/mp4", "audio/x-m4a" -> "m4a";
            case "audio/ogg" -> "ogg";
            case "image/jpeg" -> "jpg";
            case "image/png" -> "png";
            case "image/webp" -> "webp";
            case "image/gif" -> "gif";
            case "image/bmp" -> "bmp";
            case "image/svg+xml" -> "svg";
            default -> "bin";
        };
    }

    private String formatBytes(long bytes) {
        if (bytes < 1024) return bytes + " B";
        int exp = (int) (Math.log(bytes) / Math.log(1024));
        char unit = "KMGTPE".charAt(exp - 1);
        return String.format("%.1f %sB", bytes / Math.pow(1024, exp), unit);
    }

    public static class HttpResponse {
        private final URI finalUri;
        private final int statusCode;
        private final String contentType;
        private final long contentLength;
        private final String contentDisposition;

        public HttpResponse(URI finalUri, int statusCode, String contentType, long contentLength, String contentDisposition) {
            this.finalUri = finalUri;
            this.statusCode = statusCode;
            this.contentType = contentType;
            this.contentLength = contentLength;
            this.contentDisposition = contentDisposition;
        }

        public URI getFinalUri() {
            return finalUri;
        }

        public int getStatusCode() {
            return statusCode;
        }

        public String getContentType() {
            return contentType;
        }

        public long getContentLength() {
            return contentLength;
        }

        public String getContentDisposition() {
            return contentDisposition;
        }
    }
}
