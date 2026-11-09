# MediaForge Downloader — REST API Reference

The MediaForge Downloader exposes public and authenticated REST endpoints under the `/api/v1` namespace.

---

## 1. Endpoints

### 1.1 Validate Media URL
Checks whether a URL is publicly accessible, safe against SSRF vulnerabilities, and supported by registered adapters.

- **URL**: `POST /api/v1/downloads/validate`
- **Security**: Public (`permitAll`)
- **Request Body**:
  ```json
  {
    "url": "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4"
  }
  ```
- **Response (200 OK - Valid)**:
  ```json
  {
    "valid": true,
    "url": "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4",
    "domain": "commondatastorage.googleapis.com",
    "scheme": "https",
    "platform": "Direct Media",
    "availableFormats": ["mp4", "webm", "mkv", "mp3"],
    "availableQualities": ["1080p", "720p", "480p", "360p"],
    "message": "URL is supported and passed security validation"
  }
  ```
- **Response (200 OK - SSRF Blocked / Unsupported)**:
  ```json
  {
    "valid": false,
    "url": "http://169.254.169.254/latest/meta-data",
    "domain": "169.254.169.254",
    "scheme": "http",
    "reason": "URL targets a private IP, loopback, or cloud metadata address"
  }
  ```

---

### 1.2 Inspect Media Metadata
Probes the remote stream to extract genuine title, content size, MIME type, dimensions, duration, and native vs conversion-required formats.

- **URL**: `POST /api/v1/downloads/metadata`
- **Security**: Public (`permitAll`)
- **Request Body**:
  ```json
  {
    "url": "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4"
  }
  ```
- **Response (200 OK)**:
  ```json
  {
    "url": "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4",
    "platform": "Direct Media",
    "title": "BigBuckBunny.mp4",
    "duration": 596,
    "fileSize": 158008374,
    "thumbnail": null,
    "mediaType": "VIDEO",
    "resolution": "1920x1080",
    "mimeType": "video/mp4",
    "containerFormat": "mp4",
    "directDownloadSupported": true,
    "availableFormats": [
      {
        "format": "mp4",
        "quality": "1080p",
        "resolution": "1920x1080",
        "nativeStream": true,
        "requiresConversion": false
      },
      {
        "format": "webm",
        "quality": "1080p",
        "resolution": "1920x1080",
        "nativeStream": false,
        "requiresConversion": true
      },
      {
        "format": "mp3",
        "quality": "Audio",
        "nativeStream": false,
        "requiresConversion": true
      }
    ],
    "availableQualities": ["1080p", "720p", "480p", "360p"]
  }
  ```

---

### 1.3 Query Available Formats
Retrieves format options supported for a given URL or default system formats.

- **URL**: `GET /api/v1/downloads/formats?url={encodedUrl}`
- **Security**: Public (`permitAll`)
- **Response (200 OK)**:
  ```json
  [
    {
      "format": "mp4",
      "quality": "1080p",
      "nativeStream": true,
      "requiresConversion": false
    },
    {
      "format": "mp3",
      "quality": "Audio",
      "nativeStream": false,
      "requiresConversion": true
    }
  ]
  ```

---

### 1.4 Submit Download Job
Creates a background download job in PostgreSQL and dispatches the task to the asynchronous execution pool.

- **URL**: `POST /api/v1/downloads`
- **Security**: Public / Authenticated (`permitAll`)
- **Request Body**:
  ```json
  {
    "url": "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4",
    "targetFormat": "mp4",
    "targetQuality": "1080p"
  }
  ```
- **Response (202 Accepted)**:
  ```json
  {
    "id": "c1f7b03b-d461-4122-bfe8-f9b23b3f2832",
    "jobType": "DOWNLOAD",
    "status": "QUEUED",
    "progress": 0,
    "outputFormat": "mp4",
    "targetFormat": "mp4",
    "targetQuality": "1080p",
    "createdAt": "2026-11-09T23:30:00Z"
  }
  ```

---

### 1.5 Track Job Progress & Status
Polls background job execution state.

- **URL**: `GET /api/v1/jobs/{id}`
- **Security**: Public / Authenticated (`permitAll`)
- **Response (200 OK - Processing)**:
  ```json
  {
    "id": "c1f7b03b-d461-4122-bfe8-f9b23b3f2832",
    "jobType": "DOWNLOAD",
    "status": "PROCESSING",
    "progress": 65,
    "outputFormat": "mp4",
    "createdAt": "2026-11-09T23:30:00Z",
    "startedAt": "2026-11-09T23:30:01Z"
  }
  ```
- **Response (200 OK - Completed)**:
  ```json
  {
    "id": "c1f7b03b-d461-4122-bfe8-f9b23b3f2832",
    "jobType": "DOWNLOAD",
    "status": "COMPLETED",
    "progress": 100,
    "outputFormat": "mp4",
    "outputFileId": "7e155bc8-c57b-4d43-a602-0a1496c0ca32",
    "createdAt": "2026-11-09T23:30:00Z",
    "completedAt": "2026-11-09T23:30:08Z"
  }
  ```

---

### 1.6 Cancel Active Download
Cooperatively interrupts an active download in progress and purges any temporary files.

- **URL**: `POST /api/v1/jobs/{id}/cancel`
- **Security**: Public / Authenticated (`permitAll`)
- **Response (200 OK)**:
  ```json
  {
    "id": "c1f7b03b-d461-4122-bfe8-f9b23b3f2832",
    "status": "CANCELLED",
    "progress": 45,
    "outputFormat": "mp4",
    "errorMessage": "Job was cancelled by user"
  }
  ```

---

### 1.7 Stream Saved Media File
Streams the completed media binary to the client with `Content-Disposition: attachment`.

- **URL**: `GET /api/v1/files/{id}/download`
- **Security**: Public (`permitAll`)
- **Response**: Binary byte stream with `Content-Type`, `Content-Length`, and sanitised filename headers.

