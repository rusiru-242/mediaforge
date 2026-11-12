package com.mediaforge.backend.repository;

import com.mediaforge.backend.dto.response.PageResponse;
import com.mediaforge.backend.entity.MediaJob;
import com.mediaforge.backend.enums.JobStatus;
import com.mediaforge.backend.enums.JobType;
import com.mediaforge.backend.enums.SourceType;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.time.OffsetDateTime;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;

class InMemoryMediaJobRepositoryTest {

    private InMemoryMediaJobRepository repository;

    @BeforeEach
    void setUp() {
        repository = new InMemoryMediaJobRepository();
    }

    @Test
    @DisplayName("Should save, findById, and delete job in memory")
    void testBasicCrud() {
        MediaJob job = new MediaJob(UUID.randomUUID(), null, JobType.DOWNLOAD, SourceType.URL, null, "mp4");
        job.setStatus(JobStatus.PENDING);

        MediaJob saved = repository.save(job);
        assertNotNull(saved.getId());

        Optional<MediaJob> found = repository.findById(saved.getId());
        assertTrue(found.isPresent());
        assertEquals(saved.getId(), found.get().getId());

        assertEquals(1, repository.count());

        repository.deleteById(saved.getId());
        assertFalse(repository.findById(saved.getId()).isPresent());
        assertEquals(0, repository.count());
    }

    @Test
    @DisplayName("Should paginate jobs sorted by createdAt descending")
    void testPagination() {
        for (int i = 0; i < 5; i++) {
            MediaJob job = new MediaJob(UUID.randomUUID(), null, JobType.DOWNLOAD, SourceType.URL, null, "mp4");
            job.setCreatedAt(OffsetDateTime.now().minusMinutes(10 - i));
            repository.save(job);
        }

        PageResponse<MediaJob> page0 = repository.findAll(0, 2);
        assertEquals(2, page0.getContent().size());
        assertEquals(5, page0.getTotalElements());
        assertEquals(3, page0.getTotalPages());

        PageResponse<MediaJob> page2 = repository.findAll(2, 2);
        assertEquals(1, page2.getContent().size());
    }

    @Test
    @DisplayName("Should delete expired jobs")
    void testDeleteExpired() {
        MediaJob activeJob = new MediaJob(UUID.randomUUID(), null, JobType.DOWNLOAD, SourceType.URL, null, "mp4");
        activeJob.setExpiresAt(OffsetDateTime.now().plusHours(2));
        repository.save(activeJob);

        MediaJob expiredJob = new MediaJob(UUID.randomUUID(), null, JobType.DOWNLOAD, SourceType.URL, null, "mp4");
        expiredJob.setExpiresAt(OffsetDateTime.now().minusMinutes(5));
        repository.save(expiredJob);

        assertEquals(2, repository.count());

        repository.deleteExpired(OffsetDateTime.now());

        assertEquals(1, repository.count());
        assertTrue(repository.findById(activeJob.getId()).isPresent());
        assertFalse(repository.findById(expiredJob.getId()).isPresent());
    }
}
