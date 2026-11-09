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
  <a href="https://github.com/rusiru-242/mediaforge/blob/main/LICENSE">
    <img src="https://img.shields.io/badge/license-MIT-blue.svg" alt="License"/>
  </a>
  <img src="https://img.shields.io/badge/phase-04%20Downloader-violet" alt="Phase"/>
  <img src="https://img.shields.io/badge/status-Phase%2004%20Complete-success" alt="Status"/>
</p>

---

## 📖 Overview

**MediaForge** is an all-in-one, cross-platform media processing suite that combines:

- 🔽 **Media Downloader** — Download videos and images from authorized, supported URLs in multiple quality options with strict SSRF defense.
- 🔄 **Media Converter** — Convert video, audio, and image files between popular formats — online (via Spring Boot backend) and offline (natively in desktop/mobile apps).
- 📦 **Batch Processing** — Queue and process multiple files simultaneously with real-time progress tracking.
- 🔐 **Optional Accounts** — Save conversion history and preferences with optional user accounts.
- 🛡️ **Ephemeral Lifecycle** — Processed files and media caches are automatically purged after 24 hours.

---

## 🏗️ Architecture

MediaForge is a **monorepo** composed of four primary applications:

| Component | Technology | Description | Status |
|-----------|-----------|-------------|:------:|
| `backend/` | Java 21, Spring Boot 3.5, Spring Security, Flyway, PostgreSQL | High-performance REST API, job management, SSRF protection, Downloader Engine | ✅ Implemented (Phase 04) |
| `web/` | Next.js 15, React 19, TypeScript, Tailwind CSS, Vitest | Responsive modern web portal with live API telemetry & Downloader UI | ✅ Implemented (Phase 04) |
| `apps/flutter_app/` | Flutter 3 (Dart) | Desktop (Win/macOS/Linux) & Mobile (Android/iOS) | ⬜ Planned (Phase 06/07) |
| `workers/media-processor/` | FFmpeg 6+, Node.js / Java Worker | Distributed media download and transcoding worker engine | ⬜ Planned (Phase 05) |

---

## 🚀 Features

- ✅ Download from authorized supported video/image sources (with SSRF protection)
- ✅ Quality selection (1080p, 720p, 480p, 240p, audio-only)
- ✅ Output formats: MP4, WEBM, MKV, MP3, WAV, FLAC, AAC, M4A, WEBP, PNG, JPEG, GIF
- ✅ Online conversion (backend-processed via Spring Boot REST APIs)
- ✅ Batch processing orchestration interface and queue management
- ✅ Real-time async progress tracking, cancellation, and polling
- ✅ Comprehensive RFC 7807 problem details error handling
- ✅ Dark/Light responsive modern theme with persistent toggle
- ✅ Ephemeral 24-hour retention lifecycle

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| Backend API | Java 21, Spring Boot 3.5, Spring Security, Spring Data JPA, Flyway |
| Database | PostgreSQL 16 |
| Background Jobs | Redis 7, Spring Batch / Custom Workers |
| Web Frontend | Next.js 15 (App Router), React 19, TypeScript, Tailwind CSS |
| Frontend Testing | Vitest, React Testing Library, JSDOM |
| Media Processing | FFmpeg 6+, FFprobe |
| Storage | Ephemeral local filesystem / S3-compatible |
| DevOps & CI/CD | GitHub Actions, Docker, Docker Compose |

---

## 📁 Repository Structure

```
mediaforge/
├── backend/                      # Spring Boot REST API (Phase 02)
│   ├── src/main/java/            # Layered Java architecture
│   ├── src/main/resources/       # Flyway migrations V1 & application.yml
│   └── pom.xml                   # Maven dependencies
├── web/                          # Next.js 15 Web Application (Phase 03)
│   ├── src/app/                  # 14 App Router routes & layouts
│   ├── src/components/           # Reusable UI & feedback component library
│   ├── src/services/             # Typed API client
│   ├── src/test/                 # Vitest component & API test suites
│   ├── package.json              # Web dependencies
│   └── next.config.ts            # Next.js build configuration
├── apps/
│   └── flutter_app/              # Flutter desktop & mobile app
├── workers/
│   └── media-processor/          # FFmpeg background job workers
├── docs/
│   ├── downloader/               # Phase 04 Downloader architecture, API, security & testing docs
│   ├── web/                      # Phase 03 Web architecture & API docs
│   ├── architecture/             # System architecture documents
│   ├── requirements/             # Functional & non-functional requirements
│   ├── workflows/                # Workflow documentation
│   ├── diagrams/                 # Mermaid diagrams
│   └── roadmap/                  # Development phases & roadmap
├── .github/
│   └── workflows/                # Web CI & Backend CI workflows
├── .gitignore
├── .editorconfig
├── .env.example
├── CONTRIBUTING.md
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
| **05** | Online Media Converter (FFmpeg) | ⬜ Next Phase |
| **06** | Desktop Application (Flutter) | ⬜ Planned |
| **07** | Mobile Application (Flutter) | ⬜ Planned |
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
| Docker & Docker Compose | 24+ | ✅ |
| Git | 2.40+ | ✅ |

### 2. Run the Backend API

```bash
# Start PostgreSQL database
docker compose up -d postgres

# Start Spring Boot application
cd backend
mvn spring-boot:run
# Backend runs at http://localhost:8080/api/v1
# Swagger UI available at http://localhost:8080/swagger-ui.html
```

### 3. Run the Next.js Web Portal

```bash
cd web

# Install dependencies
npm install

# Run unit and component test suite
npm run test

# Run ESLint linter
npm run lint

# Build production bundle
npm run build

# Start local development server
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
