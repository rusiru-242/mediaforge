# MediaForge Troubleshooting & Operations Guide

**Version:** 1.0.0  
**Phase:** Phase 10 — Production Deployment & Release

---

## 1. Common Issues & Solutions

### 1.1 "FFmpeg not found" or "Cannot run program ffmpeg"
- **Symptom:** Conversion job immediately fails with an error stating the FFmpeg binary is missing.
- **Cause:** FFmpeg is not installed or not present on the system `PATH`.
- **Remediation:**
  - **Linux / Docker:** Run `sudo apt-get install -y ffmpeg` or verify `apk add --no-cache ffmpeg` in the container.
  - **macOS:** Run `brew install ffmpeg`.
  - **Windows Desktop:** Install via `winget install Gyan.FFmpeg` or manually download binaries from `gyan.dev` and add the `bin/` directory to Windows User/System Environment Variables.
  - **Custom Path:** Configure `FFMPEG_PATH=/custom/path/ffmpeg` in `.env` or application settings.

---

### 1.2 HTTP 413: Payload Too Large
- **Symptom:** File uploads fail immediately with HTTP 413 status code.
- **Cause:** File exceeds the 500 MB upload limit or reverse proxy request buffer limit.
- **Remediation:**
  - In Nginx configuration, verify `client_max_body_size 520M;` is present in the `server` block.
  - In `application.yml`, verify `spring.servlet.multipart.max-file-size=500MB` and `max-request-size=510MB`.

---

### 1.3 "URL is not permitted" or "Blocked destination IP"
- **Symptom:** Media downloader rejects the user-supplied URL with `ValidationException: Destination host is not permitted`.
- **Cause:** `UrlSecurityValidator` identified the domain as resolving to a private RFC 1918 range (`10.0.0.0/8`, `192.168.0.0/16`), link-local address (`169.254.0.0/16`), or loopback (`127.0.0.1`).
- **Remediation:**
  - This is expected security behavior protecting against Server-Side Request Forgery (SSRF). Ensure the target URL is publicly routable on the open Internet.

---

### 1.4 CORS Errors on Web Portal
- **Symptom:** Browser console logs `Access-Control-Allow-Origin header is missing or mismatch`.
- **Cause:** Web portal is hosted on a domain not listed in `CORS_ALLOWED_ORIGINS`.
- **Remediation:**
  - Update `CORS_ALLOWED_ORIGINS` in backend environment:
    ```bash
    CORS_ALLOWED_ORIGINS=https://mediaforge.example.com,http://localhost:3000
    ```
  - Restart the backend service.

---

### 1.5 Ephemeral Disk Full Errors
- **Symptom:** System logs indicate `No space left on device` during large conversion jobs.
- **Cause:** High conversion concurrency or long retention periods filled the temporary storage directory.
- **Remediation:**
  - Reduce `STORAGE_RETENTION_HOURS` from `24` to `6` or `12`.
  - Manually purge orphaned temporary files:
    ```bash
    find /app/uploads -type f -mmin +360 -delete
    ```
  - Mount a dedicated high-capacity volume or tmpfs partition to `/app/uploads`.

---

### 1.6 Mobile Conversion Halts When Screen Locked
- **Symptom:** On Android/iOS, long conversions pause or abort when the phone enters sleep mode.
- **Cause:** Operating system battery optimization suspends background thread execution.
- **Remediation:**
  - Keep the application active on-screen during long transcode tasks.
  - Disable aggressive battery optimization for MediaForge in Android App Info > Battery.

---

## 2. Operational Health Checks & Diagnostics

| Diagnostic Endpoint | Purpose | Normal Response |
| :--- | :--- | :--- |
| `GET /api/v1/health` | Service and version health | `{"status":"UP","service":"mediaforge-backend","version":"1.0.0"}` |
| `GET /actuator/health` | Spring Boot Actuator probe | `{"status":"UP"}` |
| `GET /v3/api-docs` | OpenAPI specification schema | Full JSON OpenAPI 3.0 schema |

