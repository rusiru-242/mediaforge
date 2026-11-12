# MediaForge Conversion Engine Testing & QA Guide

## 1. Test Suite Summary
The MediaForge conversion test suite validates all layers from controller endpoints to low-level FFmpeg process execution.

### Backend Test Coverage (JUnit 5 + Mockito + MockMvc)
Total Tests: **76 Tests** (100% Passing)

- **Unit Tests:**
  - `ConversionStorageServiceTest`: Magic byte validation, PE/ELF executable rejection, path traversal rejection, scratch file allocation.
  - `MediaProbeServiceTest`: FFprobe output parsing, stream discovery, duration and bitrate parsing.
  - `VideoConversionServiceTest`: Resolution downscaling filter generation, aspect ratio preservation, audio stripping options.
  - `AudioConversionServiceTest`: Video-to-audio extraction flags (`-vn`), bitrate options, sample rate configurations.
  - `ImageConversionServiceTest`: Image resizing, quality settings, rotation flags, decompression bomb rejection.
  - `JobServiceTest`: Job lifecycle transitions, cancellation coordination.
- **Integration Tests:**
  - `ConversionControllerIntegrationTest`: `POST /api/v1/conversions`, `POST /api/v1/conversions/batch`, `GET /api/v1/conversions/formats`.
  - `FileUploadControllerIntegrationTest`: Multipart file upload, magic byte verification, HTTP 201 response.
  - `JobControllerIntegrationTest`: Progress polling, SSE streaming, job cancellation.
  - `FileControllerDownloadTest`: Media download streaming, `Content-Disposition` attachment headers.
  - `RepositoryAndMigrationIntegrationTest`: Flyway migration schema integrity, database constraints.

### Frontend Test Coverage (Vitest + Testing Library)
Total Tests: **43 Tests** (100% Passing)

- `apiClient.test.ts`: File upload multipart requests, single & batch conversion submission, progress fetching, error handling.
- `ConverterPages.test.tsx`: Rendering and parameter input testing for Video, Audio, Image, and Batch converter pages.
- `DownloadProgress.test.tsx`, `JobStatusBadge.test.tsx`, `ProgressBar.test.tsx`, `Button.test.tsx`: UI interaction and state updates.

## 2. Running Automated Tests

### Run Backend Tests
```powershell
cd backend
.\mvnw.cmd test
```

### Run Frontend Tests
```powershell
cd web
npm run test
```

### Run Full Frontend Verification
```powershell
cd web
npm run lint
npm run build
```
