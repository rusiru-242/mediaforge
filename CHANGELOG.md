# Changelog

All notable changes to the MediaForge project are documented in this file.
The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [1.0.0] - 2026-11-13

### Initial Production Release

#### Core Architecture
- **Zero-Database Foundation:** Fully ephemeral processing engine with zero dependency on PostgreSQL, Neon, SQLite, or Redis.
- **Privacy-First Model:** Zero user accounts, zero registration/login requirements, zero permanent download or conversion histories.
- **In-Memory Job State:** Thread-safe concurrent job management with 24-hour automatic disk cleanup for temporary media artifacts.

#### Capabilities & Features
- **Media Downloader Engine:**
  - High-performance streaming downloader for permitted web media sources.
  - Multi-hop SSRF validation (`UrlSecurityValidator`) with DNS resolution, private IP blocking, and link-local/cloud metadata protection.
  - Format and quality inspection with metadata extraction.
  - Granular real-time progress tracking and cancellation support.
- **Universal Online & Offline Media Converter:**
  - Video transcoding across MP4, WebM, MKV, MOV, and AVI.
  - Audio transcoding across MP3, WAV, AAC, FLAC, M4A, and OGG.
  - Image conversion across JPG, PNG, WebP, and AVIF with decompression bomb defense (16k max dimension, 100M pixel cap).
  - Fast MP3 audio extraction from video files (`-vn -c:a libmp3lame`).
  - Batch conversion pipeline with aggregate progress and concurrent worker throttling.
  - Automatic EXIF/GPS metadata stripping (`-map_metadata -1`) by default.
- **Web Portal (Next.js 15):**
  - Modern, responsive UI with Tailwind CSS and dark mode support.
  - Drag-and-drop file upload zone with client-side format filtering.
  - Responsive navigation with mobile drawer and active route highlighting.
  - Comprehensive HTTP security headers (strict CSP, `X-Frame-Options: DENY`, `nosniff`).
- **Cross-Platform Desktop & Mobile Applications (Flutter 3.x):**
  - Native desktop support for Windows, macOS, and Linux with window management.
  - Mobile application for Android and iOS with adaptive navigation shells (NavigationRail on tablet/desktop, NavigationBar on phone).
  - Native offline media processing capability without requiring a Spring Boot backend.
  - System file picker integration and direct-to-disk saving.
- **DevOps & CI/CD:**
  - Hardened GitHub Actions workflows for Backend, Web, Desktop, Mobile, and Release automation.
  - Production multi-stage Dockerfiles and `docker-compose.prod.yml` configuration.

