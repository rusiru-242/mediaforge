# MediaForge — System Architecture

**Document Version:** 1.0.0
**Phase:** 01 — Foundation & Architecture
**Last Updated:** 2026-11-09
**Status:** Draft

---

## Table of Contents

1. [System Overview](#1-system-overview)
2. [Architecture Principles](#2-architecture-principles)
3. [Component Architecture](#3-component-architecture)
4. [Frontend-Backend Communication](#4-frontend-backend-communication)
5. [REST API Architecture](#5-rest-api-architecture)
6. [Database Architecture](#6-database-architecture)
7. [Media Processing Architecture](#7-media-processing-architecture)
8. [Background Job Processing](#8-background-job-processing)
9. [File Storage Architecture](#9-file-storage-architecture)
10. [Authorized Source Adapter Architecture](#10-authorized-source-adapter-architecture)
11. [Security Architecture](#11-security-architecture)
12. [Deployment Architecture](#12-deployment-architecture)
13. [Architecture Decision Records](#13-architecture-decision-records)

---

## 1. System Overview

MediaForge is built as a **monorepo** containing multiple independent applications that share infrastructure and communicate over well-defined API contracts.

### High-Level Components

```
┌─────────────────────────────────────────────────────────────────┐
│                     CLIENT LAYER                                │
│  ┌──────────────┐  ┌─────────────────┐  ┌──────────────────┐   │
│  │  Next.js Web  │  │  Flutter Desktop │  │  Flutter Mobile   │   │
│  │  (Browser)    │  │  (Win/Mac/Linux) │  │  (Android/iOS)    │   │
│  └──────┬───────┘  └────────┬────────┘  └────────┬─────────┘   │
└─────────┼──────────────────-┼─────────────────────┼─────────────┘
          │  HTTPS/REST       │  HTTPS/REST          │ HTTPS/REST
          │  WebSocket        │  (online mode)       │ (online mode)
          ▼                   ▼                      ▼
┌─────────────────────────────────────────────────────────────────┐
│                     API GATEWAY / REVERSE PROXY                 │
│                     (Nginx / Cloud LB)                          │
└──────────────────────────┬──────────────────────────────────────┘
                           │
          ┌────────────────▼────────────────┐
          │      BACKEND API LAYER           │
          │   Spring Boot 3 + Java 21        │
          │   Spring Security + JWT          │
          │   Spring Data JPA                │
          │   WebSocket (Progress)           │
          └────────┬──────────────┬──────────┘
                   │              │
          ┌────────▼──┐    ┌──────▼─────┐
          │ PostgreSQL │    │   Redis     │
          │  (Primary  │    │  (Queue +   │
          │   DB)      │    │   Cache)    │
          └───────────┘    └──────┬──────┘
                                  │
          ┌───────────────────────▼──────────────────────┐
          │              WORKER LAYER                     │
          │       media-processor workers                 │
          │       FFmpeg / FFprobe invocation             │
          └───────────────────────┬──────────────────────┘
                                  │
          ┌───────────────────────▼──────────────────────┐
          │              STORAGE LAYER                    │
          │       Local Filesystem / S3-compatible        │
          └──────────────────────────────────────────────┘
```

---

## 2. Architecture Principles

| Principle | Description |
|-----------|-------------|
| **Separation of Concerns** | Each layer has a single, well-defined responsibility. |
| **Stateless API** | The backend API is stateless; all state lives in DB/Redis. |
| **API-First Design** | All functionality is exposed via versioned REST APIs. |
| **Offline-Capable Clients** | Desktop and mobile apps function without backend connectivity for conversion. |
| **Configuration over Code** | Behavior is controlled by environment variables, not hardcoded values. |
| **Security by Default** | All endpoints require authorization unless explicitly opened. |
| **Fail Fast & Recover** | Workers detect and recover from failures automatically. |
| **Observability** | All components emit structured logs and health metrics. |

---

## 3. Component Architecture

### 3.1 Backend (Spring Boot)

**Package Structure:**
```
com.mediaforge.api/
├── config/           # Spring configuration classes
├── controller/       # REST controllers (v1)
│   ├── AuthController
│   ├── DownloadController
│   ├── ConversionController
│   ├── JobController
│   └── AdminController
├── service/          # Business logic
│   ├── AuthService
│   ├── DownloadService
│   ├── ConversionService
│   ├── JobService
│   ├── StorageService
│   └── NotificationService
├── repository/       # JPA repositories
├── entity/           # JPA entities
├── dto/              # Data transfer objects (request/response)
├── exception/        # Custom exceptions + global handler
├── security/         # JWT, filters, security config
├── adapter/          # Source adapters (pluggable)
│   ├── SourceAdapter (interface)
│   ├── AdapterRegistry
│   └── impl/         # Concrete adapter implementations
├── job/              # Background job definitions
└── util/             # Utility classes
```

### 3.2 Worker Service

**Responsibilities:**
- Poll Redis job queue for pending jobs.
- Invoke FFmpeg with appropriate parameters.
- Report progress back to Redis (job status channel).
- Upload output files to storage.
- Update job status in the database via REST callback or direct DB access.

### 3.3 Web (Next.js)

**Directory Structure:**
```
web/
├── app/              # Next.js App Router
│   ├── (public)/     # Unauthenticated pages
│   ├── (auth)/       # Authentication pages
│   └── (dashboard)/  # Authenticated pages
├── components/       # Reusable React components
├── lib/              # API client, utilities
├── hooks/            # Custom React hooks
├── store/            # State management (Zustand/Context)
├── types/            # TypeScript type definitions
└── styles/           # Global styles
```

### 3.4 Flutter Application

**Architecture Pattern:** Clean Architecture with BLoC state management

```
apps/flutter_app/lib/
├── core/             # Shared utilities, theme, router
├── data/             # Data layer (repositories, models, data sources)
│   ├── local/        # Local SQLite / FFI operations
│   └── remote/       # HTTP API client
├── domain/           # Business logic (use cases, entities, interfaces)
└── presentation/     # UI layer (screens, widgets, BLoCs)
    ├── download/
    ├── convert/
    ├── history/
    └── settings/
```

---

## 4. Frontend-Backend Communication

### 4.1 REST API (Primary)

- **Protocol:** HTTPS
- **Format:** JSON (application/json)
- **Authentication:** Bearer JWT in `Authorization` header
- **Versioning:** URL prefix `/api/v1/`
- **Error format:** RFC 7807 Problem Details

### 4.2 WebSocket (Real-time Progress)

- **Protocol:** WSS (WebSocket over TLS)
- **Path:** `/ws/jobs/{jobId}`
- **Purpose:** Push real-time job progress updates to clients
- **Fallback:** HTTP polling every 2 seconds if WebSocket unavailable

### 4.3 File Transfer

- **Upload:** `multipart/form-data` POST to `/api/v1/convert/upload`
- **Download:** Signed URL redirect to storage (S3 pre-signed URL or local file endpoint)
- **Max upload size:** 2 GB (configurable)
- **Chunked upload:** Supported for files > 100 MB via TUS protocol (Phase 05+)

---

## 5. REST API Architecture

### 5.1 API Design Standards

- **Base URL:** `https://api.mediaforge.app/api/v1/`
- **HTTP Methods:** GET (read), POST (create), PUT (full update), PATCH (partial update), DELETE
- **Status Codes:** Standard HTTP codes; `2xx` success, `4xx` client error, `5xx` server error
- **Pagination:** Cursor-based for large collections; `?page=1&size=20`
- **Filtering:** Query parameters (e.g., `?status=COMPLETED&format=mp4`)

### 5.2 Core API Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/auth/register` | None | Register new user |
| POST | `/auth/login` | None | Authenticate and get tokens |
| POST | `/auth/refresh` | None | Refresh access token |
| POST | `/auth/logout` | USER | Invalidate refresh token |
| GET | `/sources` | None | List supported source adapters |
| POST | `/download/analyze` | None | Analyze URL and return quality options |
| POST | `/download/start` | None | Start a download job |
| POST | `/convert/upload` | None | Upload file for conversion |
| POST | `/convert/start` | None | Start a conversion job |
| GET | `/jobs` | USER | List user's jobs |
| GET | `/jobs/{id}` | None | Get job status |
| DELETE | `/jobs/{id}` | None | Cancel a job |
| POST | `/jobs/{id}/retry` | None | Retry a failed job |
| GET | `/files/{id}/download` | None | Download a completed file |
| GET | `/history` | USER | Get conversion history |
| DELETE | `/history` | USER | Clear conversion history |
| GET | `/users/me` | USER | Get current user profile |
| PATCH | `/users/me` | USER | Update user profile |
| DELETE | `/users/me` | USER | Delete user account |
| GET | `/admin/metrics` | ADMIN | System metrics |
| GET | `/admin/jobs` | ADMIN | All system jobs |
| GET | `/admin/users` | ADMIN | User management |

---

## 6. Database Architecture

### 6.1 Database Technology

- **Primary Database:** PostgreSQL 16
- **Connection Pooling:** HikariCP (bundled with Spring Boot)
- **Migration Tool:** Flyway
- **ORM:** Spring Data JPA + Hibernate

### 6.2 Core Entities

#### `users`
```sql
id              UUID PRIMARY KEY DEFAULT gen_random_uuid()
email           VARCHAR(255) UNIQUE NOT NULL
password_hash   VARCHAR(255) NOT NULL
display_name    VARCHAR(100)
role            VARCHAR(20) NOT NULL DEFAULT 'USER'
email_verified  BOOLEAN DEFAULT FALSE
active          BOOLEAN DEFAULT TRUE
created_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW()
updated_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW()
last_login_at   TIMESTAMP WITH TIME ZONE
```

#### `jobs`
```sql
id              UUID PRIMARY KEY DEFAULT gen_random_uuid()
user_id         UUID REFERENCES users(id) ON DELETE SET NULL
session_id      VARCHAR(128)         -- for guest users
type            VARCHAR(20) NOT NULL -- DOWNLOAD | CONVERSION
status          VARCHAR(20) NOT NULL -- QUEUED | PROCESSING | COMPLETED | FAILED | CANCELLED
input_format    VARCHAR(20)
output_format   VARCHAR(20) NOT NULL
source_url      TEXT                 -- for downloads
original_name   VARCHAR(500)
file_size_bytes BIGINT
progress        INTEGER DEFAULT 0    -- 0-100
error_message   TEXT
retry_count     INTEGER DEFAULT 0
input_file_key  VARCHAR(500)         -- storage key
output_file_key VARCHAR(500)
created_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW()
updated_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW()
completed_at    TIMESTAMP WITH TIME ZONE
expires_at      TIMESTAMP WITH TIME ZONE
```

#### `conversion_options`
```sql
id              UUID PRIMARY KEY DEFAULT gen_random_uuid()
job_id          UUID REFERENCES jobs(id) ON DELETE CASCADE
option_key      VARCHAR(100) NOT NULL
option_value    VARCHAR(500) NOT NULL
```

#### `source_adapters`
```sql
id              VARCHAR(50) PRIMARY KEY
name            VARCHAR(100) NOT NULL
enabled         BOOLEAN DEFAULT TRUE
version         VARCHAR(20)
created_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW()
```

#### `user_preferences`
```sql
user_id         UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE
default_video_format VARCHAR(20) DEFAULT 'mp4'
default_audio_format VARCHAR(20) DEFAULT 'mp3'
default_image_format VARCHAR(20) DEFAULT 'jpg'
notification_email BOOLEAN DEFAULT TRUE
created_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW()
updated_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW()
```

#### `refresh_tokens`
```sql
id              UUID PRIMARY KEY DEFAULT gen_random_uuid()
user_id         UUID REFERENCES users(id) ON DELETE CASCADE
token_hash      VARCHAR(255) UNIQUE NOT NULL
expires_at      TIMESTAMP WITH TIME ZONE NOT NULL
revoked         BOOLEAN DEFAULT FALSE
created_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW()
```

### 6.3 Indexing Strategy

```sql
-- Performance indexes
CREATE INDEX idx_jobs_user_id ON jobs(user_id);
CREATE INDEX idx_jobs_status ON jobs(status);
CREATE INDEX idx_jobs_created_at ON jobs(created_at DESC);
CREATE INDEX idx_jobs_expires_at ON jobs(expires_at) WHERE expires_at IS NOT NULL;
CREATE INDEX idx_refresh_tokens_user_id ON refresh_tokens(user_id);
CREATE INDEX idx_refresh_tokens_token_hash ON refresh_tokens(token_hash);
```

---

## 7. Media Processing Architecture

### 7.1 FFmpeg Integration

MediaForge uses **FFmpeg** for all media processing operations.

| Operation | FFmpeg Command Template |
|-----------|------------------------|
| Video transcode | `ffmpeg -i input.{ext} -c:v libx264 -c:a aac output.mp4` |
| Audio extraction | `ffmpeg -i input.mp4 -vn -c:a libmp3lame -q:a 2 output.mp3` |
| Image convert | `ffmpeg -i input.jpg output.webp` |
| Quality scale | `ffmpeg -i input.mp4 -vf scale=-2:720 -c:v libx264 output.mp4` |
| Progress parsing | `-progress pipe:1` for real-time progress via stdout |

### 7.2 Quality Presets

| Preset | Description | CRF (H.264) |
|--------|-------------|-------------|
| `fast` | Fast encoding, larger file | 28 |
| `balanced` | Balanced quality/speed (default) | 23 |
| `quality` | Best quality, slower | 18 |

### 7.3 Cloud Conversion Workflow

```
Client → Upload File → Backend API → Redis Queue → Worker
   ↑                                                  ↓
   └─── WebSocket Progress ←── Redis Pub/Sub ←── FFmpeg Process
                                                      ↓
                                               Storage (S3/local)
                                                      ↓
                                              Job Updated → DB
                                                      ↓
                                              Download Link → Client
```

### 7.4 Offline Conversion Workflow (Flutter Desktop)

```
User selects file
      ↓
Flutter App validates format
      ↓
Dart isolate spawned
      ↓
Bundled FFmpeg invoked via Process.run()
      ↓
stdout parsed for progress updates
      ↓
StreamController broadcasts progress to UI
      ↓
Output file saved to disk
      ↓
Success notification
```

---

## 8. Background Job Processing

### 8.1 Job Lifecycle

```
[QUEUED] → [PROCESSING] → [COMPLETED]
              ↓                ↓
           [FAILED]      [DOWNLOADING] (for conversion result)
              ↓
         [CANCELLED]
```

### 8.2 Redis Data Structures

| Key Pattern | Type | Purpose |
|------------|------|---------|
| `mediaforge:queue:jobs` | List (LPUSH/BRPOP) | Main job queue |
| `mediaforge:job:{id}:progress` | Hash | Real-time progress data |
| `mediaforge:job:{id}:status` | String | Current job status |
| `mediaforge:job:{id}:channel` | Pub/Sub | Progress broadcast channel |
| `mediaforge:session:{id}` | Hash | Guest session data (TTL: 24h) |

### 8.3 Worker Processing Loop

```
loop:
  1. BRPOP mediaforge:queue:jobs (blocking, timeout: 5s)
  2. If job received:
     a. Fetch job details from DB
     b. Update status to PROCESSING
     c. Build FFmpeg command
     d. Spawn FFmpeg process
     e. Parse progress from stdout
     f. Publish progress to Redis channel
     g. On completion: upload output to storage
     h. Update job status to COMPLETED in DB
     i. Set download link TTL
  3. On error:
     a. Increment retry_count
     b. If retry_count < 3: re-enqueue
     c. Else: update status to FAILED
```

---

## 9. File Storage Architecture

### 9.1 Storage Abstraction

```java
interface StorageService {
    String upload(InputStream data, String key, String contentType);
    InputStream download(String key);
    URL generatePresignedUrl(String key, Duration expiry);
    void delete(String key);
    boolean exists(String key);
}

class LocalStorageService implements StorageService { ... }
class S3StorageService implements StorageService { ... }
```

### 9.2 File Key Convention

```
{type}/{year}/{month}/{day}/{jobId}/{filename}

Examples:
  uploads/2026/11/09/550e8400-e29b-41d4-a716-446655440000/input.mp4
  output/2026/11/09/550e8400-e29b-41d4-a716-446655440000/output.mp3
```

### 9.3 Cleanup Strategy

- **Scheduled Task:** Runs every 15 minutes.
- **Criteria:** Files where `jobs.expires_at < NOW()`.
- **Process:**
  1. Query DB for expired jobs with `output_file_key IS NOT NULL`.
  2. Delete files from storage.
  3. Clear `output_file_key` in DB.
  4. Log cleanup results.

---

## 10. Authorized Source Adapter Architecture

### 10.1 Adapter Pattern

```java
interface SourceAdapter {
    String getAdapterId();
    String getName();
    boolean supports(String url);
    MediaInfo extractInfo(String url) throws AdapterException;
    DownloadStream startDownload(String url, QualityOption quality) throws AdapterException;
}

class AdapterRegistry {
    private final List<SourceAdapter> adapters;
    
    public SourceAdapter findAdapter(String url) {
        return adapters.stream()
            .filter(a -> a.supports(url))
            .findFirst()
            .orElseThrow(() -> new UnsupportedSourceException(url));
    }
}
```

### 10.2 MediaInfo DTO

```java
record MediaInfo(
    String title,
    String thumbnailUrl,
    Duration duration,
    List<QualityOption> qualities,
    String adapterSource
) {}

record QualityOption(
    String label,       // "1080p", "720p", "audio-only"
    String formatId,
    String extension,
    Long estimatedSizeBytes,
    Integer audioBitrate,
    Integer videoBitrate
) {}
```

### 10.3 Adding a New Adapter

1. Create a class implementing `SourceAdapter`.
2. Annotate with `@Component`.
3. Spring auto-registers via `AdapterRegistry`.
4. Add a record to `source_adapters` database table.
5. Write unit and integration tests.

---

## 11. Security Architecture

### 11.1 JWT Authentication Flow

```
Client              Backend
  │                   │
  │── POST /auth/login ──▶│
  │                   │  Validate credentials
  │                   │  Generate JWT (15m) + Refresh (7d)
  │◀─── 200 OK {tokens} ──│
  │                   │
  │── GET /api/v1/jobs ──▶│ (Bearer: JWT)
  │                   │  JwtAuthFilter validates token
  │                   │  SecurityContext populated
  │◀─── 200 OK ──────────│
  │                   │
  │── POST /auth/refresh ▶│ (Refresh token)
  │                   │  Validate, rotate refresh token
  │◀─── 200 OK {new tokens}│
```

### 11.2 Security Filter Chain

```
Request
  → CORS Filter
  → Rate Limiting Filter
  → JWT Authentication Filter
  → Authorization Check (Spring Security)
  → Controller
```

### 11.3 Input Validation Layers

```
1. MIME type validation (magic bytes, not extension)
2. File size check
3. URL allowlist validation
4. DTO validation (@Valid + Bean Validation)
5. SQL injection prevention (JPA parameterized queries)
6. XSS prevention (Content Security Policy + output encoding)
```

---

## 12. Deployment Architecture

### 12.1 Docker Compose (Local Development)

```yaml
services:
  api:          # Spring Boot backend
  worker:       # Media processor worker
  web:          # Next.js frontend (dev mode)
  db:           # PostgreSQL
  redis:        # Redis
  nginx:        # Reverse proxy (optional for local)
  minio:        # S3-compatible local storage
```

### 12.2 Production Deployment (Phase 10)

- **API + Worker:** Containerized, deployed to cloud (GCP/AWS/self-hosted)
- **Web:** Vercel or container deployment
- **Database:** Managed PostgreSQL (Cloud SQL / RDS / self-hosted)
- **Redis:** Managed Redis (Cloud Memorystore / ElastiCache / self-hosted)
- **Storage:** S3-compatible bucket
- **Reverse Proxy:** Nginx or cloud load balancer
- **TLS:** Let's Encrypt or cloud-managed certificates

---

## 13. Architecture Decision Records

### ADR-001 — Java 21 for Backend
**Decision:** Use Java 21 (LTS) over Kotlin or other JVM languages.
**Rationale:** Broad Spring Boot support, long-term LTS, team familiarity.
**Status:** Accepted

### ADR-002 — Flutter for Desktop & Mobile
**Decision:** Use a single Flutter codebase for both desktop and mobile instead of separate native apps.
**Rationale:** Code reuse across 5 platforms (Windows, macOS, Linux, Android, iOS), single team, faster development.
**Trade-offs:** Less native integration depth; acceptable for media conversion use case.
**Status:** Accepted

### ADR-003 — Redis for Job Queue
**Decision:** Use Redis List (LPUSH/BRPOP) for the job queue instead of a dedicated message broker (RabbitMQ, Kafka).
**Rationale:** Redis already used for caching; reduces infrastructure complexity for MVP.
**Trade-offs:** Less durable than dedicated message broker; acceptable with Redis persistence enabled.
**Status:** Accepted — revisit if queue depth exceeds 100k sustained

### ADR-004 — PostgreSQL over NoSQL
**Decision:** Use PostgreSQL for all persistent data.
**Rationale:** ACID compliance, strong typing, excellent Spring Data JPA support, better for relational job/user data.
**Status:** Accepted

### ADR-005 — Monorepo Architecture
**Decision:** Use a single Git repository for all components.
**Rationale:** Atomic cross-component changes, shared tooling, simplified dependency management during MVP phase.
**Trade-offs:** Larger repo, requires careful CI path filtering.
**Status:** Accepted
