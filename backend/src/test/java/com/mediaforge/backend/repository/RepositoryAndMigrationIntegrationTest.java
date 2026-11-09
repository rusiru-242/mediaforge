package com.mediaforge.backend.repository;

import com.mediaforge.backend.entity.MediaJob;
import com.mediaforge.backend.entity.User;
import com.mediaforge.backend.enums.JobStatus;
import com.mediaforge.backend.enums.JobType;
import com.mediaforge.backend.enums.SourceType;
import com.mediaforge.backend.enums.UserRole;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.test.context.ActiveProfiles;

import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;

@DataJpaTest
@ActiveProfiles("test")
class RepositoryAndMigrationIntegrationTest {

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private MediaJobRepository jobRepository;

    @Test
    @DisplayName("Should persist and retrieve User entity with constraints")
    void testUserPersistence() {
        User user = new User(UUID.randomUUID(), "testuser", "test@mediaforge.app", "hashed_pwd", UserRole.ROLE_USER);
        User saved = userRepository.save(user);

        assertNotNull(saved.getId());
        Optional<User> found = userRepository.findByEmail("test@mediaforge.app");
        assertTrue(found.isPresent());
        assertEquals("testuser", found.get().getUsername());
        assertTrue(userRepository.existsByUsername("testuser"));
    }

    @Test
    @DisplayName("Should persist MediaJob entity linked to User")
    void testMediaJobPersistence() {
        User user = userRepository.save(new User(UUID.randomUUID(), "jobuser", "jobuser@mediaforge.app", "hashed_pwd", UserRole.ROLE_USER));

        MediaJob job = new MediaJob(UUID.randomUUID(), user, JobType.DOWNLOAD, SourceType.URL, null, "mp4");
        job.setStatus(JobStatus.PENDING);
        job.setProgress(0);

        MediaJob savedJob = jobRepository.save(job);
        assertNotNull(savedJob.getId());
        assertNotNull(savedJob.getCreatedAt());

        Optional<MediaJob> foundJob = jobRepository.findById(savedJob.getId());
        assertTrue(foundJob.isPresent());
        assertEquals(JobStatus.PENDING, foundJob.get().getStatus());
        assertEquals("jobuser@mediaforge.app", foundJob.get().getUser().getEmail());
    }
}

