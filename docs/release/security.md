# MediaForge Production Security Policy & Architecture

**Version:** 1.0.0  
**Phase:** Phase 10 — Production Deployment & Release

---

## 1. Zero-Database Security Model

MediaForge was specifically designed to eliminate data breach vectors by eliminating persistence:

- **Zero User Credential Storage:** No usernames, passwords, hashes, session tokens, or OAuth tokens are ever stored.
- **Zero Query Injection Surface:** With no SQL (PostgreSQL, SQLite, MySQL) and no NoSQL (MongoDB, Redis), SQL injection and database credential leaks are architecturally impossible.
- **Zero Activity History:** No permanent log of downloaded URLs, uploaded files, IP addresses, or conversion histories is written to disk.
- **24-Hour Ephemeral Retention:** Files stored on the backend temporary storage are scrubbed automatically within 24 hours of creation.

---

## 2. Hardened Attack Surface Mitigations

### 2.1 SSRF & DNS Rebinding Defenses (`UrlSecurityValidator.java`)
- Rejects non-HTTP schemes (`file://`, `ftp://`, `gopher://`, `javascript:`).
- Performs explicit DNS lookup across all resolved addresses before connecting.
- Rejects all loopback addresses (`127.0.0.1/8`, `::1`).
- Rejects private IP address space (`10.0.0.0/8`, `172.16.0.0/12`, `192.168.0.0/16`).
- Rejects link-local and cloud metadata addresses (`169.254.0.0/16`, `metadata.google.internal`).
- Enforces strict manual redirect traversal with URI re-validation at each hop.

### 2.2 Subprocess Command Injection Defense
- OS shell execution (`/bin/sh`, `cmd.exe`) is strictly prohibited.
- `FFmpegProcessExecutor` in Java and `FfmpegService` in Dart execute child processes using direct argument string arrays via OS system calls (`execve` / `CreateProcess`).
- Codec strings submitted by API consumers are strictly whitelisted via regex:
  ```regex
  ^[a-zA-Z0-9_-]{1,32}$
  ```
  Any parameter containing whitespace, flags (`-`), quotes, or shell operators is rejected with `ValidationException`.

### 2.3 Decompression Bomb & Resource Exhaustion Defense
- Uploaded media stream processing caps downloads at 500 MB per file.
- Image conversion verifies canvas dimensions prior to rasterization:
  - `MAX_DIMENSION = 16,384` pixels
  - `MAX_PIXELS = 100,000,000` pixels
- In-memory conversion queues bound active FFmpeg workers to CPU availability, preventing denial of service through process starvation.

### 2.4 Privacy by Default (Metadata Stripping)
- Conversions automatically pass `-map_metadata -1` to FFmpeg, eradicating GPS coordinates, device serial numbers, author tags, and camera metadata from output media.

---

## 3. Vulnerability Disclosure Policy

Security issues and vulnerability reports should be responsibly disclosed by submitting a private security advisory through the [MediaForge GitHub Repository Security Tab](https://github.com/rusiru-242/mediaforge/security/advisories) or emailing the core maintainers.

