# MediaForge — Platform Compatibility

**Document Version:** 1.0.0
**Last Updated:** 2026-11-09

---

## Web Application (Next.js)

| Browser | Minimum Version | Support Level |
|---------|----------------|--------------|
| Google Chrome | 120+ | ✅ Full |
| Mozilla Firefox | 120+ | ✅ Full |
| Apple Safari | 17+ | ✅ Full |
| Microsoft Edge | 120+ | ✅ Full |
| Opera | 106+ | 🔵 Best effort |
| Samsung Internet | 24+ | 🔵 Best effort |

**Screen sizes:** Mobile (320px+), Tablet (768px+), Desktop (1024px+)

---

## Desktop Application (Flutter)

| Platform | Minimum Version | Architecture | Status |
|----------|----------------|-------------|--------|
| Windows | Windows 10 22H2 | x86_64 | ✅ Primary |
| Windows | Windows 11 | x86_64 | ✅ Primary |
| macOS | macOS 12 (Monterey) | x86_64 + Apple Silicon | 🔵 Phase 06+ |
| Ubuntu | 20.04 LTS | x86_64 | 🔵 Phase 06+ |
| Debian | 11+ | x86_64 | 🔵 Best effort |

---

## Mobile Application (Flutter)

| Platform | Minimum Version | Architecture | Status |
|----------|----------------|-------------|--------|
| Android | Android 8.0 (API 26) | arm64, x86_64 | ✅ Primary |
| iOS | iOS 14.0 | arm64 | 🔵 Phase 07+ |

---

## Backend API (Spring Boot)

| Requirement | Specification |
|------------|--------------|
| Java Runtime | Java 21 (LTS) |
| Minimum RAM | 512 MB (dev) / 1 GB (prod) |
| OS | Linux (production), Windows/macOS (development) |
| Docker | Docker 24+, Docker Compose v2 |

---

## Infrastructure

| Component | Minimum Version |
|----------|----------------|
| PostgreSQL | 15+ (16 recommended) |
| Redis | 7+ |
| FFmpeg | 6+ |
| Nginx | 1.24+ |

