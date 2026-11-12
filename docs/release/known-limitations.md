# MediaForge Known Limitations

**Version:** 1.0.0-RC  
**Phase:** Phase 09 — Security Hardening, Testing & CI/CD

---

## 1. Architectural Limitations

### 1.1 In-Memory Job State
- **Limitation:** All active and queued conversion and download jobs are maintained in volatile JVM / application memory.
- **Consequence:** If the backend application or client desktop application restarts while a conversion is underway, active job state is lost and the operation must be restarted by the user.
- **Design Justification:** This guarantees zero residual user records, zero tracking, and adheres strictly to the privacy-first zero-database architectural invariant.

### 1.2 Ephemeral File Storage (24-Hour Expiration)
- **Limitation:** Converted and downloaded media files stored on the server temporary storage are automatically deleted 24 hours after creation.
- **Consequence:** Download links are invalid after 24 hours. Users must save converted media directly to their local devices upon completion.

---

## 2. Platform & Media Processing Limitations

### 2.1 DRM & Protected Content Restrictions
- **Limitation:** MediaForge **does not** decrypt or download DRM-protected media streams (e.g. Widevine, FairPlay, PlayReady) or bypass paywalls, authentication walls, or encrypted stream segments.
- **Consequence:** URLs requiring authenticated accounts, session cookies, or DRM licensing keys will return an unsupported format or permission error.
- **Compliance Justification:** Respects copyright protection standards and intellectual property boundaries.

### 2.2 Desktop Offline FFmpeg Prerequisite
- **Limitation:** On desktop platforms (Windows, macOS, Linux), offline conversion requires FFmpeg/FFprobe binaries either installed on the user's system `PATH` or placed adjacent to the application binary.
- **Consequence:** If FFmpeg is not detected, offline conversion actions will guide the user to install FFmpeg or configure its path in Settings.

### 2.3 Mobile Background Processing Limits
- **Limitation:** Mobile operating systems (iOS and Android) impose strict execution caps on background tasks when the application is minimized.
- **Consequence:** Extremely large conversions on mobile devices may be paused by the OS if the screen is turned off or if battery saver mode terminates background processes. Users are advised to keep the application active during long batch conversions.

### 2.4 File Size & Resolution Caps
- **Max Download Stream Size:** 500 MB per request.
- **Max Image Dimensions:** 16,384 x 16,384 pixels, with a maximum 100,000,000 pixel buffer.
- **Max Concurrent Jobs:** Bounded by available system CPU cores to prevent system thrashing.

