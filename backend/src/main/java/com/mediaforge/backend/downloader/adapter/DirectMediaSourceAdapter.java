package com.mediaforge.backend.downloader.adapter;

import com.mediaforge.backend.downloader.model.DownloadTask;
import com.mediaforge.backend.downloader.model.DownloadedMedia;
import com.mediaforge.backend.downloader.model.MediaFormatOption;
import com.mediaforge.backend.downloader.model.MediaMetadata;
import com.mediaforge.backend.downloader.model.ProgressCallback;
import com.mediaforge.backend.downloader.service.HttpDownloadClient;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.net.URI;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.Set;

@Component
@Order(10)
public class DirectMediaSourceAdapter implements MediaSourceAdapter {

    private static final Logger log = LoggerFactory.getLogger(DirectMediaSourceAdapter.class);

    private static final Set<String> VIDEO_EXTENSIONS = Set.of("mp4", "webm", "mkv", "avi", "mov", "flv", "m4v");
    private static final Set<String> AUDIO_EXTENSIONS = Set.of("mp3", "wav", "flac", "aac", "m4a", "ogg", "wma");

    private final HttpDownloadClient httpClient;

    public DirectMediaSourceAdapter(HttpDownloadClient httpClient) {
        this.httpClient = httpClient;
    }

    @Override
    public String getSourceName() {
        return "Direct Media Stream";
    }

    @Override
    public boolean supports(URI uri) {
        String path = uri.getPath();
        if (path == null) return false;
        String lower = path.toLowerCase(Locale.ROOT);
        int dot = lower.lastIndexOf('.');
        if (dot > 0 && dot < lower.length() - 1) {
            String ext = lower.substring(dot + 1);
            return VIDEO_EXTENSIONS.contains(ext) || AUDIO_EXTENSIONS.contains(ext);
        }
        return false;
    }

    @Override
    public MediaMetadata extractMetadata(URI uri) throws IOException {
        HttpDownloadClient.HttpResponse response = httpClient.probeHeaders(uri);
        String contentType = response.getContentType();
        long contentLength = response.getContentLength();
        String contentDisposition = response.getContentDisposition();

        String filename = httpClient.extractFilename(uri, contentDisposition, contentType);
        String ext = httpClient.extractExtension(filename, contentType);

        boolean isAudio = AUDIO_EXTENSIONS.contains(ext) || (contentType != null && contentType.startsWith("audio/"));
        String mediaType = isAudio ? "AUDIO" : "VIDEO";

        String title = filename;
        int dot = title.lastIndexOf('.');
        if (dot > 0) {
            title = title.substring(0, dot).replace('_', ' ').replace('-', ' ');
        }

        MediaMetadata metadata = new MediaMetadata(
                title,
                getSourceName(),
                mediaType,
                contentType != null ? contentType.split(";")[0].trim() : (isAudio ? "audio/" + ext : "video/" + ext),
                ext,
                contentLength > 0 ? contentLength : null
        );
        metadata.setDirectStreamUri(uri.toString());

        // Detect resolution if encoded in URL/filename (e.g. 1080p, 720p, 4K)
        String detectedQuality = "Original (Source Stream)";
        String lowerName = filename.toLowerCase(Locale.ROOT);
        if (lowerName.contains("2160p") || lowerName.contains("4k")) {
            detectedQuality = "2160p (4K)";
            metadata.setResolution("3840x2160");
        } else if (lowerName.contains("1440p") || lowerName.contains("2k")) {
            detectedQuality = "1440p (2K)";
            metadata.setResolution("2560x1440");
        } else if (lowerName.contains("1080p")) {
            detectedQuality = "1080p (Full HD)";
            metadata.setResolution("1920x1080");
        } else if (lowerName.contains("720p")) {
            detectedQuality = "720p (HD)";
            metadata.setResolution("1280x720");
        } else if (lowerName.contains("480p")) {
            detectedQuality = "480p (SD)";
            metadata.setResolution("854x480");
        } else if (isAudio) {
            detectedQuality = "Source Audio Fidelity";
        }
        metadata.setAvailableQualities(List.of(detectedQuality));

        List<MediaFormatOption> formatOptions = new ArrayList<>();
        // Native format (instant download, no conversion needed)
        formatOptions.add(new MediaFormatOption(
                ext,
                detectedQuality,
                metadata.getResolution(),
                metadata.getMimeType(),
                contentLength > 0 ? contentLength : null,
                true,
                false,
                ext.toUpperCase() + " (Direct Stream — Native Quality)"
        ));

        // Format options requiring Phase 05 conversion
        if (!isAudio) {
            if (!"mp4".equalsIgnoreCase(ext)) {
                formatOptions.add(new MediaFormatOption("mp4", detectedQuality, metadata.getResolution(), "video/mp4", null, false, true, "MP4 (Requires Phase 05 Universal Converter)"));
            }
            if (!"webm".equalsIgnoreCase(ext)) {
                formatOptions.add(new MediaFormatOption("webm", detectedQuality, metadata.getResolution(), "video/webm", null, false, true, "WEBM (Requires Phase 05 Universal Converter)"));
            }
            formatOptions.add(new MediaFormatOption("mp3", "192 kbps", null, "audio/mpeg", null, false, true, "MP3 Audio Extraction (Requires Phase 05 Universal Converter)"));
        } else {
            if (!"mp3".equalsIgnoreCase(ext)) {
                formatOptions.add(new MediaFormatOption("mp3", "320 kbps", null, "audio/mpeg", null, false, true, "MP3 (Requires Phase 05 Universal Converter)"));
            }
        }

        metadata.setAvailableFormats(formatOptions);
        return metadata;
    }

    @Override
    public DownloadedMedia download(DownloadTask task, ProgressCallback progressCallback) throws IOException {
        log.info("Direct media adapter downloading stream for job: {} from {}", task.getJobId(), task.getSourceUri());
        return httpClient.download(task, progressCallback);
    }
}
