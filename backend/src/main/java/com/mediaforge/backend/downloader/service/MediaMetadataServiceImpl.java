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

    private final UrlSecurityValidator urlValidator;
    private final MediaSourceAdapterRegistry adapterRegistry;

    public MediaMetadataServiceImpl(UrlSecurityValidator urlValidator, MediaSourceAdapterRegistry adapterRegistry) {
        this.urlValidator = urlValidator;
        this.adapterRegistry = adapterRegistry;
    }

    @Override
    public MediaMetadata extractMetadata(String url) throws IOException {
        URI validatedUri = urlValidator.validate(url);
        MediaSourceAdapter adapter = adapterRegistry.getAdapter(validatedUri);
        return adapter.extractMetadata(validatedUri);
    }
}

