# MediaForge REST API Contracts & Schema

Base URL: `http://localhost:8080/api/v1`

---

## 1. File Upload API

### `POST /files/upload`
Uploads a source media file into ephemeral storage with magic-byte MIME validation.

#### Request
- **Content-Type**: `multipart/form-data`
- **Body**: `file` (binary stream, up to 500 MB)

#### Response (`201 Created` or `200 OK`)
```json
{
  "id": "c1f7b889-fa32-4720-9cf6-928919db4581",
  "fileId": "c1f7b889-fa32-4720-9cf6-928919db4581",
  "originalFilename": "presentation.mp4",
  "storedFilename": "c1f7b889-fa32-4720-9cf6-928919db4581.mp4",
  "mimeType": "video/mp4",
  "fileSize": 18452901,
  "expiresAt": "2026-11-14T00:30:00Z"
}
```

---

## 2. Media Downloader API

### `POST /downloads/validate`
Validates whether a candidate URL is accessible, authorized, and safe from SSRF/loopback attacks.

#### Request Body
```json
{
  "url": "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4"
}
```

#### Response (`200 OK`)
```json
{
  "valid": true,
  "url": "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4",
  "platform": "generic",
  "availableFormats": ["mp4"],
  "availableQualities": ["source", "1080p", "720p"],
  "message": "URL is valid and accessible for streaming"
}
```

### `POST /downloads`
Queues a background download task.

#### Request Body
```json
{
  "url": "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4",
  "selectedFormat": "mp4",
  "selectedQuality": "1080p"
}
```

#### Response (`202 Accepted`)
```json
{
  "jobId": "f03a6b8a-1a8c-4bc4-9d62-5cb0f92b7701",
  "status": "QUEUED",
  "sourceUrl": "https://...",
  "selectedFormat": "mp4",
  "selectedQuality": "1080p"
}
```

---

## 3. Media Conversion API

### `POST /conversions`
Submits a media conversion job with optional quality presets.

#### Request Body
```json
{
  "inputFileId": "c1f7b889-fa32-4720-9cf6-928919db4581",
  "inputFormat": "mp4",
  "outputFormat": "webm",
  "qualityPreset": "balanced",
  "targetResolution": "720p",
  "videoBitrate": "1200k",
  "audioBitrate": 192,
  "stripAudio": false
}
```

#### Response (`202 Accepted`)
```json
{
  "jobId": "3491ef9a-4c28-4ef1-8280-9284920182bb",
  "status": "QUEUED",
  "outputFormat": "webm",
  "targetResolution": "720p"
}
```

### `POST /conversions/batch`
Submits multiple media items in a single atomic request.

#### Request Body
```json
{
  "items": [
    {
      "inputFileId": "c1f7b889-fa32-4720-9cf6-928919db4581",
      "inputFormat": "mp4",
      "outputFormat": "webm"
    },
    {
      "inputFileId": "98a12bc3-1249-411a-9dfa-821938b81234",
      "inputFormat": "wav",
      "outputFormat": "mp3"
    }
  ]
}
```

#### Response (`202 Accepted`)
```json
{
  "batchId": "batch-1763910283",
  "totalJobs": 2,
  "jobs": [
    { "id": "job-1", "status": "QUEUED", "outputFormat": "webm" },
    { "id": "job-2", "status": "QUEUED", "outputFormat": "mp3" }
  ]
}
```

---

## 4. Job Progress & Status API

### `GET /jobs/{id}/progress`
Retrieves live conversion or download progress.

#### Response (`200 OK`)
```json
{
  "jobId": "3491ef9a-4c28-4ef1-8280-9284920182bb",
  "status": "PROCESSING",
  "percentage": 68.5,
  "speed": "2.4x",
  "fps": 58.2,
  "timeRemainingSeconds": 14,
  "completed": false,
  "failed": false,
  "errorMessage": null
}
```

### `POST /jobs/{id}/cancel`
Signals cancellation and halts active subprocesses.
```json
{
  "jobId": "3491ef9a-4c28-4ef1-8280-9284920182bb",
  "status": "CANCELLED"
}
```

---

## 5. Artifact Download API

### `GET /conversions/batch/{batchId}/download`
Streams a dynamically generated ZIP archive containing all completed files in the batch.

### `GET /files/{fileId}/download`
Streams the single processed media file directly with proper `Content-Disposition` header.
