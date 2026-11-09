# MediaForge API Integration Guide

## 1. Overview
The MediaForge Web Portal integrates with the Spring Boot 3 REST API developed and merged in Phase 02. The web frontend communicates over standard HTTP JSON requests, parsing RFC 7807 problem details on failure and tracking async jobs.

Base URL is configured via environment variable `NEXT_PUBLIC_API_BASE_URL` (defaults to `http://localhost:8080/api/v1`).

---

## 2. Endpoint Contracts

### Health Check
- **Endpoint:** `GET /health`
- **Component:** `Navbar` (live connection pill) & `apiClient.checkHealth()`
- **Response (200 OK):**
  ```json
  {
    "status": "UP",
    "service": "mediaforge-backend",
    "version": "0.1.0-SNAPSHOT",
    "timestamp": "2026-11-09T20:00:00Z"
  }
  ```

---

### Formats Registry
- **Endpoint:** `GET /formats`
- **Component:** `FormatsPage` (`/formats`) & `apiClient.getSupportedFormats()`
- **Response (200 OK):**
  ```json
  {
    "video": ["mp4", "webm", "mkv", "avi", "mov"],
    "audio": ["mp3", "wav", "flac", "aac", "m4a"],
    "image": ["png", "jpeg", "webp", "gif"]
  }
  ```

---

### Downloader Stream Validation
- **Endpoint:** `POST /downloads/validate`
- **Component:** `DownloaderPage` (`/downloader`)
- **Request Body:**
  ```json
  {
    "url": "https://example.com/video.mp4"
  }
  ```
- **Response (200 OK):**
  ```json
  {
    "valid": true,
    "url": "https://example.com/video.mp4",
    "platform": "generic",
    "availableFormats": ["mp4", "webm", "mp3"],
    "availableQualities": ["1080p", "720p", "480p"],
    "message": "URL is supported and valid"
  }
  ```
- **SSRF Failure (400 Bad Request):** Returns RFC 7807 payload when private IP/loopback is targeted.

---

### Download Job Creation
- **Endpoint:** `POST /downloads`
- **Component:** `DownloaderPage` (`/downloader`)
- **Request Body:**
  ```json
  {
    "url": "https://example.com/video.mp4",
    "selectedFormat": "mp4",
    "selectedQuality": "1080p"
  }
  ```
- **Response (202 Accepted):**
  ```json
  {
    "jobId": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
    "job": {
      "id": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
      "status": "QUEUED",
      "progress": 0,
      "outputFormat": "mp4"
    },
    "status": "QUEUED",
    "message": "Download job queued successfully"
  }
  ```

---

### File Conversion Job Creation
- **Endpoint:** `POST /conversions`
- **Components:** Video Converter (`/converter/video`), Audio Converter (`/converter/audio`), Image Converter (`/converter/image`)
- **Request Body:**
  ```json
  {
    "inputFileId": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
    "inputFormat": "mkv",
    "outputFormat": "mp4",
    "targetResolution": "1080p",
    "audioBitrate": 192
  }
  ```
- **Response (202 Accepted):** Returns queued conversion job details with `jobId`.

---

### Job Telemetry & Details
- **Endpoint:** `GET /jobs/{id}`
- **Component:** `JobDetailPage` (`/jobs/[id]`)
- **Polling Strategy:** Polled every 3 seconds while status is `PENDING`, `QUEUED`, or `PROCESSING`. Polling ceases when `COMPLETED`, `FAILED`, or `CANCELLED`.
- **Response (200 OK):**
  ```json
  {
    "id": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
    "jobType": "DOWNLOAD",
    "sourceType": "URL",
    "status": "PROCESSING",
    "progress": 45,
    "outputFormat": "mp4",
    "createdAt": "2026-11-09T20:00:00Z"
  }
  ```

---

### Job History Listing
- **Endpoint:** `GET /jobs?page=0&size=20&status=COMPLETED`
- **Component:** `HistoryPage` (`/history`)
- **Response (200 OK):** Standard Spring Data `PageResponse<JobResponse>`.

---

### Job Cancellation
- **Endpoint:** `POST /jobs/{id}/cancel`
- **Components:** `HistoryPage`, `JobDetailPage`
- **Response (200 OK):** Updated job with `status: "CANCELLED"`.

---

### File Metadata & Download
- **Metadata Endpoint:** `GET /files/{id}/metadata`
- **Download Endpoint:** `GET /files/{id}/download`
- **Response:** Direct octet stream download with Content-Disposition header.

