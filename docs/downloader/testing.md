# MediaForge Downloader — Testing Strategy & Verification Matrix

The MediaForge Downloader test suite provides automated testing across unit, integration, and end-to-end layers.

---

## 1. Backend Test Suites

All backend tests are written with **JUnit 5**, **Mockito**, and **Spring Boot Test**.

### 1.1 Test Coverage

| Test Class | Focus Area | Key Scenarios Tested |
|---|---|---|
| `UrlSecurityValidatorTest` | SSRF & Network Validation | Loopback (`127.0.0.1`), RFC 1918 subnets (`10.x`, `192.168.x`), AWS/GCP metadata (`169.254.169.254`), valid public domains (`example.com`, `googleapis.com`), invalid schemes (`file://`, `ftp://`). |
| `DirectMediaSourceAdapterTest` | Media Ingestion Adapter | Audio and video extensions, MIME detection, probe metadata extraction, simulated stream downloading. |
| `DirectImageSourceAdapterTest` | Image Ingestion Adapter | Image formats (`jpg`, `png`, `webp`, `gif`, `svg`), dimension probing, metadata generation. |
| `MediaStorageServiceTest` | Ephemeral Storage Subsystem | Path traversal containment (`../etc/passwd`), scratch file allocation, atomic move to permanent storage, resource retrieval, expired file cleanup. |
| `MediaDownloadServiceTest` | Async Task Execution | Job submission (`QUEUED` -> `PROCESSING` -> `COMPLETED`), cooperative cancellation (`CANCELLED`), error handling and partial file deletion. |
| `FileControllerDownloadTest` | Binary File Streaming | Streaming completed media with `Content-Disposition`, 404 for missing file, public authorization. |
| `DownloadControllerIntegrationTest` | REST API Layer | `POST /validate`, `POST /metadata`, `GET /formats`, `POST /` job submission with JSON contract verification. |

### 1.2 Running Backend Tests
Execute via Maven wrapper:
```powershell
cd backend
./mvnw clean test
```
*Current result: 57 tests passed, 0 failures, 0 errors.*

---

## 2. Frontend Test Suites

Frontend tests are written with **Vitest**, **React Testing Library**, and **jsdom**.

### 2.1 Test Coverage

| Test File | Focus Area | Key Scenarios Tested |
|---|---|---|
| `MediaUrlInput.test.tsx` | URL Ingestion & Actions | Input binding, clipboard paste, Enter key submission, inspect button triggers, disabled/loading state locking. |
| `MediaInfoCard.test.tsx` | Metadata Card Presentation | Title, platform, media type badges, file size and duration formatting, policy-restriction indicators. |
| `MediaFormatSelector.test.tsx` | Native vs Transcoder Options | Native stream badges vs Phase 05 transcoder badges, clickable selection, disabled converted formats. |
| `DownloadProgress.test.tsx` | Real-Time Progress & Control | Progress percentage rendering, status label changes, cooperative cancellation triggers, terminal status hiding. |
| `DownloadError.test.tsx` | Security & Error Alerts | SSRF security warning presentation, platform policy advisory banners, standard network error reporting. |
| `apiClient.test.ts` | Frontend Service Layer | Downloader endpoint integrations (`validateDownloadUrl`, `getMediaMetadata`, `createDownloadJob`). |

### 2.2 Running Frontend Tests
Execute via npm:
```powershell
cd web
npm run test
npm run lint
npm run build
```
*Current result: 9 test files passed, 34 tests passed, 0 linter errors, 0 build errors.*

