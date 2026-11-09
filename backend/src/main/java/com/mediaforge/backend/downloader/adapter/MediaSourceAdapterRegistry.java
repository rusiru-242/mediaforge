package com.mediaforge.backend.downloader.adapter;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;

import java.net.URI;
import java.util.List;

@Component
public class MediaSourceAdapterRegistry {

    private static final Logger log = LoggerFactory.getLogger(MediaSourceAdapterRegistry.class);

    private final List<MediaSourceAdapter> adapters;

    public MediaSourceAdapterRegistry(List<MediaSourceAdapter> adapters) {
        this.adapters = adapters;
    }

    /**
     * Resolves the appropriate source adapter for a given URI.
     */
    public MediaSourceAdapter getAdapter(URI uri) {
        for (MediaSourceAdapter adapter : adapters) {
            if (adapter.supports(uri)) {
                log.debug("Selected adapter '{}' for URI {}", adapter.getSourceName(), uri);
                return adapter;
            }
        }
        throw new IllegalArgumentException("No media source adapter available for URI: " + uri);
    }

    public List<MediaSourceAdapter> getAdapters() {
        return adapters;
    }
}

