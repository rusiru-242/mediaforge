# MediaForge — User Roles, User Stories & Use Cases

**Document Version:** 1.0.0
**Phase:** 01 — Foundation & Architecture
**Last Updated:** 2026-11-09
**Status:** Draft

---

## Table of Contents

1. [User Roles](#1-user-roles)
2. [User Stories](#2-user-stories)
3. [Use Cases](#3-use-cases)
4. [MVP Scope](#4-mvp-scope)
5. [Acceptance Criteria](#5-acceptance-criteria)

---

## 1. User Roles

### 1.1 Role Definitions

| Role | ID | Description | Authentication |
|------|----|-------------|----------------|
| Guest User | `GUEST` | Unauthenticated user. Can convert and download media with session-based tracking and reduced limits. | None |
| Registered User | `USER` | Authenticated user with full access to history, preferences, and higher limits. | Email + Password |
| Administrator | `ADMIN` | System administrator with access to management dashboards and system configuration. | Email + Password + 2FA (future) |

### 1.2 Role Capabilities Matrix

| Capability | Guest | User | Admin |
|-----------|-------|------|-------|
| Browse supported sources | ✅ | ✅ | ✅ |
| Download media (limited) | ✅ | ✅ | ✅ |
| Convert media (online) | ✅ | ✅ | ✅ |
| Convert media (offline, desktop/mobile) | ✅ | ✅ | ✅ |
| View conversion history | ❌ | ✅ | ✅ |
| Save conversion preferences | ❌ | ✅ | ✅ |
| Batch processing (large batches) | ❌ | ✅ | ✅ |
| View system metrics | ❌ | ❌ | ✅ |
| Manage users | ❌ | ❌ | ✅ |
| Configure system settings | ❌ | ❌ | ✅ |

---

## 2. User Stories

### 2.1 Guest User Stories

**US-G-001 — Paste URL and Download**
> As a **guest user**, I want to paste a video URL and download the video in my preferred quality, so that I can save videos from authorized sources without creating an account.

*Acceptance Criteria:*
- Given I paste a valid URL, when I click "Analyze", then available qualities are displayed within 10 seconds.
- Given I select a quality, when I click "Download", then the download starts immediately.
- Given I paste an invalid or unsupported URL, then a clear error message is shown.

---

**US-G-002 — Convert a Local File Online**
> As a **guest user**, I want to upload a local file and convert it to a different format online, so that I can convert media without installing software.

*Acceptance Criteria:*
- Given I upload a supported file, when I select an output format and click "Convert", then a progress bar is shown.
- Given the conversion completes, then a download link is displayed and functional for at least 1 hour.

---

**US-G-003 — Track Download Progress**
> As a **guest user**, I want to see real-time progress for my download, including percentage and ETA, so that I know how long to wait.

*Acceptance Criteria:*
- Given a download is in progress, then percentage, speed, and ETA are updated at least every 2 seconds.
- Given I click "Cancel", then the download stops within 5 seconds.

---

**US-G-004 — View Supported Platforms**
> As a **guest user**, I want to see which media sources are supported, so that I know if my desired source is available.

---

### 2.2 Registered User Stories

**US-U-001 — Register an Account**
> As a **visitor**, I want to create an account with my email and password, so that I can access my conversion history and preferences.

*Acceptance Criteria:*
- Given I provide a valid email and strong password, when I submit the registration form, then a verification email is sent.
- Given I click the verification link, then my account is activated and I can log in.

---

**US-U-002 — View Conversion History**
> As a **registered user**, I want to view my past conversions and downloads, so that I can re-download files or reference previous work.

*Acceptance Criteria:*
- Given I am logged in, when I navigate to "History", then I see a paginated list of my past jobs.
- Given a job's download link is still valid, when I click it, then the file downloads successfully.

---

**US-U-003 — Save Default Conversion Settings**
> As a **registered user**, I want to save my preferred output format and quality settings, so that I don't have to reconfigure them every time.

---

**US-U-004 — Batch Convert Multiple Files**
> As a **registered user**, I want to upload multiple files and convert them all at once, so that I can save time when processing many files.

*Acceptance Criteria:*
- Given I upload 5 files with different formats, when I submit the batch, then all 5 jobs appear in the queue.
- Given all jobs complete, then download links are available for each file.

---

**US-U-005 — Receive Completion Notification**
> As a **registered user**, I want to receive a notification when my conversion is complete, so that I don't have to watch the progress screen.

---

**US-U-006 — Delete My Account**
> As a **registered user**, I want to permanently delete my account and all associated data, so that my personal information is removed from the system.

---

### 2.3 Desktop Application User Stories

**US-D-001 — Offline Video Conversion**
> As a **desktop user**, I want to convert video files locally without an internet connection, so that I can process files privately and quickly.

*Acceptance Criteria:*
- Given the app is in offline mode, when I select a file and output format, then conversion starts using the embedded FFmpeg binary.
- Given conversion completes, then the output file is saved to my selected directory.

---

**US-D-002 — Offline Audio Extraction**
> As a **desktop user**, I want to extract audio from a video file offline, so that I can create MP3 or other audio files from local videos.

---

**US-D-003 — Manage Download Queue**
> As a **desktop user**, I want to manage a download queue with the ability to reorder, pause, and cancel jobs, so that I have full control over my downloads.

---

### 2.4 Mobile Application User Stories

**US-M-001 — Share URL to App**
> As a **mobile user**, I want to share a URL from my browser directly to the MediaForge app, so that I can quickly initiate a download.

---

**US-M-002 — Save to Device Gallery**
> As a **mobile user**, I want downloaded media to be saved to my device gallery, so that I can access it from other apps.

---

**US-M-003 — Background Conversion**
> As a **mobile user**, I want conversions to continue in the background while I use other apps, so that I don't have to keep the app open.

---

### 2.5 Administrator Stories

**US-A-001 — View System Metrics**
> As an **administrator**, I want to view system metrics including active jobs, queue depth, and error rates, so that I can monitor system health.

---

**US-A-002 — Manage Users**
> As an **administrator**, I want to list, search, and deactivate user accounts, so that I can enforce platform policies.

---

**US-A-003 — Configure Source Adapters**
> As an **administrator**, I want to enable or disable specific media source adapters, so that I can control which sources the platform supports.

---

## 3. Use Cases

### UC-001 — Download Media from URL

**Primary Actor:** Guest User / Registered User
**Preconditions:** User has a valid, authorized URL
**Main Flow:**
1. User navigates to the Download page.
2. User pastes or types a URL.
3. System validates the URL and identifies the source adapter.
4. System fetches media metadata (title, thumbnail, available qualities).
5. System displays quality options to the user.
6. User selects desired quality and output format.
7. User clicks "Download".
8. System initiates the download job.
9. System displays real-time download progress.
10. Download completes; file is saved to the output location.

**Alternative Flows:**
- 3a. URL is not supported → System shows "Unsupported source" error.
- 3b. Network error during metadata fetch → System shows "Could not retrieve media info" error with retry option.
- 9a. User cancels download → System stops download and cleans up partial files.

**Postconditions:** File is saved; job record is created (for authenticated users).

---

### UC-002 — Convert Media File Online

**Primary Actor:** Guest User / Registered User
**Preconditions:** User has a supported media file (≤2 GB)
**Main Flow:**
1. User navigates to the Convert page.
2. User selects or drags a file.
3. System validates file type and size.
4. System displays file metadata and conversion options.
5. User selects output format and optional parameters.
6. User clicks "Convert".
7. System uploads the file to the backend.
8. Backend creates a conversion job and places it in the queue.
9. Worker picks up the job and processes it via FFmpeg.
10. System updates progress in real-time via polling/WebSocket.
11. Conversion completes; download link is generated.
12. System notifies the user and displays the download link.

**Alternative Flows:**
- 3a. File exceeds 2 GB → System shows "File too large" error.
- 3b. Unsupported file type → System shows "Format not supported" error.
- 9a. Worker encounters FFmpeg error → Job fails; user is notified with error details; retry option displayed.

---

### UC-003 — Convert Media File Offline (Desktop)

**Primary Actor:** Desktop User
**Preconditions:** Desktop application is installed; no internet connection required
**Main Flow:**
1. User opens the desktop application.
2. User selects the "Offline Convert" mode.
3. User selects a local file.
4. System detects format and displays conversion options.
5. User selects output format and destination folder.
6. User clicks "Convert".
7. Application invokes local FFmpeg binary.
8. Application displays real-time conversion progress.
9. Conversion completes; output file is saved to the selected folder.
10. Application shows a success notification.

---

### UC-004 — Batch Process Multiple Files

**Primary Actor:** Registered User
**Preconditions:** User is authenticated
**Main Flow:**
1. User navigates to Batch Convert/Download.
2. User adds multiple URLs or files.
3. User configures output settings for each item (or applies globally).
4. User submits the batch.
5. System creates individual jobs for each item.
6. System processes jobs concurrently (up to system limits).
7. User monitors individual progress for each item.
8. All jobs complete; download links or file paths are provided.

---

### UC-005 — Register and Manage Account

**Primary Actor:** Visitor / Registered User
**Main Flow:**
1. User clicks "Sign Up".
2. User enters email, password, and confirms password.
3. System validates inputs and checks for duplicate email.
4. System creates the account (inactive).
5. System sends a verification email.
6. User clicks the verification link.
7. Account is activated.
8. User logs in with email and password.
9. System issues JWT access token and refresh token.
10. User accesses authenticated features.

---

## 4. MVP Scope

### 4.1 In Scope (MVP)

The Minimum Viable Product covers:

✅ **Download Engine**
- URL input and validation for at least 2 authorized source adapters
- Quality selection (1080p, 720p, 480p, 240p, audio-only)
- Output formats: MP4, MP3
- Real-time progress and cancellation

✅ **Online Conversion (Web)**
- File upload and format conversion via backend
- Supported: video → MP4, audio → MP3, image → JPG/PNG
- Progress tracking and download link generation
- 1-hour file TTL

✅ **Offline Conversion (Desktop)**
- Bundled FFmpeg for Windows (Phase 06)
- Video, audio, and image conversion offline

✅ **Job Management**
- Job queue with status tracking
- Cancellation and retry
- Basic error messages

✅ **Optional Authentication**
- Email + password registration and login
- Conversion history for logged-in users
- JWT-based session management

✅ **Web Application**
- Responsive design (mobile + desktop)
- Download and conversion pages
- History page (authenticated)

---

### 4.2 Out of Scope (MVP)

❌ Social/OAuth login (Google, GitHub) — Phase 08+
❌ 2FA / MFA — Phase 09
❌ Payment / premium tiers — Post-launch
❌ Subtitle extraction / embedding — Phase 08
❌ Video trimming / editing — Phase 08
❌ Browser extension — Post-launch
❌ Internationalization (non-English) — Phase 08+
❌ Scheduled downloads — Phase 08
❌ Malware scanning — Phase 09

---

## 5. Acceptance Criteria

### 5.1 MVP Acceptance Criteria (Phase 04 & 05)

| ID | Criterion | Test Method |
|----|-----------|-------------|
| AC-001 | A user can paste a supported URL and see quality options within 10s | Integration Test |
| AC-002 | A user can download a video at the selected quality | End-to-End Test |
| AC-003 | A user can upload a file and convert it online | Integration Test |
| AC-004 | Converted file download link is valid for 1 hour | Automated Test |
| AC-005 | Download progress updates at least every 2 seconds | Integration Test |
| AC-006 | Cancellation stops a job within 5 seconds | Integration Test |
| AC-007 | Failed jobs are retried up to 3 times | Unit Test |
| AC-008 | Guest users can use all core features without an account | End-to-End Test |
| AC-009 | Registered users can view their conversion history | Integration Test |
| AC-010 | All API endpoints return proper error responses for invalid input | Unit Test |
| AC-011 | No credentials are logged or exposed in API responses | Security Test |
| AC-012 | Temporary files are deleted after 1 hour TTL | Integration Test |
| AC-013 | Web app achieves Lighthouse Performance score ≥80 | Lighthouse Audit |
| AC-014 | All pages are WCAG 2.1 AA accessible | Accessibility Audit |
