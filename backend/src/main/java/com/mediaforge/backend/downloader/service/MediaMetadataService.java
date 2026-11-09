package com.mediaforge.backend.downloader.service;

import com.mediaforge.backend.downloader.model.MediaMetadata;

import java.io.IOException;

public interface MediaMetadataService {

    /**
     * Inspects a media URL safely and returns genuine metadata.
     */
    MediaMetadata extractMetadata(String url) throws IOException;
}
