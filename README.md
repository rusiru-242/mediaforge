<p align="center">
  <img src="docs/diagrams/logo-placeholder.svg" alt="MediaForge Logo" width="120"/>
</p>

<h1 align="center">MediaForge</h1>
<p align="center">
  <strong>All-in-one cross-platform media downloader & universal media converter</strong>
</p>

<p align="center">
  <a href="https://github.com/rusiru-242/mediaforge/actions/workflows/web-ci.yml">
    <img src="https://github.com/rusiru-242/mediaforge/actions/workflows/web-ci.yml/badge.svg" alt="Web CI"/>
  </a>
  <a href="https://github.com/rusiru-242/mediaforge/actions/workflows/backend-ci.yml">
    <img src="https://github.com/rusiru-242/mediaforge/actions/workflows/backend-ci.yml/badge.svg" alt="Backend CI"/>
  </a>
  <a href="https://github.com/rusiru-242/mediaforge/actions/workflows/flutter-desktop-ci.yml">
    <img src="https://github.com/rusiru-242/mediaforge/actions/workflows/flutter-desktop-ci.yml/badge.svg" alt="Flutter Desktop CI"/>
  </a>
  <a href="https://github.com/rusiru-242/mediaforge/actions/workflows/flutter-mobile-ci.yml">
    <img src="https://github.com/rusiru-242/mediaforge/actions/workflows/flutter-mobile-ci.yml/badge.svg" alt="Flutter Mobile CI"/>
  </a>
  <a href="https://github.com/rusiru-242/mediaforge/blob/main/LICENSE">
    <img src="https://img.shields.io/badge/license-MIT-blue.svg" alt="License"/>
  </a>
  <img src="https://img.shields.io/badge/architecture-database--free-emerald" alt="Database-Free"/>
  <img src="https://img.shields.io/badge/mobile-Android%20%7C%20iOS-green" alt="Flutter Mobile"/>
  <img src="https://img.shields.io/badge/desktop-Flutter%203-blue" alt="Flutter Desktop"/>
</p>

---

## 📖 Overview

**MediaForge** is an all-in-one, cross-platform media processing suite operating on a **database-free, privacy-first, ephemeral architecture**:

- 🔽 **Media Downloader** — Download videos and images from authorized, supported URLs in multiple quality options with strict SSRF defense.
- 🔄 **Online Media Converter** — Server-side FFmpeg transcoding engine with live progress reporting, resolution scaling, and cooperative cancellation.
- 💻 **Desktop Application (Flutter)** — Fast, native desktop app (Windows, macOS, Linux) with 100% offline conversion, video-to-audio extraction, image compression, batch processing, and zero external backend required for local files.
- 📦 **Batch Processing** — Queue and convert multiple audio, video, or image files in parallel with intelligent format compatibility detection.
- 🎛️ **Quality Presets** — Standardized presets across Video (Original, High, Balanced, Small), Audio (320k, 192k, 128k), and Image (90%, 75%, 50%).
- ⚡ **Enhanced Downloader** — Real-time download speed tracking (KB/s, MB/s), byte counter, ETA estimation, cancellation, and retry recovery.
- 🛡️ **Smart File Safety** — Collision-free output naming, atomic writes, and automatic cleanup of partial failed downloads.
- 🔒 **Privacy by Design** — Zero user accounts, zero logins, zero database storage. All jobs are tracked in-memory.
- 🛡️ **Ephemeral Lifecycle** — Processed files and media caches are automatically purged after 24 hours.

---

## 🏗️ Architecture

MediaForge is a **monorepo** composed of four primary applications:

| Component | Technology | Description | Status |
|-----------|-----------|-------------|:------:|
| `backend/` | Java 21, Spring Boot 3.4+, Spring Security, In-Memory Ephemeral Store, FFmpeg | High-performance database-free REST API, job management, SSRF protection, Downloader & Online Converter Engine | ✅ Implemented |
| `web/` | Next.js 15, React 19, TypeScript, Tailwind CSS, Vitest | Responsive modern web portal with live API telemetry, Downloader UI & Universal Converter UI | ✅ Implemented |
| `apps/flutter_app/` | Flutter 3.24+, Dart 3.5+, Riverpod, Local FFmpeg | Native cross-platform desktop & mobile application for Android, iOS, Windows, macOS, and Linux with full offline transcoding | ✅ Implemented (Phases 06 & 07) |
| `workers/media-processor/` | FFmpeg 6+, Java ThreadPoolTaskExecutor Workers | Integrated background transcoding worker pool | ✅ Implemented |

---

## 🚀 Features

- ✅ Download from authorized supported video/image sources (with SSRF protection)
- ✅ Quality selection presets (Original, High 1080p, Balanced 720p, Small 480p)
- ✅ Audio presets (High 320k, Standard 192k, Small 128k) & Image presets (90%, 75%, 50%)
- ✅ Real-time download speed calculation (KB/s, MB/s), byte counter, ETA, and cancellation
- ✅ Output formats: MP4, WEBM, MKV, MOV, AVI, MP3, WAV, FLAC, AAC, M4A, OGG, WEBP, PNG, JPEG, AVIF
- ✅ Online conversion (backend-processed via Spring Boot REST APIs)
- ✅ Offline desktop & mobile conversion (runs standalone without Spring Boot or internet)
- ✅ Video-to-audio extraction (MP4, MKV, WEBM, MOV -> MP3, WAV, AAC, FLAC)
- ✅ Batch processing with per-file compatible format resolution and quick apply shortcuts
- ✅ Collision avoidance and unique file naming preventing file overwrite
- ✅ Real-time async progress tracking, cancellation, and polling
- ✅ Standardized transient error recovery and partial file cleanup
- ✅ Dark/Light responsive modern theme with persistent toggle
- ✅ 100% Database-Free and Account-Free architecture

---

## 🗺️ Project Roadmap & Phase Progress

| Phase | Description | Status |
| :---: | :--- | :---: |
| **01** | Project Initialization & Repository Setup | ✅ Completed |
| **02** | Backend Foundation & REST Architecture | ✅ Completed |
| **03** | Web Application Development (Next.js 15 + React 19) | ✅ Completed |
| **04** | Media Downloader Engine (SSRF-Protected) | ✅ Completed |
| **05** | Online Media Converter Engine (FFmpeg) | ✅ Completed |
| **Refactor** | Database-Free Ephemeral Architecture Migration | ✅ Completed |
| **06** | Cross-Platform Desktop Application (Windows, macOS, Linux) | ✅ Completed |
| **07** | Android & iOS Mobile Application (Flutter Responsive) | ✅ Completed |
| **08** | Advanced Features & Cross-Platform Integration | ✅ Completed |
| **09** | Cloud Deployment, Containerization & Production Release | ⏳ Next Up |

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| Desktop Application | Flutter 3.24+, Dart 3.5+, Riverpod 2.6+, Window Manager |
| Backend API | Java 21, Spring Boot 3.4+, Spring Security |
| Job & File Tracking | In-memory `ConcurrentHashMap` with short-lived access tokens |
| Background Jobs | Java `ThreadPoolTaskExecutor` / Virtual Thread workers |
| Web Frontend | Next.js 15 (App Router), React 19, TypeScript, Tailwind CSS |
| Testing Suites | Vitest (Web), JUnit 5 (Backend), Flutter Test (Desktop) |
| Media Processing | FFmpeg 6+, FFprobe |
| Storage | Ephemeral local filesystem / S3-compatible |
| DevOps & CI/CD | GitHub Actions, Docker, Docker Compose |

---

## 📁 Repository Structure

```
mediaforge/
├── apps/
│   └── flutter_app/              # Flutter Desktop Application (Phase 06)
│       ├── lib/                  # Architecture: core, features, shared
│       ├── test/                 # Widget, unit, and service test suites
│       └── pubspec.yaml          # Flutter dependencies
├── backend/                      # Spring Boot REST API (Database-Free)
│   ├── src/main/java/            # Layered Java architecture & in-memory repos
│   ├── src/main/resources/       # application.yml
│   └── pom.xml                   # Maven dependencies
├── web/                          # Next.js 15 Web Application
│   ├── src/app/                  # 13 App Router routes & layouts
│   ├── src/components/           # Reusable UI & feedback component library
│   ├── src/services/             # Typed API client
│   └── package.json              # Web dependencies
├── docs/
│   ├── desktop/                  # Phase 06 Desktop architecture, setup, ffmpeg docs
│   ├── converter/                # Phase 05 Converter architecture & docs
│   ├── downloader/               # Phase 04 Downloader architecture & docs
│   ├── web/                      # Phase 03 Web architecture & API docs
│   └── roadmap/                  # Development phases & roadmap
├── .github/
│   └── workflows/                # Web, Backend, and Flutter Desktop CI workflows
├── docker-compose.yml
└── README.md
```

---

## 🗺️ Development Roadmap

| Phase | Title | Status |
|:---:|-------|:------:|
| **01** | Foundation, Architecture & GitHub | ✅ Complete |
| **02** | Backend & Database Foundation | ✅ Complete |
| **03** | Website Development & API Integration | ✅ Complete |
| **04** | Media Downloader Engine | ✅ Complete |
| **05** | Online Media Converter (FFmpeg) | ✅ Complete |
| **Refactor** | Database-Free Ephemeral Architecture | ✅ Complete |
| **06** | Desktop Application (Flutter) | ✅ Complete |
| **07** | Mobile Application (Flutter - Android & iOS) | ✅ Complete |
| **08** | Advanced Features & Batch Processing | ⬜ Planned |
| **09** | Security, Testing & Hardening | ⬜ Planned |
| **10** | Production Deployment & Release | ⬜ Planned |

See [`docs/roadmap/`](docs/roadmap/) for detailed phase documentation.

---

## ⚡ Quick Start

### 1. Prerequisites

| Tool | Minimum Version | Verified |
|------|:---------------:|:--------:|
| Node.js | 20+ | ✅ |
| Java | 21+ | ✅ |
| Maven | 3.9+ | ✅ |
| Flutter SDK | 3.24+ | ✅ |
| FFmpeg & FFprobe | 6.0+ | ✅ |
| Git | 2.40+ | ✅ |

### 2. Run the Flutter Application (Desktop & Mobile)

```bash
cd apps/flutter_app

# Fetch dependencies
flutter pub get

# Run static analysis (0 issues)
flutter analyze

# Run comprehensive test suite (20 tests)
flutter test

# Run on Desktop (Windows)
flutter run -d windows

# Build Android Debug APK
flutter build apk --debug

# Run on Android Emulator or Device
flutter run -d android
```

### 3. Run the Backend API (Optional for Desktop Offline Conversion)

```bash
# Start Spring Boot application directly (zero external DB required)
cd backend
mvn spring-boot:run
# Backend runs at http://localhost:8080/api/v1
```

### 4. Run the Next.js Web Portal

```bash
cd web
npm install
npm run test
npm run dev
# Web portal opens at http://localhost:3000
```

---

## 🤝 Contributing

Please read [CONTRIBUTING.md](CONTRIBUTING.md) before submitting pull requests.
We adhere to [Conventional Commits](https://www.conventionalcommits.org/) and [GitHub Flow](https://docs.github.com/en/get-started/using-github/github-flow).

---

## 📄 License

This project is licensed under the MIT License — see the [LICENSE](LICENSE) file for details.

---

## ⚠️ Legal Notice

MediaForge is designed to download and transcode media only from sources that the user is authorized to access. Downloading copyrighted material without permission is prohibited. Users are responsible for complying with applicable copyright laws and platform terms of service.

---

<p align="center">
  Built with ❤️ by <a href="https://github.com/rusiru-242">rusiru-242</a>
</p>
