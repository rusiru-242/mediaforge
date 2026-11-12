# MediaForge Release Checklist

**Target Release:** v1.0.0 (Production Release Candidate)  
**Phase:** Phase 09 — Security Hardening, Testing & CI/CD

---

## 1. Pre-Release Verification Gates

- [x] **Zero-Database Compliance:**
  - Verify `backend/pom.xml` contains zero PostgreSQL, JPA, Hibernate, Flyway, or Redis dependencies.
  - Verify `web/package.json` contains no database ORMs (Prisma, TypeORM, Drizzle).
  - Verify `apps/flutter_app/pubspec.yaml` contains no SQLite, Drift, or Hive database dependencies.
- [x] **Security Hardening:**
  - `UrlSecurityValidator` blocks loopback, private RFC 1918, link-local, and cloud metadata addresses.
  - FFmpeg invocation uses array-based process parameters; zero shell execution.
  - Custom codec parameters validated against strict regex whitelist (`^[a-zA-Z0-9_-]{1,32}$`).
  - HTTP `Content-Disposition` header filename sanitized against CRLF injection and quotes.
  - Next.js production security headers configured (`CSP`, `X-Frame-Options: DENY`, `nosniff`).
- [x] **Automated Test Coverage:**
  - Backend: 81/81 tests passing (`mvn test`).
  - Web: 47/47 tests passing (`npm test`).
  - Flutter: 24/24 tests passing (`flutter test`).
  - Flutter code analysis: 0 issues (`flutter analyze`).
- [x] **Documentation & Diagrams:**
  - System architecture and integration documentation updated in `docs/`.
  - STRIDE threat model and security audit documents in `docs/security/`.
  - Release notes, checklist, and known limitations in `docs/release/`.

---

## 2. Platform Build Verification

- [x] **Backend:**
  - Command: `mvn clean package -DskipTests`
  - Output artifact: `backend/target/backend-0.0.1-SNAPSHOT.jar`
- [x] **Web Portal:**
  - Command: `npm run build`
  - Output: Production Next.js build output in `web/.next/`
- [x] **Flutter Desktop (Windows):**
  - Command: `flutter build windows --release`
  - Output: `apps/flutter_app/build/windows/x64/runner/Release/`
- [x] **Flutter Mobile (Android):**
  - Command: `flutter build apk --release` (or `--debug` in development)
  - Output: `apps/flutter_app/build/app/outputs/flutter-apk/app-debug.apk`

---

## 3. Deployment & Environment Readiness

- [ ] **Docker Containers:**
  - Verify `docker-compose.yml` launches both `backend` and `web` cleanly without persistent database volumes.
  - Ensure FFmpeg is installed and accessible inside the backend container image.
- [ ] **Environment Variables:**
  - Verify `.env.example` contains only necessary configuration:
    - `PORT=8080`
    - `MEDIA_TEMP_DIR=/tmp/mediaforge`
    - `NEXT_PUBLIC_API_BASE_URL=http://localhost:8080/api/v1`
    - `ALLOWED_ORIGINS=http://localhost:3000`

---

## 4. Tagging & Publishing

- [ ] Ensure `develop` branch is merged into `main` after PR approval.
- [ ] Tag the release: `git tag -a v1.0.0 -m "Release v1.0.0: Privacy-first Media Downloader & Converter"`
- [ ] Push tag: `git push origin v1.0.0`
- [ ] Verify GitHub Actions release workflow compiles and attaches binary artifacts to GitHub Releases.

