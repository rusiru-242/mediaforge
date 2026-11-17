# Production audit — 2026-11-17 (before changes)

Inspected backend sources/config/tests, root Compose/env examples, web API client,
Flutter mobile configuration and desktop LocalMediaApi. No deployments performed.

* Maven JAR, Java target 21, Spring Boot 3.4.3, Springdoc 2.8.5;
  entry point `com.mediaforge.backend.MediaForgeApplication`. Local JVM is 22.0.2.
* `/api/v1`: health, formats, file upload/metadata/download, downloads
  validate/metadata/formats/creation, conversions/estimate/batch/ZIP, jobs/status/
  progress/SSE/cancel. Actuator is already installed. No database or accounts.
* In-memory repositories and local ephemeral storage: restart loses job/file
  identities even if a volume preserves bytes. Multiple replicas cannot share jobs.
* FFmpeg/FFprobe use configured executable paths and process argument lists.
  yt-dlp uses a validating, DNS-pinning loopback proxy; private targets are rejected.
  Existing adapters include legacy sources outside the three current UI platforms.
* Existing download workers have a bounded queue; conversion concurrency ignores
  small configured values (minimum four maximum workers), queue fixed at 200.
  Metadata inspection has no global concurrency limit. FFmpeg/extractor timeouts,
  per-file limits, cancellation, FFprobe verification and scheduled retention exist.
* Docker build invokes a wrapper it never copies, falls back to installing Maven;
  no yt-dlp or JavaScript runtime; fixed 8080 health URL; no backend .dockerignore.
* Prod profile only changes forwarding, errors and logging. It inherits localhost
  CORS defaults, credentialed CORS and exposed info/docs. Rate limiting trusts a
  caller-supplied multi-value X-Forwarded-For and retains counters indefinitely.
* Root 500 cause was an overly broad exception handler capturing MVC missing routes.
  Current source already extends ResponseEntityExceptionHandler and preserves 404;
  regressions exist in HttpErrorHandlingIntegrationTest. No root mapping is defined.
* `.env.example` contains unused secret/S3/limit names. Compose sets unused storage
  properties and gives browsers a Docker-only `backend` hostname. Public Next.js
  variables must be supplied at build time, not just container runtime.
* Website: NEXT_PUBLIC_API_BASE_URL. Android: MEDIAFORGE_ONLINE_API_BASE
  compile-time HTTPS value; debug emulator fallback 10.0.2.2:8081. Desktop currently
  runs bundled tools locally, not this HTTP API. No client rebuild is required here.
* Docker CLI was not found on PATH. No existing service will be stopped for tests.
  User changes/deleted release binaries are outside this task and are preserved.

Planned changes: fail-closed production config, reproducible Docker build with
media tools, restricted actuator, bounded resource admission/metadata processing,
rate limiter repair, correct worker limits, production API platform policy, safe
errors, regressions, startup/API checks and deployment/runbook documentation.
