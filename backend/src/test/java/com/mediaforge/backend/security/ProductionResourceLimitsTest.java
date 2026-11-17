package com.mediaforge.backend.security;

import com.mediaforge.backend.converter.model.ConversionProgress;
import com.mediaforge.backend.converter.service.ConversionProgressServiceImpl;
import com.mediaforge.backend.downloader.adapter.*;
import com.mediaforge.backend.downloader.service.MediaMetadataServiceImpl;
import com.mediaforge.backend.entity.*;
import com.mediaforge.backend.enums.*;
import com.mediaforge.backend.repository.*;
import com.mediaforge.backend.validation.UrlSecurityValidator;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.web.server.ResponseStatusException;
import java.net.URI;
import java.time.OffsetDateTime;
import java.util.*;
import java.util.concurrent.*;
import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;

class ProductionResourceLimitsTest {
    @Test void metadataRequestsHaveBoundedConcurrencyAndReleaseSlots() throws Exception {
        var validator = mock(UrlSecurityValidator.class);
        var registry = mock(MediaSourceAdapterRegistry.class);
        var adapter = mock(MediaSourceAdapter.class);
        var uri = URI.create("https://www.youtube.com/watch?v=owned");
        when(validator.validate(anyString())).thenReturn(uri);
        when(registry.getAdapter(uri)).thenReturn(adapter);
        var entered = new CountDownLatch(1); var release = new CountDownLatch(1);
        when(adapter.extractMetadata(uri)).thenAnswer(call -> { entered.countDown(); release.await(5, TimeUnit.SECONDS); return null; });
        var service = new MediaMetadataServiceImpl(validator, registry);
        ReflectionTestUtils.setField(service, "concurrency", 1);
        ReflectionTestUtils.invokeMethod(service, "init");
        try (var executor = Executors.newSingleThreadExecutor()) {
            var first = executor.submit(() -> service.extractMetadata(uri.toString()));
            try {
                assertThat(entered.await(3, TimeUnit.SECONDS)).isTrue();
                assertThatThrownBy(() -> service.extractMetadata(uri.toString()))
                        .isInstanceOf(ResponseStatusException.class);
            } finally { release.countDown(); }
            first.get(5, TimeUnit.SECONDS);
            assertThatCode(() -> service.extractMetadata(uri.toString())).doesNotThrowAnyException();
        }
    }
    @Test void sseSubscriptionsAreBoundedAndTerminalProgressExpires() {
        var progress = new ConversionProgressServiceImpl();
        var id = UUID.randomUUID();
        for (int i = 0; i < 8; i++) progress.subscribe(id);
        assertThatThrownBy(() -> progress.subscribe(id)).isInstanceOf(ResponseStatusException.class);
        progress.updateProgress(id, new ConversionProgress(id, JobStatus.COMPLETED, 100, "Done", 0, 0L, 10L));
        @SuppressWarnings("unchecked")
        var timestamps = (Map<UUID, Long>) ReflectionTestUtils.getField(progress, "updatedAt");
        timestamps.put(id, 0L);
        progress.cleanupExpiredProgress();
        assertThat(progress.getProgress(id)).isNull();
    }
    @Test void expiredAuxiliaryRecordsDoNotHoldEntireJobGraphsForever() {
        var job = new MediaJob(UUID.randomUUID(), JobType.DOWNLOAD, SourceType.URL, null, "mp4");
        job.setExpiresAt(OffsetDateTime.now().minusDays(1));
        var events = new InMemoryJobEventRepository();
        events.save(new JobEvent(UUID.randomUUID(), job, "DONE", "Done"));
        events.cleanupExpiredReferences();
        assertThat(events.findByJobIdOrderByCreatedAtAsc(job.getId())).isEmpty();
    }
}
