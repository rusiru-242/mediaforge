package com.mediaforge.backend.downloader.adapter;

import com.mediaforge.backend.downloader.model.DownloadTask;
import com.mediaforge.backend.downloader.model.DownloadedMedia;
import com.mediaforge.backend.downloader.model.MediaFormatOption;
import com.mediaforge.backend.downloader.model.MediaMetadata;
import com.mediaforge.backend.downloader.model.ProgressCallback;
import com.mediaforge.backend.downloader.service.HttpDownloadClient;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.net.URI;
import java.util.ArrayList;
import java.util.List;

@Component
@Order(100)
public class GenericWebSourceAdapter implements MediaSourceAdapter {

    private final HttpDownloadClient httpClient;

    public GenericWebSourceAdapter(HttpDownloadClient httpClient) {
        this.httpClient = httpClient;
    }

    @Override
    public String getSourceName() {
        return "Web Media Source";
    }

    @Override
    public boolean supports(URI uri) {
        return true; // Fallback adapter for all validated URIs
    }

    @Override
    public MediaMetadata extractMetadata(URI uri) throws IOException {
        HttpDownloadClient.HttpResponse response = httpClient.probeHeaders(uri);
        String contentType = response.getContentType();
        long contentLength = response.getContentLength();
        String contentDisposition = response.getContentDisposition();

        String filename = httpClient.extractFilename(uri, contentDisposition, contentType);
        String ext = httpClient.extractExtension(filename, contentType);

        String mediaType = "UNKNOWN";
        if (contentType != null) {
            if (contentType.startsWith("video/")) {
                mediaType = "VIDEO";
            } else if (contentType.startsWith("audio/")) {
                mediaType = "AUDIO";
            } else if (contentType.startsWith("image/")) {
                mediaType = "IMAGE";
            }
        }

        String title = filename;
        int dot = title.lastIndexOf('.');
        if (dot > 0) {
            title = title.substring(0, dot).replace('_', ' ').replace('-', ' ');
        }

        MediaMetadata metadata = new MediaMetadata(
                title,
                getSourceName(),
                mediaType,
                contentType != null ? contentType.split(";")[0].trim() : "application/octet-stream",
                ext,
                contentLength > 0 ? contentLength : null
        );
        metadata.setDirectStreamUri(uri.toString());

        List<MediaFormatOption> options = new ArrayList<>();
        options.add(new MediaFormatOption(
                ext,
                "Source Stream",
                null,
                metadata.getMimeType(),
                contentLength > 0 ? contentLength : null,
                true,
                false,
                ext.toUpperCase() + " (Direct Stream)"
        ));

        metadata.setAvailableFormats(options);
        metadata.setAvailableQualities(List.of("Source Stream"));
        return metadata;
    }

    @Override
    public DownloadedMedia download(DownloadTask task, ProgressCallback progressCallback) throws IOException {
        return httpClient.download(task, progressCallback);
    }
}

