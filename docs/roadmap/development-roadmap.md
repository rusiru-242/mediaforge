# MediaForge — Development Roadmap

**Document Version:** 1.0.0
**Last Updated:** 2026-11-09
**Status:** Phase 01 In Progress

---

## Overview

MediaForge is developed across **10 structured phases**, each building on the previous. Each phase has defined objectives, deliverables, acceptance criteria, and a dedicated GitHub branch.

| Phase | Title | Branch | Status |
|-------|-------|--------|--------|
| 01 | Foundation, Architecture & GitHub | `chore/phase-01-foundation` | 🟡 In Progress |
| 02 | Backend & Database | `chore/phase-02-backend` | ⬜ Planned |
| 03 | Website Development | `chore/phase-03-website` | ⬜ Planned |
| 04 | Media Downloader Engine | `chore/phase-04-downloader` | ⬜ Planned |
| 05 | Online Media Converter | `chore/phase-05-converter-online` | ⬜ Planned |
| 06 | Desktop Application | `chore/phase-06-desktop` | ⬜ Planned |
| 07 | Mobile Application | `chore/phase-07-mobile` | ⬜ Planned |
| 08 | Advanced Features & Integration | `chore/phase-08-advanced` | ⬜ Planned |
| 09 | Security, Testing & CI/CD | `chore/phase-09-security-testing` | ⬜ Planned |
| 10 | Deployment & Release | `chore/phase-10-deployment` | ⬜ Planned |

---

## Phase 01 — Foundation, Architecture & GitHub

**Branch:** `chore/phase-01-foundation`
**Duration:** 1 week

### Objectives
- Establish the monorepo project structure.
- Define and document system architecture.
- Set up GitHub repository with proper workflow configuration.
- Create comprehensive requirements documentation.

### Features
- Monorepo structure with all application directories.
- GitHub issue templates and PR template.
- GitHub Actions for documentation validation.
- Complete Mermaid architecture diagrams.
- Full requirements documentation.

### Development Tasks
- [x] Environment validation (Git, Java, Node.js, Flutter, Docker)
- [x] GitHub repository creation (private)
- [x] Monorepo directory structure
- [x] `.gitignore`, `.editorconfig`, `.env.example`
- [x] `README.md`, `CONTRIBUTING.md`
- [x] GitHub issue templates (Bug, Feature, Docs, Task)
- [x] PR template
- [x] GitHub Actions: validate-docs workflow
- [x] Functional requirements documentation
- [x] Non-functional requirements documentation
- [x] User stories and use cases
- [x] System architecture documentation
- [x] 8 Mermaid diagrams
- [x] Development roadmap (this document)

### Deliverables
- Fully configured GitHub repository
- Complete documentation set
- Validated project structure

### Dependencies
- None (first phase)

### Acceptance Criteria
- [ ] All required directories exist with `.gitkeep`
- [ ] GitHub Actions `validate-docs` workflow passes
- [ ] All 8 diagrams render correctly in GitHub
- [ ] `README.md` and `CONTRIBUTING.md` are complete
- [ ] No secrets committed to the repository
- [ ] Branch `chore/phase-01-foundation` pushed to remote
- [ ] PR created from `chore/phase-01-foundation` → `develop`

### Testing Requirements
- Structure validation via GitHub Actions
- Manual review of all documentation
- Mermaid diagram rendering verification

---

## Phase 02 — Backend & Database

**Branch:** `chore/phase-02-backend`
**Duration:** 2–3 weeks

### Objectives
- Initialize and configure the Spring Boot backend project.
- Set up PostgreSQL with Flyway migrations.
- Implement core domain entities and repositories.
- Implement JWT authentication (register, login, refresh, logout).
- Set up Redis integration.
- Create Docker Compose for local development.
- Expose health check and OpenAPI documentation endpoints.

### Features
- Spring Boot project scaffolding (Maven)
- PostgreSQL schema (Flyway migrations V1–V5)
- User registration and login (JWT)
- Refresh token rotation
- Role-based access control (GUEST, USER, ADMIN)
- Job entity and repository
- Redis connection and job queue stub
- Docker Compose stack (API, DB, Redis)
- OpenAPI 3.0 (`/swagger-ui.html`)
- Spring Boot Actuator (`/actuator/health`)

### Development Tasks
- [ ] Initialize Spring Boot project (Spring Initializr)
- [ ] Configure `application.yml` / `application-dev.yml`
- [ ] Add Maven dependencies (Security, JPA, Flyway, Redis, JWT, Validation)
- [ ] Create Flyway migration V1: users table
- [ ] Create Flyway migration V2: jobs table
- [ ] Create Flyway migration V3: conversion_options, source_adapters
- [ ] Create Flyway migration V4: user_preferences, refresh_tokens
- [ ] Implement `User`, `Job`, `RefreshToken` JPA entities
- [ ] Implement repositories
- [ ] Implement `AuthService` (register, login, refresh, logout)
- [ ] Implement JWT token generation and validation
- [ ] Implement `JwtAuthenticationFilter`
- [ ] Configure Spring Security filter chain
- [ ] Implement `AuthController` endpoints
- [ ] Implement `UserController` (/users/me)
- [ ] Configure Redis (Lettuce client)
- [ ] Implement stub `JobService` and `JobController`
- [ ] Implement `GlobalExceptionHandler` (RFC 7807)
- [ ] Configure rate limiting (Bucket4j or custom filter)
- [ ] Add OpenAPI configuration (SpringDoc)
- [ ] Write Docker Compose for dev stack
- [ ] Write unit tests for AuthService (≥80% coverage)
- [ ] Write integration tests for auth endpoints

### Deliverables
- Running Spring Boot application
- PostgreSQL schema with Flyway migrations
- Working JWT authentication
- Docker Compose for local development
- OpenAPI documentation
- Unit and integration tests

### Dependencies
- Phase 01 (project structure)

### Acceptance Criteria
- [ ] `POST /api/v1/auth/register` creates a user and returns 201
- [ ] `POST /api/v1/auth/login` returns valid JWT and refresh token
- [ ] Protected endpoints return 401 without valid JWT
- [ ] `GET /actuator/health` returns `{"status": "UP"}`
- [ ] OpenAPI UI accessible at `/swagger-ui.html`
- [ ] All Flyway migrations apply cleanly on fresh DB
- [ ] Docker Compose stack starts with `docker compose up -d`
- [ ] Auth service unit tests ≥80% line coverage

### Testing Requirements
- JUnit 5 unit tests for all service classes
- Spring MockMvc integration tests for all auth endpoints
- Testcontainers for PostgreSQL integration tests

---

## Phase 03 — Website Development

**Branch:** `chore/phase-03-website`
**Duration:** 2–3 weeks

### Objectives
- Initialize the Next.js web application.
- Implement core UI pages (Home, Download, Convert, History).
- Implement authentication flows (login, register).
- Create reusable UI component library.
- Connect to the backend API.

### Features
- Next.js 15 App Router with TypeScript
- Tailwind CSS + shadcn/ui component library
- Home page with feature overview
- Download page with URL input and quality selection
- Convert page with file upload and format selection
- Authentication pages (login, register)
- History page (authenticated)
- Settings page (authenticated)
- Responsive design (mobile + desktop)
- Dark/light mode toggle

### Development Tasks
- [ ] Initialize Next.js project (`create-next-app`)
- [ ] Configure Tailwind CSS and shadcn/ui
- [ ] Set up TypeScript path aliases
- [ ] Configure Next.js environment variables
- [ ] Create API client (`lib/api.ts`) with Axios/Fetch
- [ ] Create authentication context and hooks
- [ ] Implement NextAuth or custom auth session management
- [ ] Create layout components (Navbar, Footer, Sidebar)
- [ ] Build Home page
- [ ] Build Download page (URL input, quality picker, progress)
- [ ] Build Convert page (file upload, format picker, progress)
- [ ] Build History page (paginated job list)
- [ ] Build Auth pages (login, register, verify-email)
- [ ] Build Settings page
- [ ] Implement WebSocket progress hook
- [ ] Add Toast notifications
- [ ] Configure ESLint + Prettier
- [ ] Write component unit tests (Jest + React Testing Library)

### Deliverables
- Fully functional web application connected to backend
- Responsive design across all pages
- Working authentication flow
- Component test suite

### Dependencies
- Phase 02 (backend API running)

### Acceptance Criteria
- [ ] All pages load without console errors
- [ ] Guest user can use download and convert pages
- [ ] Authentication flow works end-to-end
- [ ] Lighthouse Performance score ≥80
- [ ] WCAG 2.1 AA accessibility check passes
- [ ] Component tests ≥70% coverage

### Testing Requirements
- Jest + React Testing Library for component tests
- Playwright for end-to-end tests (critical flows)

---

## Phase 04 — Media Downloader Engine

**Branch:** `chore/phase-04-downloader`
**Duration:** 2–3 weeks

### Objectives
- Implement the Source Adapter architecture.
- Build at least 2 authorized source adapters.
- Implement the download job pipeline end-to-end.
- Integrate with Worker and storage.

### Features
- `SourceAdapter` interface and `AdapterRegistry`
- Minimum 2 concrete source adapters
- URL analysis endpoint (metadata extraction)
- Download job creation and queueing
- Worker: download job processing
- FFmpeg post-processing (format conversion of downloaded stream)
- Real-time progress via WebSocket/Redis Pub/Sub
- Storage upload on completion
- Signed download URL generation

### Development Tasks
- [ ] Design `SourceAdapter` interface
- [ ] Implement `AdapterRegistry` with Spring auto-registration
- [ ] Implement Adapter 1
- [ ] Implement Adapter 2
- [ ] Implement `POST /api/v1/download/analyze`
- [ ] Implement `POST /api/v1/download/start`
- [ ] Implement `DownloadService` (job creation → Redis)
- [ ] Implement Worker: download processor
- [ ] Implement FFmpeg format normalization step
- [ ] Implement progress reporting via Redis Pub/Sub
- [ ] Implement WebSocket progress push from API
- [ ] Implement signed URL generation
- [ ] Integrate StorageService (local + S3)
- [ ] Implement job cancellation
- [ ] Implement automatic retry (3 attempts)
- [ ] Write adapter unit tests
- [ ] Write integration tests for download flow

### Deliverables
- Working end-to-end download pipeline
- At least 2 authorized adapters
- Real-time progress tracking in web UI

### Dependencies
- Phase 02 (backend), Phase 03 (web UI)

### Acceptance Criteria
- [ ] User can analyze a URL and see quality options
- [ ] User can download in MP4, WEBM, or MP3 format
- [ ] Progress updates every ≤2 seconds
- [ ] Cancellation works within 5 seconds
- [ ] Downloaded file is accessible via signed URL for 1 hour
- [ ] Failed downloads are retried up to 3 times

### Testing Requirements
- Adapter unit tests with mocked HTTP responses
- Integration tests for full download flow
- End-to-end tests for download UI

---

## Phase 05 — Online Media Converter

**Branch:** `chore/phase-05-converter-online`
**Duration:** 2 weeks

### Objectives
- Implement file upload endpoint with size and type validation.
- Implement conversion job pipeline (upload → queue → worker → FFmpeg → storage → download).
- Support all defined input and output formats.
- Real-time progress tracking.

### Features
- File upload endpoint (multipart, up to 2 GB)
- Format detection (MIME type + magic bytes)
- Conversion parameter API (resolution, bitrate, FPS, preset)
- Worker: FFmpeg conversion processor
- Video → Video, Video → Audio, Audio → Audio, Image → Image conversions
- Real-time progress via `-progress pipe:1`
- Completed file download with 1-hour TTL
- File cleanup on expiry

### Development Tasks
- [ ] Implement `POST /api/v1/convert/upload` (multipart)
- [ ] Implement MIME type validation (Tika)
- [ ] Implement `POST /api/v1/convert/start`
- [ ] Implement `ConversionService`
- [ ] Build FFmpeg command builder (with all parameter options)
- [ ] Implement Worker: conversion processor
- [ ] Parse `-progress pipe:1` output for real-time progress
- [ ] Implement file cleanup scheduled task
- [ ] Implement batch conversion support
- [ ] Add conversion options validation
- [ ] Connect web UI upload/conversion flow end-to-end
- [ ] Write unit tests for FFmpeg command builder
- [ ] Write integration tests for conversion pipeline

### Deliverables
- Working online converter (all supported formats)
- Batch conversion support
- File TTL and auto-cleanup
- Full web UI integration

### Dependencies
- Phase 02 (backend), Phase 03 (web UI), Phase 04 (storage/worker infrastructure)

### Acceptance Criteria
- [ ] Video can be converted to MP4, WEBM, MKV
- [ ] Audio can be extracted from video (MP3, AAC, WAV)
- [ ] Image conversion works (JPG → PNG → WEBP → GIF)
- [ ] 2 GB file upload is handled without timeout
- [ ] Converted file is downloadable for 1 hour
- [ ] Expired files are deleted by scheduled cleanup
- [ ] Batch of 5 files can be submitted and tracked

### Testing Requirements
- Unit tests for FFmpeg command builder
- Integration tests with real FFmpeg processing (small test files)
- Load test: 4 concurrent conversions

---

## Phase 06 — Desktop Application

**Branch:** `chore/phase-06-desktop`
**Duration:** 3 weeks

### Objectives
- Scaffold the Flutter desktop application.
- Implement Clean Architecture (BLoC) project structure.
- Implement offline conversion using bundled FFmpeg.
- Implement online download/conversion (connected to backend API).
- Package and test on Windows.

### Features
- Flutter desktop app (Windows primary, macOS and Linux secondary)
- Clean Architecture with BLoC state management
- Offline conversion for video, audio, and image
- Bundled FFmpeg binary (platform-specific)
- Online download via backend API
- Job queue management UI
- System tray integration
- File picker and output directory picker
- Settings screen (API endpoint, default formats, storage location)
- Dark/light theme

### Development Tasks
- [ ] Initialize Flutter project structure
- [ ] Configure Clean Architecture layers (data, domain, presentation)
- [ ] Add dependencies: `flutter_bloc`, `dio`, `hive`, `path_provider`, `file_picker`
- [ ] Implement HTTP API client (Dio + interceptors)
- [ ] Implement local FFmpeg invocation (Dart Process API)
- [ ] Bundle FFmpeg binaries for Windows
- [ ] Implement offline conversion BLoC and UI
- [ ] Implement online download BLoC and UI
- [ ] Implement job queue screen
- [ ] Implement progress UI (animated progress bars)
- [ ] Implement system tray
- [ ] Implement settings screen
- [ ] Configure Windows desktop packaging
- [ ] Write widget tests for core screens
- [ ] Manual testing on Windows 10 and 11

### Deliverables
- Functional Flutter desktop app (Windows)
- Offline conversion working without internet
- Online download working with backend API
- Widget test suite

### Dependencies
- Phase 02 (backend API), Phase 04 (download), Phase 05 (online converter)

### Acceptance Criteria
- [ ] App installs and launches on Windows 10/11
- [ ] Offline video conversion completes without internet
- [ ] Bundled FFmpeg is invoked correctly
- [ ] Online download connects to backend API
- [ ] Progress updates are smooth (≥10 FPS)
- [ ] No crashes on normal usage flows

### Testing Requirements
- Widget tests for all primary screens
- Manual integration testing on target Windows versions

---

## Phase 07 — Mobile Application

**Branch:** `chore/phase-07-mobile`
**Duration:** 3 weeks

### Objectives
- Adapt Flutter codebase for Android and iOS.
- Implement mobile-specific features (share intent, gallery save).
- Implement background processing.
- Configure platform permissions.
- Test on Android and iOS devices.

### Features
- Flutter mobile app (Android primary, iOS secondary)
- Share intent handler (share URL from browser → MediaForge)
- Save downloaded media to device gallery
- Background download/conversion (WorkManager/Background Isolates)
- Mobile-optimized UI (bottom navigation, responsive layout)
- Push notifications (FCM for Android, APNs for iOS)
- Platform permissions (storage, notifications)
- Android APK/AAB build

### Development Tasks
- [ ] Configure Android build (Gradle, permissions, icons)
- [ ] Configure iOS build (Xcode, permissions, Info.plist)
- [ ] Implement Share intent handler (Android: `intent_filter`, iOS: Share Extension)
- [ ] Implement gallery save (Android: `MediaStore`, iOS: `Photos.framework`)
- [ ] Implement background processing with WorkManager
- [ ] Add push notification support (Firebase)
- [ ] Adapt UI for mobile (responsive, touch-friendly)
- [ ] Configure platform permissions flow (runtime permission requests)
- [ ] Build and sign Android APK
- [ ] Manual testing on Android 10+ and iOS 15+ devices

### Deliverables
- Functional Flutter mobile app (Android APK)
- Share intent and gallery integration
- Background processing

### Dependencies
- Phase 06 (Flutter codebase foundation)

### Acceptance Criteria
- [ ] App installs on Android 10+
- [ ] User can share a URL from browser to MediaForge and download
- [ ] Downloaded video saves to gallery
- [ ] Conversion continues in background
- [ ] Push notification appears on job completion

### Testing Requirements
- Widget tests adapted for mobile viewports
- Manual testing on physical device (Android)

---

## Phase 08 — Advanced Features & Integration

**Branch:** `chore/phase-08-advanced`
**Duration:** 2–3 weeks

### Objectives
- Add OAuth social login.
- Implement subtitle extraction and embedding.
- Add video trimming (start/end time selection).
- Implement scheduled/queued downloads.
- Add more source adapters.
- Implement in-app update mechanism for desktop.

### Features
- OAuth login (Google)
- Subtitle extraction (SRT/VTT from video)
- Subtitle embedding into output video
- Video trimming (time range selection)
- Scheduled download (download at a specific time)
- Additional source adapters (3rd and 4th platforms)
- In-app update check for desktop
- Advanced batch processing (zip download of batch results)

### Development Tasks
- [ ] Implement Google OAuth (Spring Security OAuth2)
- [ ] Add OAuth login button to web and Flutter
- [ ] Implement subtitle extraction via FFmpeg `-vf subtitles`
- [ ] Implement subtitle embedding option in conversion job
- [ ] Implement video trimming parameters (`-ss -to` in FFmpeg)
- [ ] Add trim UI controls (web and Flutter)
- [ ] Implement scheduled job support (delayed queue in Redis)
- [ ] Build Adapter 3 and Adapter 4
- [ ] Implement in-app update checker (GitHub Releases API)
- [ ] Implement batch result ZIP download

### Deliverables
- Google OAuth login
- Subtitle and trimming features
- Scheduled downloads
- Additional source adapters

### Dependencies
- Phase 05 (online converter), Phase 06 (desktop), Phase 07 (mobile)

### Acceptance Criteria
- [ ] Google OAuth login works on web
- [ ] Subtitle extraction works for supported video formats
- [ ] Video trimming produces correct output duration
- [ ] Scheduled download triggers at the specified time
- [ ] At least 4 total source adapters functional

### Testing Requirements
- Integration tests for new adapter types
- End-to-end tests for OAuth flow
- Unit tests for trim and subtitle command generation

---

## Phase 09 — Security, Testing & CI/CD

**Branch:** `chore/phase-09-security-testing`
**Duration:** 2 weeks

### Objectives
- Conduct a full security review and remediate findings.
- Achieve target test coverage across all components.
- Implement full CI/CD pipelines for all components.
- Set up automated dependency vulnerability scanning.
- Enable 2FA for admin accounts.

### Features
- Security audit and pen testing (OWASP Top 10 review)
- ClamAV file scanning integration
- 2FA (TOTP) for admin accounts
- Complete GitHub Actions CI pipeline (backend, web, flutter)
- Dependency vulnerability scanning (Dependabot, OWASP Dependency Check)
- Performance load testing (Gatling or k6)
- Automated Lighthouse CI
- E2E test suite (Playwright)

### Development Tasks
- [ ] Run OWASP dependency check on all components
- [ ] Conduct security review (input validation, auth, file handling)
- [ ] Integrate ClamAV for file upload scanning
- [ ] Implement TOTP 2FA for admin users
- [ ] Write GitHub Actions: backend CI (build, test, lint, Docker)
- [ ] Write GitHub Actions: web CI (build, test, lint)
- [ ] Write GitHub Actions: flutter CI (build, test, lint)
- [ ] Enable Dependabot for all dependency types
- [ ] Achieve ≥80% backend test coverage
- [ ] Achieve ≥70% web test coverage
- [ ] Write Playwright E2E test suite (top 10 user flows)
- [ ] Run k6 load test (100 concurrent users)
- [ ] Configure Lighthouse CI in GitHub Actions
- [ ] Review and update all API security headers

### Deliverables
- Secure, well-tested application
- Full CI/CD pipelines
- Load test report
- Security audit report

### Dependencies
- All previous phases complete

### Acceptance Criteria
- [ ] OWASP Top 10 issues resolved
- [ ] Backend test coverage ≥80%
- [ ] Web test coverage ≥70%
- [ ] All CI pipelines pass on `develop`
- [ ] Dependabot PRs are configured
- [ ] Load test: 100 concurrent users, API p95 ≤500ms
- [ ] Lighthouse CI score ≥80 on web pages

### Testing Requirements
- Full unit, integration, and E2E test suites
- Security vulnerability scan
- Performance load test

---

## Phase 10 — Deployment & Release

**Branch:** `chore/phase-10-deployment`
**Duration:** 1–2 weeks

### Objectives
- Deploy backend and workers to production infrastructure.
- Deploy web application to production.
- Configure monitoring, alerting, and log aggregation.
- Create production Docker images.
- Write operational runbook.
- Perform final QA on production environment.
- Create GitHub Release v1.0.0.

### Features
- Production Docker images (multi-stage builds)
- Kubernetes manifests or Docker Compose prod configuration
- Managed PostgreSQL and Redis (cloud)
- S3-compatible storage (production bucket)
- Nginx reverse proxy with TLS
- Application monitoring (Prometheus + Grafana or cloud-native)
- Log aggregation (Loki or cloud logging)
- Alerting (PagerDuty or email alerts)
- Flutter desktop installers (Windows .exe / .msi)
- Android APK / AAB production build
- GitHub Release with changelog

### Development Tasks
- [ ] Write production `Dockerfile` for backend (multi-stage)
- [ ] Write production `Dockerfile` for worker
- [ ] Write production `Dockerfile` for web
- [ ] Configure production `docker-compose.prod.yml`
- [ ] Set up managed PostgreSQL (or self-hosted with backups)
- [ ] Set up managed Redis (or self-hosted with AOF persistence)
- [ ] Configure S3 production bucket with lifecycle policies
- [ ] Configure Nginx with TLS (Let's Encrypt)
- [ ] Set up Prometheus + Grafana dashboards
- [ ] Configure log aggregation
- [ ] Set up automated DB backups
- [ ] Configure Dependabot security alerts
- [ ] Run final QA on production environment
- [ ] Build Flutter Windows installer
- [ ] Build Android production APK/AAB
- [ ] Write operational runbook
- [ ] Create GitHub Release v1.0.0 with changelog

### Deliverables
- Production deployment of all components
- Monitoring and alerting in place
- Desktop and mobile release builds
- GitHub Release v1.0.0
- Operational runbook

### Dependencies
- Phase 09 (security and testing complete)

### Acceptance Criteria
- [ ] All components deployed and accessible in production
- [ ] HTTPS enforced with valid TLS certificate
- [ ] Monitoring dashboard shows all key metrics
- [ ] Automated DB backup runs daily
- [ ] GitHub Release v1.0.0 published with changelog
- [ ] Desktop installer tested on Windows 10/11
- [ ] Android APK tested on Android 10+
- [ ] Zero P0/P1 issues outstanding

### Testing Requirements
- Production smoke tests (critical flows)
- TLS/security headers verification (securityheaders.com)
- Final Lighthouse audit

