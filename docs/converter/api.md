# MediaForge Conversion Engine REST API Specification

All conversion endpoints are versioned under `/api/v1`.

---

## 1. Upload Media File
Uploads an authorized media file into temporary staging storage.

- **Endpoint:** `POST /api/v1/files/upload`
- **Content-Type:** `multipart/form-data`
- **Request Body:**
  - `file`: Multipart file binary (max 500 MB)
- **Response:** `201 Created`
```json
{
  "id": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
  "fileId": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
  "originalFilename": "presentation.mp4",
  "storedFilename": "3fa85f64-5717-4562-b3fc-2c963f66afa6.mp4",
  "mimeType": "video/mp4",
  "fileSize": 15420900,
  "mediaType": "VIDEO",
  "createdAt": "2026-11-12T10:15:30Z"
}
```

---

## 2. Submit Conversion Job
Submits a media conversion job for asynchronous execution.

- **Endpoint:** `POST /api/v1/conversions`
- **Content-Type:** `application/json`
- **Request Body:**
```json
{
  "inputFileId": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
  "inputFormat": "mp4",
  "outputFormat": "webm",
  "targetResolution": "720p",
  "videoBitrate": "2500k",
  "audioBitrate": 192,
  "frameRate": 30,
  "stripAudio": false
}
```
- **Response:** `202 Accepted`
```json
{
  "jobId": "8b846e91-64d8-4a17-b769-cfec02ff94b1",
  "job": {
    "id": "8b846e91-64d8-4a17-b769-cfec02ff94b1",
    "jobType": "CONVERSION",
    "sourceType": "UPLOAD",
    "status": "QUEUED",
    "progress": 0,
    "inputFormat": "mp4",
    "outputFormat": "webm",
    "createdAt": "2026-11-12T10:16:00Z"
  },
  "outputFormat": "webm",
  "targetResolution": "720p",
  "audioBitrate": 192,
  "status": "QUEUED",
  "message": "Conversion job submitted successfully"
}
```

---

## 3. Submit Batch Conversion
Submits multiple media files for batch processing.

- **Endpoint:** `POST /api/v1/conversions/batch`
- **Content-Type:** `application/json`
- **Request Body:**
```json
{
  "items": [
    {
      "inputFileId": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
      "outputFormat": "webm"
    },
    {
      "inputFileId": "9cb31a10-2134-45e1-89ab-42c67fe90912",
      "outputFormat": "mp3",
      "audioBitrate": 320
    }
  ]
}
```
- **Response:** `202 Accepted`
```json
{
  "batchId": "4c09d582-7e72-4632-9cbb-9238e8cb49aa",
  "totalJobs": 2,
  "jobs": [ ... ],
  "status": "QUEUED",
  "message": "Batch conversion submitted with 2 jobs"
}
```

---

## 4. Get Conversion Live Progress
Retrieves live conversion status, percentage, speed, and remaining time.

- **Endpoint:** `GET /api/v1/jobs/{id}/progress`
- **Response:** `200 OK`
```json
{
  "jobId": "8b846e91-64d8-4a17-b769-cfec02ff94b1",
  "status": "PROCESSING",
  "percentage": 58,
  "speed": "2.1x",
  "fps": 59,
  "timeRemainingSeconds": 8,
  "completed": false,
  "failed": false,
  "errorMessage": null
}
```

---

## 5. Live Progress SSE Stream
Streams real-time Server-Sent Events updates as FFmpeg processes media.

- **Endpoint:** `GET /api/v1/jobs/{id}/progress/sse`
- **Accept:** `text/event-stream`
- **Events:**
```text
event: progress
data: {"jobId":"8b846e91...","status":"PROCESSING","percentage":60,"speed":"2.1x"}
```

---

## 6. Download Converted Media File
Streams the final converted media file.

- **Endpoint:** `GET /api/v1/files/{id}/download`
- **Response:** `200 OK`
  - Headers: `Content-Disposition: attachment; filename="converted.webm"`, `Content-Type: video/webm`

---

## 7. Download Batch ZIP Archive
Streams an on-the-fly compressed ZIP archive containing all finished files for a batch.

- **Endpoint:** `GET /api/v1/conversions/batch/{batchId}/zip`
- **Response:** `200 OK`
  - Headers: `Content-Disposition: attachment; filename="mediaforge-batch-{batchId}.zip"`, `Content-Type: application/zip`
