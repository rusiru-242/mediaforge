# MediaForge — Non-Functional Requirements

**Document Version:** 1.0.0
**Phase:** 01 — Foundation & Architecture
**Last Updated:** 2026-11-09
**Status:** Draft

---

## Table of Contents

1. [Performance Requirements](#1-performance-requirements)
2. [Scalability Requirements](#2-scalability-requirements)
3. [Reliability & Availability](#3-reliability--availability)
4. [Security Requirements](#4-security-requirements)
5. [Usability Requirements](#5-usability-requirements)
6. [Maintainability Requirements](#6-maintainability-requirements)
7. [Compatibility Requirements](#7-compatibility-requirements)
8. [Data Requirements](#8-data-requirements)
9. [Legal & Compliance Requirements](#9-legal--compliance-requirements)

---

## 1. Performance Requirements

### NFR-PERF-001 — API Response Time
- REST API endpoints (non-media) **shall** respond within **500ms** for the 95th percentile under normal load.
- Media information extraction (URL metadata) **shall** complete within **10 seconds**.
- File download initiation **shall** begin within **3 seconds** of user request.

### NFR-PERF-002 — Conversion Throughput
- The system **shall** support at least **4 concurrent conversion jobs** per server instance.
- Video conversion speed **shall** be at minimum **1× real-time** (60-second video converts in ≤60 seconds) for standard presets.
- Image conversion **shall** complete within **5 seconds** for files up to 50 MB.
- Audio conversion **shall** complete within **30 seconds** for files up to 100 MB.

### NFR-PERF-003 — File Upload/Download Performance
- File upload throughput **shall** sustain at least **100 Mbps** per connection.
- File download throughput **shall** support resumable downloads and streaming delivery.

### NFR-PERF-004 — Frontend Performance
- Web application **shall** achieve a Lighthouse Performance score of ≥80.
- Initial page load (LCP) **shall** be under **2.5 seconds** on a standard broadband connection.
- Flutter application startup time **shall** be under **3 seconds** on target devices.

---

## 2. Scalability Requirements

### NFR-SCAL-001 — Horizontal Scaling
- The backend API **shall** be stateless and capable of horizontal scaling behind a load balancer.
- Worker processes **shall** be independently scalable.
- The database connection pool **shall** be configurable for varying load levels.

### NFR-SCAL-002 — Concurrent Users
- The system **shall** support at least **100 concurrent users** in the initial MVP deployment.
- The architecture **shall** be capable of scaling to **10,000 concurrent users** with infrastructure expansion.

### NFR-SCAL-003 — Queue Depth
- The job queue **shall** support at least **10,000 pending jobs** without performance degradation.
- Job workers **shall** scale based on queue depth (configurable auto-scaling).

---

## 3. Reliability & Availability

### NFR-REL-001 — System Availability
- The backend API **shall** maintain **99.5% uptime** in production (excluding scheduled maintenance).
- Planned maintenance windows **shall** be communicated at least 24 hours in advance.

### NFR-REL-002 — Data Durability
- Conversion job metadata **shall** be persisted in the database with ACID guarantees.
- The database **shall** have automated daily backups retained for at least 7 days.
- In-progress job state **shall** survive backend restarts via Redis persistence.

### NFR-REL-003 — Failure Recovery
- Failed conversion jobs **shall** be automatically retried up to 3 times with exponential back-off.
- If the backend becomes unavailable, the web and mobile applications **shall** display a clear maintenance message.
- Worker crashes **shall** not result in stuck jobs — a watchdog mechanism **shall** detect and recover stalled jobs.

### NFR-REL-004 — Graceful Degradation
- If the job queue (Redis) is unavailable, the API **shall** return a 503 response rather than crash.
- If the storage backend is unavailable, file operations **shall** fail fast with a clear error.

---

## 4. Security Requirements

### NFR-SEC-001 — Authentication
- All authenticated endpoints **shall** require a valid JWT Bearer token.
- JWT tokens **shall** expire within 24 hours.
- Refresh tokens **shall** be used to obtain new access tokens without re-authentication.
- Refresh tokens **shall** expire within 7 days and be single-use (rotation).

### NFR-SEC-002 — Authorization
- The system **shall** implement role-based access control (RBAC) with at minimum: `GUEST`, `USER`, `ADMIN` roles.
- Users **shall** only be able to access their own conversion history and files.
- Admin endpoints **shall** be restricted to users with the `ADMIN` role.

### NFR-SEC-003 — Input Validation
- All API inputs **shall** be validated and sanitized before processing.
- File uploads **shall** be validated for MIME type and magic bytes (not just file extension).
- URL inputs **shall** be validated against an allowlist of supported domains.
- SQL injection **shall** be prevented via parameterized queries / ORM.
- XSS **shall** be prevented via output encoding and Content Security Policy headers.

### NFR-SEC-004 — Transport Security
- All communication **shall** use HTTPS/TLS 1.2 or higher in production.
- HTTP Strict Transport Security (HSTS) **shall** be enforced.
- API responses **shall** include appropriate security headers (CSP, X-Frame-Options, X-Content-Type-Options).

### NFR-SEC-005 — Rate Limiting
- API endpoints **shall** enforce rate limiting per IP address.
- Download endpoints **shall** enforce rate limiting per user (authenticated) or IP (guest).
- Conversion job submission **shall** be rate limited to prevent abuse.

### NFR-SEC-006 — File Security
- Uploaded files **shall** be scanned for known malware signatures (Phase 09+).
- Processed files **shall** be stored with non-guessable identifiers (UUID-based paths).
- Direct file system path traversal **shall** be prevented in all file operations.
- Temporary files **shall** be automatically purged after their TTL.

### NFR-SEC-007 — Credential Management
- No credentials, secrets, or API keys **shall** ever be committed to the repository.
- All secrets **shall** be managed via environment variables or a secrets manager.
- Database passwords **shall** meet a minimum entropy requirement (16+ random characters).

---

## 5. Usability Requirements

### NFR-UX-001 — Accessibility
- The web application **shall** conform to WCAG 2.1 Level AA accessibility guidelines.
- Color contrast ratios **shall** meet WCAG 2.1 minimum standards.
- All interactive elements **shall** be keyboard navigable.
- Screen reader compatibility **shall** be maintained via semantic HTML and ARIA labels.

### NFR-UX-002 — Learnability
- A first-time user **shall** be able to complete a conversion task without reading any documentation.
- The user interface **shall** provide contextual help tooltips for non-obvious controls.
- Error messages **shall** be written in plain language and suggest corrective actions.

### NFR-UX-003 — Internationalization
- The application architecture **shall** support internationalization (i18n).
- English **shall** be the default and primary language.
- Additional languages may be added in future phases.

---

## 6. Maintainability Requirements

### NFR-MAIN-001 — Code Quality
- Backend test coverage **shall** be maintained at ≥80% line coverage.
- Frontend test coverage **shall** be maintained at ≥70% line coverage.
- Static code analysis **shall** be enforced in CI pipelines (zero high-severity issues).

### NFR-MAIN-002 — Documentation
- All public API endpoints **shall** be documented via OpenAPI 3.0 specification.
- All database schema changes **shall** be managed via versioned migrations (Flyway/Liquibase).
- Architecture decision records (ADRs) **shall** be maintained for significant design decisions.

### NFR-MAIN-003 — Observability
- The backend **shall** emit structured JSON logs.
- The backend **shall** expose health check and readiness endpoints (`/actuator/health`).
- Metrics **shall** be exposed in a format compatible with Prometheus (Phase 09+).

---

## 7. Compatibility Requirements

### NFR-COMPAT-001 — Browser Compatibility
- Web application **shall** be fully functional on:
  - Google Chrome 120+
  - Mozilla Firefox 120+
  - Apple Safari 17+
  - Microsoft Edge 120+

### NFR-COMPAT-002 — Operating System Compatibility
- Desktop application **shall** support:
  - Windows 10 (22H2) and Windows 11
  - macOS 12 (Monterey) and later
  - Ubuntu 20.04 LTS and later (x86_64)
- Mobile application **shall** support:
  - Android 8.0 (API 26) and later
  - iOS 14.0 and later

### NFR-COMPAT-003 — API Versioning
- The REST API **shall** use URL versioning (e.g., `/api/v1/`).
- Breaking changes **shall** be introduced in a new API version.
- Previous API versions **shall** be supported for a minimum of 6 months after a new version is released.

---

## 8. Data Requirements

### NFR-DATA-001 — Data Retention
- Conversion job records **shall** be retained for 90 days for authenticated users.
- Guest session conversion records **shall** be retained for 24 hours.
- Temporary media files **shall** be deleted after their TTL (default: 1 hour).
- User account data **shall** be retained until the user requests deletion.

### NFR-DATA-002 — Data Privacy
- The system **shall** collect only the minimum data necessary for operation.
- Users **shall** be able to request deletion of all their personal data (GDPR right to erasure).
- Passwords **shall** be stored as bcrypt hashes (minimum cost factor 12).
- Personally identifiable information **shall** not appear in log files.

---

## 9. Legal & Compliance Requirements

### NFR-LEGAL-001 — Copyright Compliance
- MediaForge **shall not** be used to infringe on copyright.
- The system **shall** display clear terms of service requiring users to only process content they are authorized to handle.
- Downloading of copyrighted content without authorization is explicitly prohibited.

### NFR-LEGAL-002 — Terms of Service
- Users **shall** accept the MediaForge Terms of Service before using download features.
- Terms of Service and Privacy Policy documents **shall** be maintained and kept current.

