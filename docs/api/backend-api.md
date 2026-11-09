# MediaForge — Backend REST API Specification

**Document Version:** 1.0.0  
**Phase:** 02 — Backend Development & Database Foundation  
**Base URL:** `/api/v1`  
**Swagger UI:** `http://localhost:8080/swagger-ui.html`  
**OpenAPI Spec:** `http://localhost:8080/v3/api-docs`  

---

## 1. Overview & Architectural Principles

The MediaForge Backend provides versioned RESTful APIs for cross-platform media downloading and universal media conversion. All endpoints adhere to standard HTTP semantics, use DTOs to encapsulate requests and responses, return RFC 7807-compatible error structures, and enforce server-side validation and security boundaries.

### Core Headers
- `Content-Type: application/json`
- `Accept: application/json`
- `Authorization: Bearer <jwt-token>` *(optional for guest jobs, required for authenticated user operations)*

---

## 2. API Endpoints Catalog

### 2.1 System Health

#### `GET /api/v1/health`
Checks backend application health and service metadata.

- **Security:** Public (No authentication required)
- **Response `200 OK`:**
```json
{
  "status": "UP",
  "service": "mediaforge-backend",
  "version": "0.1.0-SNAPSHOT",
  "timestamp": "2026-11-09T19:35:00+05:30"
}
```

---

### 2.2 Job Management

#### `POST /api/v1/jobs`
Initializes a new media job in `PENDING` status.

- **Security:** Public (Guest) or Authenticated User
- **Request Body:**
```json
{
  "jobType": "DOWNLOAD",
  "sourceType": "URL",
  "inputFormat": null,
  "outputFormat": "mp4"
}
```
- **Validation Constraints:**
  - `jobType`: Required (`DOWNLOAD` or `CONVERSION`)
  - `sourceType`: Required (`URL` or `UPLOAD`)
  - `outputFormat`: Required, max 20 chars
- **Response `201 Created`:**
```json
{
  "id": "e67414df-bb62-43bb-a3ee-8ecf6d90a6ea",
  "userId": null,
  "jobType": "DOWNLOAD",
  "sourceType": "URL",
  "status": "PENDING",
  "progress": 0,
  "inputFormat": null,
  "outputFormat": "mp4",
  "errorMessage": null,
  "createdAt": "2026-11-09T19:35:10+05:30",
  "startedAt": null,
  "completedAt": null
}
```

#### `GET /api/v1/jobs/{id}`
Retrieves current status, progress, and metadata for a specific job.

- **Security:** Public for anonymous jobs; restricted to job owner for authenticated user jobs.
- **Parameters:**
  - `id` (path, UUID): Job identifier
- **Response `200 OK`:** Returns `JobResponse` object.
- **Error `404 Not Found`:** Returned if job ID does not exist.

#### `GET /api/v1/jobs`
Lists media jobs with pagination and optional status filter.

- **Parameters:**
  - `status` (query, optional): Filter by `PENDING`, `QUEUED`, `PROCESSING`, `COMPLETED`, `FAILED`, `CANCELLED`
  - `page` (query, default: 0): Page index (0-based)
  - `size` (query, default: 20, max: 100): Page size
  - `direction` (query, default: DESC): Sort direction (`ASC` or `DESC` by `createdAt`)
- **Response `200 OK`:** Paginated JSON response containing `content: JobResponse[]`.

#### `POST /api/v1/jobs/{id}/cancel`
Cancels an active or pending job.

- **Security:** Restricted to job owner (or guest session).
- **Rules:**
  - Permitted when status is `PENDING`, `QUEUED`, or `PROCESSING`.
  - Rejection with `400 Bad Request` if job is already in terminal status (`COMPLETED`, `FAILED`, `CANCELLED`).
- **Response `200 OK`:** Returns updated `JobResponse` with `status: "CANCELLED"`.

---

### 2.3 Media Downloader

#### `POST /api/v1/downloads/validate`
Validates a media URL against security constraints (SSRF protection, scheme filtering) and inspects available quality/format options.

- **Request Body:**
```json
{
  "url": "https://example.com/video/12345"
}
```
- **Security Validation:**
  - Enforces `http` or `https` protocol.
  - Rejects loopback addresses (`127.0.0.1`, `localhost`, `0.0.0.0`).
  - Rejects RFC 1918 private subnets (`10.0.0.0/8`, `172.16.0.0/12`, `192.168.0.0/16`).
  - Rejects cloud metadata endpoints (`169.254.169.254`, `metadata.google.internal`).
- **Response `200 OK`:**
```json
{
  "valid": true,
  "url": "https://example.com/video/12345",
  "platform": "example",
  "availableFormats": ["mp4", "webm", "mkv", "mp3"],
  "availableQualities": ["1080p", "720p", "480p", "240p", "audio-only"],
  "message": "URL format and host security validation passed. Platform: example"
}
```

#### `POST /api/v1/downloads`
Submits and enqueues a media download job.

- **Request Body:**
```json
{
  "url": "https://example.com/video/12345",
  "selectedFormat": "mp4",
  "selectedQuality": "1080p"
}
```
- **Response `202 Accepted`:**
```json
{
  "jobId": "e67414df-bb62-43bb-a3ee-8ecf6d90a6ea",
  "job": { ... },
  "sourceUrl": "https://example.com/video/12345",
  "platform": "example",
  "selectedFormat": "mp4",
  "selectedQuality": "1080p",
  "status": "PENDING",
  "message": "Download job successfully accepted and queued. Media processing worker integration will execute in Phase 04."
}
```

---

### 2.4 Media Converter

#### `POST /api/v1/conversions`
Submits a media transcoding job.

- **Request Body:**
```json
{
  "inputFileId": "a1b2c3d4-0000-0000-0000-000000000000",
  "inputFormat": "avi",
  "outputFormat": "mp4",
  "targetResolution": "1080p",
  "audioBitrate": 192
}
```
- **Response `202 Accepted`:**
```json
{
  "jobId": "b2c3d4e5-1111-2222-3333-444455556666",
  "job": { ... },
  "outputFormat": "mp4",
  "targetResolution": "1080p",
  "audioBitrate": 192,
  "status": "PENDING",
  "message": "Conversion job successfully accepted and queued. FFmpeg processing worker execution will be enabled in Phase 05."
}
```

---

### 2.5 Formats Catalog

#### `GET /api/v1/formats`
Returns full catalog of supported video, audio, and image formats.

#### `GET /api/v1/formats/video`
Returns: `["mp4", "webm", "mkv", "avi", "mov", "flv", "wmv", "gif"]`

#### `GET /api/v1/formats/audio`
Returns: `["mp3", "wav", "flac", "aac", "ogg", "m4a", "opus"]`

#### `GET /api/v1/formats/image`
Returns: `["jpg", "png", "webp", "gif", "bmp", "tiff", "svg"]`

---

### 2.6 File Metadata

#### `GET /api/v1/files/{id}/metadata`
Returns metadata and storage retention details for a stored media file.

---

## 3. Job Status Lifecycle

```
[ PENDING ] ──▶ [ QUEUED ] ──▶ [ PROCESSING ] ──▶ [ COMPLETED ]
     │               │                │
     ├───────────────┼────────────────┘
     │               │
     ▼               ▼
[ CANCELLED ]   [ FAILED ]
```

| Status | Description | Terminal? | Can Cancel? |
| :--- | :--- | :---: | :---: |
| `PENDING` | Request received and persisted in database | ❌ | ✅ |
| `QUEUED` | Placed in worker job queue | ❌ | ✅ |
| `PROCESSING` | Worker actively processing file with FFmpeg | ❌ | ✅ |
| `COMPLETED` | Processing succeeded; output file ready | ✅ | ❌ |
| `FAILED` | Processing failed with error message recorded | ✅ | ❌ |
| `CANCELLED` | Cancelled by user before completion | ✅ | ❌ |

---

## 4. Standardized Error Responses

All API errors return RFC 7807-compliant payloads:

```json
{
  "timestamp": "2026-11-09T19:35:00+05:30",
  "status": 400,
  "error": "Bad Request",
  "code": "URL_SECURITY_VIOLATION",
  "message": "Loopback addresses are forbidden: 127.0.0.1",
  "path": "/api/v1/downloads/validate",
  "validationErrors": null
}
```

### Error Code Reference
| Code | HTTP Status | Description |
| :--- | :--- | :--- |
| `VALIDATION_FAILED` | 400 | Required fields missing or constraints violated |
| `URL_SECURITY_VIOLATION` | 400 | SSRF target, private IP, or unsupported scheme |
| `INVALID_STATUS_TRANSITION` | 400 | Illegal status transition attempted |
| `JOB_CANCELLATION_FAILED` | 400 | Attempted to cancel terminal job |
| `RESOURCE_NOT_FOUND` | 404 | Entity ID not found in database |
| `ACCESS_DENIED` | 403 | User not authorized to access private job |
| `RATE_LIMIT_EXCEEDED` | 429 | Request rate exceeded allowed threshold |
| `PROCESSOR_NOT_AVAILABLE`| 501 | Processing engine phase scheduled for future phase |
| `INTERNAL_SERVER_ERROR` | 500 | Unexpected server error |

