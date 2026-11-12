# MediaForge Comprehensive Test Plan

**Phase:** Phase 09 — Security Hardening, Testing & CI/CD  
**Scope:** Backend (Java/Spring Boot), Web (Next.js/TypeScript), Desktop & Mobile (Flutter/Dart)  
**Target Release:** Release Candidate 1.0.0

---

## 1. Objectives

1. Verify functional correctness of media downloading, offline and online format conversion, and batch processing across all target platforms.
2. Validate strict compliance with the **zero-database architectural invariant** (no PostgreSQL, SQLite, Neon, or Redis).
3. Validate security boundaries, preventing SSRF, command injection, path traversal, and resource exhaustion.
4. Ensure cross-platform UI responsiveness, accessibility, and offline capability on Windows, macOS, Linux, Android, and iOS.

---

## 2. Test Strategy

```
               +----------------------------------+
               |        Manual Smoke & E2E        |
               +----------------------------------+
             /                                      \
    +--------------------------------+      +--------------------------------+
    |    Integration & API Tests     |      |   Widget & Adaptive UI Tests   |
    | (Spring MockMvc, FFmpeg Mocks) |      |   (Flutter Shell, Breakpoints) |
    +--------------------------------+      +--------------------------------+
            /                                        \
+--------------------------------------------------------------------------------+
|                          Unit Tests & Domain Logic                             |
|     - Backend: 81 Tests (Validators, Codecs, Streamers, Storage)               |
|     - Web: 47 Tests (Format Detection, UI Components, State Hooks)             |
|     - Flutter: 24 Tests (Models, FfmpegService, Paths, Presets)                |
+--------------------------------------------------------------------------------+
```

### 2.1 Backend Testing (Spring Boot / JUnit 5 / Mockito)
- **Controller Layer:** Tests REST contracts, HTTP status codes, validation annotations, and JSON responses using `MockMvc`.
- **Service Layer:** Tests job state machines, timeout handling, file cleanup schedules, and FFmpeg command generation using Mockito.
- **Security Validation:** Tests `UrlSecurityValidator` against private IPv4/IPv6 addresses, cloud metadata endpoints, malformed schemes, and redirect loops.
- **Conversion Limits:** Tests dimension caps and byte boundaries against oversized payloads.

### 2.2 Web Testing (Vitest / React Testing Library)
- **Component Tests:** Tests rendering, accessibility labels, error alerts, and interactive states for download, converter, batch, and preview components.
- **Hook & Utility Tests:** Tests client-side format filtering, duration formatting, file size calculations, and URL validation.
- **Layout & Responsiveness:** Tests responsive navigation bars, mobile drawer toggles, and theme persistence.

### 2.3 Flutter App Testing (Flutter Test / WidgetTester)
- **Unit & Logic:** Tests `MediaJob` lifecycle, `AppConfig` presets, unique file path generation, and `PlatformService` detection.
- **UI & Widget:** Tests `MobileAppShell` on compact screens (<600dp), bottom `NavigationBar`, desktop sidebar navigation, and job status chips.
- **Offline Integrity:** Validates that conversion services operate locally without calling remote backend endpoints.

---

## 3. Test Matrix

| Component | Test Suite | Framework | Target Executables |
| :--- | :--- | :--- | :--- |
| **Backend** | Unit & Controller Tests | JUnit 5 + Mockito + AssertJ | `mvn test` |
| **Web** | Component & Unit Tests | Vitest + React Testing Library | `npm run test` |
| **Web** | Production Build Verification | Next.js Bundler | `npm run build` |
| **Flutter** | Static Code Analysis | Dart Analyzer | `flutter analyze` |
| **Flutter** | Widget & Unit Tests | `flutter_test` | `flutter test` |

---

## 4. Entry and Exit Criteria

### 4.1 Entry Criteria
- Source code formatted according to repository conventions.
- Zero database drivers or persistence dependencies in `pom.xml`, `package.json`, or `pubspec.yaml`.
- Clean build without compilation warnings or errors.

### 4.2 Exit Criteria
- 100% of unit and integration tests passing.
- 0 critical or high severity security vulnerabilities.
- Production build artifacts generated successfully across all targets.
- All temporary files verified to purge within configured retention windows.

