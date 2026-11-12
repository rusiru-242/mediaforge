# MediaForge Cross-Platform Architecture Overview

## 1. System Vision & Paradigm
MediaForge is a high-performance, database-free media processing ecosystem designed to run across **Web**, **Desktop (Windows, macOS, Linux)**, and **Mobile (Android, iOS)** platforms.

Unlike conventional platforms that mandate user registration, databases, and persistent telemetry, MediaForge operates on a **zero-retention, ephemeral-by-design architecture**:
- **Zero Database**: No PostgreSQL, Neon, SQLite, or Redis.
- **Zero User Accounts**: No authentication barriers, login walls, or credentials.
- **Zero Persistent History**: All jobs, temporary files, and downloaded media are strictly ephemeral and purged immediately or on schedule.

---

## 2. Platform Architecture Models

```
+---------------------------------------------------------------------------------------+
|                                  MediaForge Clients                                   |
|                                                                                       |
|   +-----------------------+     +------------------------+     +-------------------+  |
|   |   Next.js 15 Web      |     |  Flutter Desktop App   |     | Flutter Mobile    |  |
|   |   (React 19 + TS)     |     |  (Windows/macOS/Linux) |     | (Android / iOS)   |  |
|   +-----------+-----------+     +-----------+------------+     +---------+---------+  |
+---------------|-----------------------------|----------------------------|------------+
                |                             |                            |
                v                             v                            v
    +-----------------------+     +------------------------+     +-------------------+
    | MediaForge SpringBoot |     | Native Local FFmpeg /  |     | Mobile FFmpegKit/ |
    | REST API Engine       |     | FFprobe Process        |     | Image Libraries   |
    | (Server-Side Workers) |     | (Offline Desktop)      |     | (Offline Device)  |
    +-----------+-----------+     +------------------------+     +-------------------+
                |
                v
    +-----------------------+
    | Local Ephemeral Temp  |
    | Storage (24h Purge)   |
    +-----------------------+
```

### A. Web Platform Architecture
- **Client**: Next.js 15 (App Router), React 19, TypeScript, Tailwind CSS.
- **Backend Bridge**: Spring Boot 3.4 REST API engine.
- **Processing**: Uploaded media streams to backend `/api/v1/files/upload`. Background workers execute FFmpeg conversions asynchronously.
- **Progress Tracking**: Real-time polling via `/api/v1/jobs/{id}/progress` parsing FFmpeg stdout/stderr stream statistics.
- **Packaging**: Batch jobs are zipped on-the-fly and streamed via `/api/v1/conversions/batch/{id}/download`.

### B. Desktop Platform Architecture (Windows, macOS, Linux)
- **Framework**: Flutter Desktop with Dart 3.
- **Engine**: Direct offline execution using native system FFmpeg/FFprobe binaries or bundled executables.
- **Filesystem**: Direct OS file access with zero server roundtrips.
- **Collision Avoidance**: Automatic unique output filename calculation (`file (1).ext`) to preserve user data.

### C. Mobile Platform Architecture (Android, iOS)
- **Framework**: Flutter Mobile (Android SDK, iOS SDK).
- **Engine**: On-device native processing with scoped storage integration (Android Scoped Storage / iOS App Documents).
- **Responsive Layout**: Adaptive UI switching between Desktop Rail/Drawer and Mobile Bottom Navigation Bar.
- **Sharing**: Native platform sharing via `share_plus`.

---

## 3. Core Engine Subsystems

### A. Format Detection & Compatibility Validation
- Dynamic extension parsing identifying video (`mp4, mkv, webm, mov, avi`), audio (`mp3, wav, aac, flac, m4a, ogg`), and image (`webp, jpg, png, avif`).
- Enforces strict container and codec compatibility. For example:
  - Video inputs can transcode to video containers or extract audio to lossless/lossy audio containers.
  - Audio inputs cannot be converted to video containers without synthetic video generators.
  - Image inputs can only convert to image formats.

### B. Standardized Quality Presets
Unified presets across Backend, Web, and Flutter applications:
- **Video Presets**:
  - `original`: Native source resolution and bitrate.
  - `high`: 1080p, 2500 kbps video, 256 kbps audio.
  - `balanced`: 720p, 1200 kbps video, 192 kbps audio (Recommended).
  - `small`: 480p, 600 kbps video, 128 kbps audio.
- **Audio Presets**:
  - `high`: 320 kbps, 48000 Hz.
  - `standard`: 192 kbps, 44100 Hz.
  - `small`: 128 kbps, 44100 Hz.
- **Image Presets**:
  - `high`: 90% quality (visually lossless).
  - `balanced`: 75% quality (optimal web balance).
  - `compression`: 50% quality (maximum file size reduction).

### C. Smart File Handling & Atomic Operations
- **Collision Avoidance**: Computes unique destination path using sequential indexing.
- **Atomic Operations**: Downloads and conversions write to temporary `.part` or isolated files before renaming on success.
- **Automatic Cleanup**: Partial or aborted streams are deleted immediately upon cancellation or failure.
