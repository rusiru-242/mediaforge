<p align="center">
  <img src="docs/diagrams/logo-placeholder.svg" alt="MediaForge Logo" width="120"/>
</p>

<h1 align="center">MediaForge</h1>
<p align="center">
  <strong>All-in-one cross-platform media downloader & universal media converter</strong>
</p>

<p align="center">
  <a href="https://github.com/rusiru-242/mediaforge/actions/workflows/validate-docs.yml">
    <img src="https://github.com/rusiru-242/mediaforge/actions/workflows/validate-docs.yml/badge.svg" alt="Docs Validation"/>
  </a>
  <a href="https://github.com/rusiru-242/mediaforge/blob/main/LICENSE">
    <img src="https://img.shields.io/badge/license-MIT-blue.svg" alt="License"/>
  </a>
  <img src="https://img.shields.io/badge/phase-01%20Foundation-orange" alt="Phase"/>
  <img src="https://img.shields.io/badge/status-In%20Development-yellow" alt="Status"/>
</p>

---

## 📖 Overview

**MediaForge** is an all-in-one, cross-platform media processing suite that combines:

- 🔽 **Media Downloader** — Download videos and images from authorized, supported URLs in multiple quality options.
- 🔄 **Media Converter** — Convert video, audio, and image files between popular formats — online (via backend) and offline (natively in desktop/mobile apps).
- 📦 **Batch Processing** — Queue and process multiple files simultaneously with real-time progress tracking.
- 🔐 **Optional Accounts** — Save conversion history and preferences with optional user accounts.

---

## 🏗️ Architecture

MediaForge is a **monorepo** composed of four primary applications:

| Component | Technology | Description |
|-----------|-----------|-------------|
| `backend/` | Java 21, Spring Boot 3, Spring Security | REST API, job management, auth |
| `web/` | Next.js 15, TypeScript, Tailwind CSS | Web application |
| `apps/flutter_app/` | Flutter 3 | Desktop (Win/macOS/Linux) & Mobile (Android/iOS) |
| `workers/media-processor/` | Node.js / Java Worker | FFmpeg-powered background job processor |

---

## 🚀 Features

- ✅ Download from authorized supported video/image sources
- ✅ Quality selection (1080p, 720p, 480p, 240p, audio-only)
- ✅ Output formats: MP4, WEBM, MKV, MP3
- ✅ Online conversion (backend-processed)
- ✅ Offline conversion (desktop & mobile, FFmpeg embedded)
- ✅ Batch processing and download queue management
- ✅ Real-time progress tracking and cancellation
- ✅ Comprehensive error handling and retry logic
- ✅ Optional user accounts and conversion history
- ✅ Secure temporary file storage with auto-cleanup

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| Backend API | Java 21, Spring Boot 3.x, Spring Security, Spring Data JPA |
| Database | PostgreSQL 16 |
| Background Jobs | Redis 7, Spring Batch / Custom Workers |
| Web Frontend | Next.js 15, TypeScript, Tailwind CSS, shadcn/ui |
| Desktop & Mobile | Flutter 3 (Dart) |
| Media Processing | FFmpeg 6+, FFprobe |
| Storage | Local filesystem / S3-compatible (MinIO, AWS S3) |
| DevOps | Docker, Docker Compose, GitHub Actions |

---

## 📁 Repository Structure

```
mediaforge/
├── backend/              # Spring Boot REST API
├── web/                  # Next.js web application
├── apps/
│   └── flutter_app/      # Flutter desktop & mobile app
├── workers/
│   └── media-processor/  # FFmpeg background job workers
├── docs/
│   ├── requirements/     # Functional & non-functional requirements
│   ├── architecture/     # System architecture documents
│   ├── workflows/        # Workflow documentation
│   ├── diagrams/         # Mermaid diagrams
│   ├── roadmap/          # Development phases & roadmap
│   └── github/           # GitHub-specific documentation
├── .github/
│   ├── ISSUE_TEMPLATE/   # GitHub issue templates
│   └── workflows/        # GitHub Actions CI/CD
├── .gitignore
├── .editorconfig
├── .env.example
├── CONTRIBUTING.md
└── README.md
```

---

## 🗺️ Development Roadmap

| Phase | Title | Status |
|-------|-------|--------|
| 01 | Foundation, Architecture & GitHub | 🟡 In Progress |
| 02 | Backend & Database | ⬜ Planned |
| 03 | Website Development | ⬜ Planned |
| 04 | Media Downloader Engine | ⬜ Planned |
| 05 | Online Media Converter | ⬜ Planned |
| 06 | Desktop Application | ⬜ Planned |
| 07 | Mobile Application | ⬜ Planned |
| 08 | Advanced Features & Integration | ⬜ Planned |
| 09 | Security, Testing & CI/CD | ⬜ Planned |
| 10 | Deployment & Release | ⬜ Planned |

See [`docs/roadmap/`](docs/roadmap/) for detailed phase documentation.

---

## ⚡ Quick Start

> **Note:** Application code is not yet implemented. This section will be updated as each phase completes.

### Prerequisites

| Tool | Minimum Version |
|------|----------------|
| Git | 2.40+ |
| Java | 21+ |
| Node.js | 20+ |
| Flutter | 3.10+ |
| Docker | 24+ |

### Setup

```bash
# Clone the repository
git clone https://github.com/rusiru-242/mediaforge.git
cd mediaforge

# Copy environment variables
cp .env.example .env
# Edit .env with your values

# Start infrastructure (PostgreSQL + Redis)
docker compose up -d db redis
```

---

## 🤝 Contributing

Please read [CONTRIBUTING.md](CONTRIBUTING.md) before submitting pull requests.

We follow [Conventional Commits](https://www.conventionalcommits.org/) and [GitHub Flow](https://docs.github.com/en/get-started/using-github/github-flow).

---

## 📄 License

This project is licensed under the MIT License — see the [LICENSE](LICENSE) file for details.

---

## ⚠️ Legal Notice

MediaForge is designed to download and process only content that the user is authorized to access. Downloading copyrighted content without permission is prohibited. Users are responsible for complying with applicable laws and the terms of service of any platform they interact with.

---

<p align="center">
  Built with ❤️ by <a href="https://github.com/rusiru-242">rusiru-242</a>
</p>

