# MediaForge — Security Requirements

**Document Version:** 1.0.0
**Phase:** 01 — Foundation & Architecture
**Last Updated:** 2026-11-09
**Status:** Draft

---

## 1. Authentication & Session Security

| Requirement | Standard | Implementation |
|------------|---------|----------------|
| Password hashing | BCrypt, min cost factor 12 | Spring Security `BCryptPasswordEncoder` |
| JWT signing algorithm | HS256 / RS256 (minimum 256-bit secret) | JJWT library |
| Access token TTL | 24 hours | Configurable via `JWT_EXPIRY_SECONDS` |
| Refresh token TTL | 7 days | Single-use with rotation |
| Refresh token storage | Hashed in DB, not plaintext | SHA-256 hash stored |
| Session invalidation | Refresh token revocation on logout | `revoked=true` in DB |
| Account lockout | 5 failed attempts → 15-minute lockout | Bucket4j counter |

## 2. API Security Headers

All API responses shall include:

```
Strict-Transport-Security: max-age=31536000; includeSubDomains
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
X-XSS-Protection: 1; mode=block
Content-Security-Policy: default-src 'self'
Referrer-Policy: strict-origin-when-cross-origin
Permissions-Policy: camera=(), microphone=(), geolocation=()
```

## 3. Input Validation

| Input Type | Validation Method |
|-----------|-----------------|
| File upload | MIME type (Apache Tika magic bytes) + extension allowlist |
| URL input | Regex + domain allowlist against `SourceAdapter.supports()` |
| Email | RFC 5322 validation via Bean Validation |
| Password | Minimum 8 chars, 1 uppercase, 1 number, 1 special char |
| File size | Reject above configured `MAX_FILE_SIZE_MB` |
| All DTOs | Bean Validation (`@Valid`) + custom validators |

## 4. File Security

- Uploaded files are stored with UUID-based keys (not original filenames on disk).
- Download links are time-limited signed URLs (S3 pre-signed or HMAC-signed local).
- Temporary files are auto-deleted after TTL (default: 1 hour).
- No path traversal is possible — storage keys are UUID-based, never user-provided strings.
- File content type is verified by magic bytes, not file extension.

## 5. Rate Limiting

| Endpoint Category | Limit |
|------------------|-------|
| Auth (login/register) | 10 requests/minute per IP |
| URL analysis | 30 requests/minute per IP |
| Download start | 10 requests/hour per IP (guest) / 20 per hour (authenticated) |
| Conversion upload | 10 uploads/hour per IP |
| General API | 60 requests/minute per IP |

## 6. Transport Security

- TLS 1.2 minimum, TLS 1.3 preferred
- HTTP redirects to HTTPS (301 permanent)
- HSTS with `max-age=31536000`
- Certificate pinning in Flutter apps (Phase 09)

## 7. Dependency Security

- Dependabot enabled for all dependency manifests (`pom.xml`, `package.json`, `pubspec.yaml`)
- OWASP Dependency Check runs in CI
- Zero high-severity CVEs allowed before merge to `main`

## 8. Secrets Management

- Never commit `.env` files or hardcoded credentials
- All secrets via environment variables
- In production: use cloud secrets manager (AWS Secrets Manager / GCP Secret Manager)
- Rotate secrets on any suspected compromise

## 9. OWASP Top 10 Mitigations

| OWASP Risk | Mitigation |
|-----------|-----------|
| A01 Broken Access Control | RBAC, ownership checks on all job/file endpoints |
| A02 Cryptographic Failures | BCrypt passwords, JWT HS256, HTTPS everywhere |
| A03 Injection | JPA parameterized queries, Bean Validation, URL allowlist |
| A04 Insecure Design | Security requirements defined in Phase 01, threat modeling |
| A05 Security Misconfiguration | Security headers, least-privilege Docker containers |
| A06 Vulnerable Components | Dependabot + OWASP Dependency Check in CI |
| A07 Auth Failures | Account lockout, JWT rotation, secure password policy |
| A08 Software Integrity | Signed Docker images (Phase 09), dependency verification |
| A09 Logging Failures | Structured JSON logs, no PII in logs, audit log for admin actions |
| A10 Server-Side Request Forgery | URL allowlist validation before any outbound HTTP |

