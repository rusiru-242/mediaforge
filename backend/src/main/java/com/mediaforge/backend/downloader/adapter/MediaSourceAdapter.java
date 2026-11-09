package com.mediaforge.backend.downloader.adapter;

import com.mediaforge.backend.downloader.model.DownloadTask;
import com.mediaforge.backend.downloader.model.DownloadedMedia;
import com.mediaforge.backend.downloader.model.MediaMetadata;
import com.mediaforge.backend.downloader.model.ProgressCallback;

import java.io.IOException;
import java.net.URI;

public interface MediaSourceAdapter {

    /**
     * Human-readable name of the source adapter.
     */
    String getSourceName();

    /**
     * Checks if this adapter can handle the given target URI.
     */
    boolean supports(URI uri);

    /**
     * Retrieves genuine media metadata (title, size, format, qualities) for the URI.
     */
    MediaMetadata extractMetadata(URI uri) throws IOException;

    /**
     * Executes the media download for the given task and reports progress.
     */
    DownloadedMedia download(DownloadTask task, ProgressCallback progressCallback) throws IOException;
}
