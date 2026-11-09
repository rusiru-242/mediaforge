# MediaForge — Functional Requirements

**Document Version:** 1.0.0
**Phase:** 01 — Foundation & Architecture
**Last Updated:** 2026-11-09
**Status:** Draft

---

## Table of Contents

1. [Introduction](#1-introduction)
2. [Media Download Requirements](#2-media-download-requirements)
3. [Media Conversion Requirements](#3-media-conversion-requirements)
4. [Batch Processing Requirements](#4-batch-processing-requirements)
5. [Progress Tracking & Job Management](#5-progress-tracking--job-management)
6. [User Account Requirements](#6-user-account-requirements)
7. [File Storage Requirements](#7-file-storage-requirements)
8. [Platform-Specific Requirements](#8-platform-specific-requirements)

---

## 1. Introduction

### 1.1 Purpose

This document defines the functional requirements for MediaForge — an all-in-one cross-platform media downloader and universal media converter. It serves as the authoritative source of truth for feature development across all application components.

### 1.2 Scope

Requirements apply to all four delivery surfaces:
- **Web Application** (Next.js)
- **Desktop Application** (Flutter — Windows, macOS, Linux)
- **Mobile Application** (Flutter — Android, iOS)
- **Backend API** (Spring Boot)

### 1.3 Terminology

| Term | Definition |
|------|-----------|
| Source URL | A URL pointing to a media resource on a supported platform |
| Quality Option | A selectable video resolution (e.g., 1080p, 720p) |
| Conversion Job | A single media file conversion task managed by the system |
| Batch | A group of conversion or download jobs submitted together |
| Worker | A background process that executes media processing tasks |

---

## 2. Media Download Requirements

### FR-DL-001 — URL Input & Validation
- The system **shall** accept a URL input from the user.
- The system **shall** validate that the URL belongs to a supported, authorized source.
- The system **shall** display a clear error message for unsupported or invalid URLs.
- The system **shall** support pasting URLs via clipboard.

### FR-DL-002 — Supported Sources
- The system **shall** support downloading from an extensible list of authorized media sources.
- Each supported source **shall** be implemented as a pluggable adapter.
- The system **shall** display the list of currently supported sources to the user.

### FR-DL-003 — Media Information Extraction
- Upon receiving a valid URL, the system **shall** extract and display:
  - Media title
  - Thumbnail image
  - Available video quality options (e.g., 2160p, 1080p, 720p, 480p, 360p, 240p)
  - Available audio-only options
  - Estimated file sizes per quality option (where available)
  - Media duration

### FR-DL-004 — Quality Selection
- The system **shall** present all available quality options.
- The user **shall** be able to select exactly one quality option per download.
- The system **shall** support the following output formats for downloads:
  - **Video:** MP4, WEBM, MKV
  - **Audio:** MP3

### FR-DL-005 — Download Execution
- The system **shall** initiate the download after quality selection and user confirmation.
- The system **shall** display real-time download progress (percentage, speed, ETA).
- The system **shall** support pausing and resuming downloads (where protocol permits).
- The system **shall** support cancelling an in-progress download.
- The system **shall** store downloaded files in a user-configured or default location.

### FR-DL-006 — Legal Compliance
- The system **shall not** facilitate downloading of content the user is not authorized to access.
- The system **shall** display a legal disclaimer before the first download.
- The system **shall** require explicit user acknowledgement of terms of service.

---

## 3. Media Conversion Requirements

### FR-CV-001 — File Input
- The system **shall** accept media file uploads from the user's local device.
- The system **shall** validate the uploaded file type against supported input formats.
- The system **shall** display the file name, size, duration, and detected format.
- Maximum upload size: **2 GB** (configurable via backend configuration).

### FR-CV-002 — Supported Input Formats

| Category | Formats |
|----------|---------|
| Video | MP4, WEBM, MKV, AVI, MOV, FLV, WMV, M4V, TS, 3GP |
| Audio | MP3, WAV, FLAC, AAC, OGG, OPUS, M4A, WMA |
| Image | JPG/JPEG, PNG, GIF, WEBP, BMP, TIFF, SVG |

### FR-CV-003 — Supported Output Formats

| Category | Formats |
|----------|---------|
| Video | MP4, WEBM, MKV, AVI, MOV, GIF |
| Audio | MP3, WAV, FLAC, AAC, OGG, M4A |
| Image | JPG, PNG, WEBP, GIF, BMP, TIFF |

### FR-CV-004 — Conversion Parameters
- The system **shall** allow the user to configure:
  - Output format
  - Video resolution (for video → video conversions)
  - Video bitrate
  - Audio bitrate
  - Audio sample rate
  - Frame rate (FPS)
  - Quality preset (e.g., fast, balanced, high quality)
- The system **shall** provide sensible default values for all parameters.

### FR-CV-005 — Online Conversion (Cloud)
- The web and mobile applications **shall** support cloud-based conversion via the backend API.
- The backend **shall** process conversion jobs asynchronously using background workers.
- The system **shall** provide a download link for completed conversions.
- Converted files **shall** be available for download for a minimum of **1 hour** after completion.
- The system **shall** automatically delete temporary files after the TTL expires.

### FR-CV-006 — Offline Conversion (Local)
- The desktop and mobile applications **shall** support local conversion using embedded FFmpeg.
- Offline conversion **shall** function without any internet connection.
- Offline conversion **shall** store output files in a user-configured directory.
- The application **shall** display real-time conversion progress for offline jobs.

---

## 4. Batch Processing Requirements

### FR-BP-001 — Batch Download
- The system **shall** allow users to submit multiple download URLs in a single batch.
- Batch download items **shall** be processed concurrently (up to system limits).
- The system **shall** display individual progress for each item in the batch.

### FR-BP-002 — Batch Conversion
- The system **shall** allow users to upload multiple files for conversion in a single batch.
- Each file in a batch **shall** be assignable to a different output format.
- The system **shall** process batch conversion jobs in a managed queue.

### FR-BP-003 — Queue Management
- The system **shall** display a job queue showing pending, active, completed, and failed jobs.
- The user **shall** be able to reorder pending jobs in the queue.
- The user **shall** be able to remove pending jobs from the queue.
- The system **shall** persist the queue state across application restarts (desktop/mobile).

---

## 5. Progress Tracking & Job Management

### FR-PT-001 — Real-time Progress
- The system **shall** display conversion/download progress as a percentage.
- The system **shall** display estimated time remaining.
- The system **shall** display current processing speed.
- The system **shall** update progress information at least every 2 seconds.

### FR-PT-002 — Job Status
- Each job **shall** have one of the following statuses:
  - `QUEUED` — waiting to be processed
  - `PROCESSING` — actively being processed
  - `COMPLETED` — successfully finished
  - `FAILED` — processing failed with error
  - `CANCELLED` — cancelled by the user
  - `PAUSED` — paused by the user

### FR-PT-003 — Cancellation
- The user **shall** be able to cancel any job in `QUEUED` or `PROCESSING` status.
- Cancellation **shall** be immediate for queued jobs.
- Cancellation **shall** stop processing within 5 seconds for active jobs.
- Resources associated with cancelled jobs **shall** be cleaned up.

### FR-PT-004 — Error Handling
- The system **shall** display human-readable error messages for all failure types.
- Failed jobs **shall** be retryable by the user.
- The system **shall** log technical error details for debugging.
- The system **shall** implement automatic retry (up to 3 attempts) for transient failures.

### FR-PT-005 — Notifications
- The system **shall** notify the user when a job completes or fails.
- Desktop and mobile applications **shall** support system-level notifications.
- The web application **shall** display in-app toast notifications.

---

## 6. User Account Requirements

### FR-UA-001 — Optional Authentication
- User accounts **shall** be **optional** — the application **shall** be fully functional without an account.
- Guest users **shall** be able to convert and download media with session-based tracking.
- Registered users **shall** receive additional benefits (history, preferences, higher limits).

### FR-UA-002 — Registration & Login
- Users **shall** be able to register with an email address and password.
- The system **shall** validate email format and enforce password strength requirements.
- The system **shall** send a verification email upon registration.
- The system **shall** support password reset via email.

### FR-UA-003 — Conversion History
- Registered users **shall** be able to view their conversion and download history.
- History entries **shall** include: filename, format, timestamp, job status, and download link (if still valid).
- Users **shall** be able to clear their conversion history.
- History **shall** be paginated with a maximum of 50 items per page.

### FR-UA-004 — User Preferences
- Registered users **shall** be able to save default conversion settings.
- Users **shall** be able to set a preferred default output format per media type.
- Users **shall** be able to configure notification preferences.

---

## 7. File Storage Requirements

### FR-FS-001 — Temporary Storage
- Uploaded and converted files **shall** be stored temporarily on the backend.
- Temporary files **shall** be automatically deleted after a configurable TTL (default: 1 hour).
- The system **shall** clean up orphaned files from interrupted sessions.

### FR-FS-002 — Storage Backends
- The system **shall** support **local filesystem** storage for development and self-hosted deployments.
- The system **shall** support **S3-compatible** object storage (AWS S3, MinIO, Cloudflare R2) for production.
- The storage backend **shall** be configurable via environment variables.

### FR-FS-003 — Download Links
- Completed conversions **shall** generate a secure, time-limited download link.
- Download links **shall** expire after the file TTL period.
- Download links **shall** be signed to prevent unauthorized access.

---

## 8. Platform-Specific Requirements

### FR-PS-001 — Web Application
- The web application **shall** be fully responsive (mobile, tablet, desktop viewports).
- The web application **shall** support the latest 2 versions of Chrome, Firefox, Safari, and Edge.
- The web application **shall** support online conversion (backend API) only.

### FR-PS-002 — Desktop Application (Flutter)
- The desktop application **shall** support Windows 10+, macOS 12+, and Ubuntu 20.04+.
- The desktop application **shall** support both online and offline conversion.
- Offline conversion **shall** use a bundled FFmpeg binary.
- The desktop application **shall** support system tray integration.

### FR-PS-003 — Mobile Application (Flutter)
- The mobile application **shall** support Android 8.0 (API 26)+ and iOS 14.0+.
- The mobile application **shall** support cloud-based online conversion.
- Offline conversion on mobile **shall** be supported for audio and image conversions.
- The application **shall** request appropriate storage permissions.
