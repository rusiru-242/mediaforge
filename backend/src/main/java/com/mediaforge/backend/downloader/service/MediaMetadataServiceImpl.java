package com.mediaforge.backend.downloader.service;

import com.mediaforge.backend.downloader.adapter.MediaSourceAdapter;
import com.mediaforge.backend.downloader.adapter.MediaSourceAdapterRegistry;
import com.mediaforge.backend.downloader.model.MediaFormatOption;
import com.mediaforge.backend.downloader.model.MediaMetadata;
import com.mediaforge.backend.validation.UrlSecurityValidator;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.io.IOException;
import java.net.URI;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ExecutionException;
import java.util.concurrent.Semaphore;
import java.util.concurrent.TimeUnit;

@Service
public class MediaMetadataServiceImpl implements MediaMetadataService {

    @Value("${app.downloader.metadata-concurrency:2}")
    private int concurrency = 2;

    @Value("${app.downloader.metadata-cache-ttl-seconds:60}")
    private int cacheTtlSeconds = 60;

    @Value("${app.downloader.metadata-cache-max-entries:128}")
    private int cacheMaxEntries = 128;

    private Semaphore slots;
    private final Map<String, CachedMetadata> metadataCache = new LinkedHashMap<>(16, 0.75f, true);
    private final Map<String, CompletableFuture<MediaMetadata>> inFlight = new ConcurrentHashMap<>();

    private final UrlSecurityValidator urlValidator;
    private final MediaSourceAdapterRegistry adapterRegistry;

    public MediaMetadataServiceImpl(UrlSecurityValidator urlValidator, MediaSourceAdapterRegistry adapterRegistry) {
        this.urlValidator = urlValidator;
        this.adapterRegistry = adapterRegistry;
    }

    @jakarta.annotation.PostConstruct
    synchronized void init() {
        slots = new Semaphore(Math.max(1, Math.min(16, concurrency)));
    }

    @Override
    public MediaMetadata extractMetadata(String url) throws IOException {
        if (slots == null) init();

        URI validatedUri = urlValidator.validate(url);
        String cacheKey = validatedUri.toString();
        MediaMetadata cached = getCached(cacheKey);
        if (cached != null) return cached;

        CompletableFuture<MediaMetadata> newRequest = new CompletableFuture<>();
        CompletableFuture<MediaMetadata> currentRequest = inFlight.putIfAbsent(cacheKey, newRequest);
        if (currentRequest != null) return await(currentRequest);

        if (!slots.tryAcquire()) {
            ResponseStatusException busy = new ResponseStatusException(
                    HttpStatus.SERVICE_UNAVAILABLE, "Metadata workers are busy. Retry later.");
            newRequest.completeExceptionally(busy);
            inFlight.remove(cacheKey, newRequest);
            throw busy;
        }

        try {
            MediaSourceAdapter adapter = adapterRegistry.getAdapter(validatedUri);
            MediaMetadata metadata = adapter.extractMetadata(validatedUri);
            cacheSuccessfulMetadata(cacheKey, metadata);
            newRequest.complete(copyMetadata(metadata));
            return copyMetadata(metadata);
        } catch (IOException | RuntimeException ex) {
            newRequest.completeExceptionally(ex);
            throw ex;
        } finally {
            slots.release();
            inFlight.remove(cacheKey, newRequest);
        }
    }

    private MediaMetadata await(CompletableFuture<MediaMetadata> request) throws IOException {
        try {
            return copyMetadata(request.get());
        } catch (InterruptedException ex) {
            Thread.currentThread().interrupt();
            throw new IOException("Interrupted while waiting for media metadata.", ex);
        } catch (ExecutionException ex) {
            Throwable cause = ex.getCause();
            if (cause instanceof IOException ioException) throw ioException;
            if (cause instanceof RuntimeException runtimeException) throw runtimeException;
            throw new IOException("Media metadata extraction failed.", cause);
        }
    }

    private MediaMetadata getCached(String key) {
        synchronized (metadataCache) {
            CachedMetadata cached = metadataCache.get(key);
            if (cached == null) return null;
            if (cached.expiresAtNanos() - System.nanoTime() <= 0) {
                metadataCache.remove(key);
                return null;
            }
            return copyMetadata(cached.metadata());
        }
    }

    private void cacheSuccessfulMetadata(String key, MediaMetadata metadata) {
        int ttlSeconds = Math.max(0, Math.min(600, cacheTtlSeconds));
        int maxEntries = Math.max(0, Math.min(1024, cacheMaxEntries));
        if (ttlSeconds == 0 || maxEntries == 0 || metadata == null
                || metadata.getDirectStreamUri() != null
                || metadata.getAvailableFormats() == null
                || metadata.getAvailableFormats().isEmpty()) {
            return;
        }

        long expiry = System.nanoTime() + TimeUnit.SECONDS.toNanos(ttlSeconds);
        synchronized (metadataCache) {
            metadataCache.put(key, new CachedMetadata(copyMetadata(metadata), expiry));
            while (metadataCache.size() > maxEntries) {
                String eldest = metadataCache.keySet().iterator().next();
                metadataCache.remove(eldest);
            }
        }
    }

    private static MediaMetadata copyMetadata(MediaMetadata source) {
        if (source == null) return null;
        MediaMetadata copy = new MediaMetadata();
        copy.setTitle(source.getTitle());
        copy.setSourceName(source.getSourceName());
        copy.setMediaType(source.getMediaType());
        copy.setMimeType(source.getMimeType());
        copy.setContainerFormat(source.getContainerFormat());
        copy.setFileSize(source.getFileSize());
        copy.setWidth(source.getWidth());
        copy.setHeight(source.getHeight());
        copy.setDurationSeconds(source.getDurationSeconds());
        copy.setResolution(source.getResolution());
        copy.setThumbnailUri(source.getThumbnailUri());
        copy.setAvailableFormats(source.getAvailableFormats() == null ? null
                : source.getAvailableFormats().stream().map(MediaMetadataServiceImpl::copyFormat).toList());
        copy.setAvailableQualities(source.getAvailableQualities() == null ? null
                : new ArrayList<>(source.getAvailableQualities()));
        copy.setRequiresConversion(source.isRequiresConversion());
        copy.setDirectStreamUri(source.getDirectStreamUri());
        copy.setMessage(source.getMessage());
        return copy;
    }

    private static MediaFormatOption copyFormat(MediaFormatOption source) {
        return new MediaFormatOption(source.getFormat(), source.getQuality(), source.getResolution(),
                source.getMimeType(), source.getEstimatedBytes(), source.isNativeStream(),
                source.isRequiresConversion(), source.getLabel());
    }

    private record CachedMetadata(MediaMetadata metadata, long expiresAtNanos) {}
}
