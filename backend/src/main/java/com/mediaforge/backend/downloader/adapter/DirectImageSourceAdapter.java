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
@Order(20)
public class DirectImageSourceAdapter implements MediaSourceAdapter {

    private static final Logger log = LoggerFactory.getLogger(DirectImageSourceAdapter.class);

    private static final Set<String> IMAGE_EXTENSIONS = Set.of("jpg", "jpeg", "png", "webp", "gif", "bmp", "svg", "tiff");

    private final HttpDownloadClient httpClient;

    public DirectImageSourceAdapter(HttpDownloadClient httpClient) {
        this.httpClient = httpClient;
    }

    @Override
    public String getSourceName() {
        return "Direct Image";
    }

    @Override
    public boolean supports(URI uri) {
        String path = uri.getPath();
        if (path == null) return false;
        String lower = path.toLowerCase(Locale.ROOT);
        int dot = lower.lastIndexOf('.');
        if (dot > 0 && dot < lower.length() - 1) {
            String ext = lower.substring(dot + 1);
            return IMAGE_EXTENSIONS.contains(ext);
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

        String title = filename;
        int dot = title.lastIndexOf('.');
        if (dot > 0) {
            title = title.substring(0, dot).replace('_', ' ').replace('-', ' ');
        }

        String mimeType = contentType != null ? contentType.split(";")[0].trim() : "image/" + ext;

        MediaMetadata metadata = new MediaMetadata(
                title,
                getSourceName(),
                "IMAGE",
                mimeType,
                ext,
                contentLength > 0 ? contentLength : null
        );
        metadata.setDirectStreamUri(uri.toString());
        metadata.setThumbnailUri(uri.toString()); // For direct images, the thumbnail is the image itself
        metadata.setAvailableQualities(List.of("Original Resolution"));

        List<MediaFormatOption> formatOptions = new ArrayList<>();
        formatOptions.add(new MediaFormatOption(
                ext,
                "Original Resolution",
                "Source Dimensions",
                mimeType,
                contentLength > 0 ? contentLength : null,
                true,
                false,
                ext.toUpperCase() + " (Original Quality — Lossless Download)"
        ));

        // Format conversion options (Phase 05)
        if (!"webp".equalsIgnoreCase(ext)) {
            formatOptions.add(new MediaFormatOption("webp", "Original Resolution", "Source Dimensions", "image/webp", null, false, true, "WEBP (Requires Phase 05 Universal Converter)"));
        }
        if (!"png".equalsIgnoreCase(ext)) {
            formatOptions.add(new MediaFormatOption("png", "Original Resolution", "Source Dimensions", "image/png", null, false, true, "PNG (Requires Phase 05 Universal Converter)"));
        }
        if (!"jpg".equalsIgnoreCase(ext) && !"jpeg".equalsIgnoreCase(ext)) {
            formatOptions.add(new MediaFormatOption("jpg", "Original Resolution", "Source Dimensions", "image/jpeg", null, false, true, "JPEG (Requires Phase 05 Universal Converter)"));
        }

        metadata.setAvailableFormats(formatOptions);
        return metadata;
    }

    @Override
    public DownloadedMedia download(DownloadTask task, ProgressCallback progressCallback) throws IOException {
        log.info("Direct image adapter downloading media for job: {} from {}", task.getJobId(), task.getSourceUri());
        return httpClient.download(task, progressCallback);
    }
}

