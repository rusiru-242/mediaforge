package com.mediaforge.backend.downloader.service;

import com.mediaforge.backend.downloader.adapter.MediaSourceAdapter;
import com.mediaforge.backend.downloader.adapter.MediaSourceAdapterRegistry;
import com.mediaforge.backend.downloader.model.MediaMetadata;
import com.mediaforge.backend.validation.UrlSecurityValidator;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.net.URI;

@Service
public class MediaMetadataServiceImpl implements MediaMetadataService {

    @org.springframework.beans.factory.annotation.Value("${app.downloader.metadata-concurrency:2}")
    private int concurrency = 2;
    private java.util.concurrent.Semaphore slots;

    @jakarta.annotation.PostConstruct
    void init() { slots = new java.util.concurrent.Semaphore(Math.max(1, Math.min(16, concurrency))); }

    private final UrlSecurityValidator urlValidator;
    private final MediaSourceAdapterRegistry adapterRegistry;

    public MediaMetadataServiceImpl(UrlSecurityValidator urlValidator, MediaSourceAdapterRegistry adapterRegistry) {
        this.urlValidator = urlValidator;
        this.adapterRegistry = adapterRegistry;
    }

    @Override
    public MediaMetadata extractMetadata(String url) throws IOException {
        // Direct unit construction remains supported, using the same bounded defaults.
        if (slots == null) init();
        if (!slots.tryAcquire()) throw new org.springframework.web.server.ResponseStatusException(
                org.springframework.http.HttpStatus.SERVICE_UNAVAILABLE, "Metadata workers are busy. Retry later.");
        try {
            URI validatedUri = urlValidator.validate(url);
            MediaSourceAdapter adapter = adapterRegistry.getAdapter(validatedUri);
            return adapter.extractMetadata(validatedUri);
        } finally { slots.release(); }
    }
}
