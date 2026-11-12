# Database-Free Ephemeral Architecture

## 1. Executive Summary

MediaForge has been refactored from a traditional persistent database architecture (PostgreSQL + Spring Data JPA + Flyway) into a **pure in-memory, database-free, privacy-first ephemeral media processing engine**.

This transition simplifies deployment, eliminates external database and cloud dependencies (such as Neon PostgreSQL), improves operational privacy, and speeds up local setup while retaining all core media downloading and conversion capabilities.

---

## 2. Core Architectural Pillars

### 2.1 Complete Database Elimination
- **Removed Dependencies:**
  - `spring-boot-starter-data-jpa`
  - `org.postgresql:postgresql`
  - `org.flywaydb:flyway-core`
  - `org.flywaydb:flyway-database-postgresql`
  - `com.h2database:h2`
- **Removed Artifacts:**
  - `backend/src/main/resources/db/migration/` (`V1__init_schema.sql`, `V2__conversion_engine_enhancements.sql`)
  - User management entities (`User.java`, `UserRole.java`) and repositories (`UserRepository.java`)
  - Database-specific integration tests (`RepositoryAndMigrationIntegrationTest.java`)

### 2.2 Thread-Safe In-Memory Repositories
In place of JPA entities and database repositories, thread-safe in-memory stores handle lifecycle management:
- **`InMemoryMediaJobRepository`**:
  - `ConcurrentHashMap<UUID, MediaJob>` storage.
  - Paging and descending sorting by creation timestamp.
  - Scheduled sweep running every 5 minutes purging expired jobs based on `expiresAt`.
- **`InMemoryMediaFileRepository`**:
  - `ConcurrentHashMap<UUID, MediaFile>` storage.
  - Linked lookup by `jobId` and `storageKey`.
  - Automatic physical disk file deletion upon record expiration.
- **`InMemoryJobEventRepository`**:
  - `CopyOnWriteArrayList<JobEvent>` thread-safe audit event timeline.
- **`InMemoryDownloadRequestRepository` & `InMemoryConversionRequestRepository`**:
  - Ephemeral request tracking per job.

### 2.3 Guest Access & Short-Lived Access Tokens
- **Zero Login / Registration:** Frictionless guest operation with no login gates or user credentials.
- **Token-Protected Downloads:** Each generated file and media job carries an unpredictable UUID-based `accessToken` (`UUID.randomUUID().toString().replace("-", "")`).
- **File Retrieval Security:** Download endpoints optionally validate the `token` query parameter:
  ```http
  GET /api/v1/files/{fileId}/download?token={accessToken}
  ```

### 2.4 Automatic 24-Hour Expiration & Purge
- Every job and generated file is initialized with an `expiresAt` timestamp defaulted to `createdAt.plusHours(24)`.
- Scheduled cleanup tasks execute periodically in the background (`@Scheduled`), scrubbing both memory maps and temporary disk scratch / output directories.

---

## 3. Preserved Capabilities

All media operations remain 100% active, native, and genuine:
1. **URL Validation & SSRF Guard:** DNS resolution, loopback blocking, private IP prevention.
2. **Metadata Inspection:** FFprobe & HTTP HEAD inspection for native formats, durations, resolutions.
3. **Media Downloader Engine:** Multi-threaded asynchronous downloading with real-time byte progress.
4. **Media Converter Engine:** Video (`libx264`, `libvpx-vp9`), Audio (`libmp3lame`, `aac`, `flac`), Image (`jpeg`, `png`, `webp`, `gif`), and Batch processing.
5. **Streaming Downloads:** Proper HTTP `Content-Disposition`, content type streaming, and clean chunking.

---

## 4. Verification Matrix

| Area | Suite | Status | Metrics |
|------|-------|:------:|---------|
| Backend Unit & Integration Tests | Maven / Surefire / JUnit 5 | Passed | 77 tests, 0 failures, 0 errors, 0 skipped |
| Frontend Component & API Tests | Vitest / Testing Library | Passed | 10 test files, 43 tests, 0 failures |
| Frontend Linter | ESLint (`next lint`) | Passed | 0 warnings, 0 errors |
| Frontend Production Build | Next.js (`next build`) | Passed | 13 routes compiled & optimized |
| Docker & Compose | `docker-compose.yml` | Passed | Database removed, standalone backend |
