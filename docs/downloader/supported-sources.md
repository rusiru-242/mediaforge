# MediaForge Downloader — Supported Media Sources & Legal Compliance

## 1. Supported Sources Matrix

The MediaForge Downloader Engine classifies incoming stream URLs using an extensible priority-based adapter pipeline:

| Source Category | Supported Extensions / Domains | Capabilities | Processing Mechanism |
|---|---|---|---|
| **Direct Video Streams** | `.mp4`, `.webm`, `.mkv`, `.avi`, `.mov` | High-definition stream ingestion, MIME detection, resolution discovery | Byte streaming via `HttpDownloadClient` directly into scratch storage |
| **Direct Audio Streams** | `.mp3`, `.wav`, `.flac`, `.aac`, `.m4a`, `.ogg` | Bitrate extraction, audio container validation | Direct byte transfer into ephemeral audio cache |
| **Direct Images** | `.jpg`, `.jpeg`, `.png`, `.webp`, `.gif`, `.bmp`, `.svg` | Dimension extraction, image validation | Direct binary retrieval with mime type checking |
| **Generic Web Media** | Any public URL serving `video/*`, `audio/*`, or `image/*` MIME headers | Head probe, Content-Length inspection, stream retrieval | Fallback probe and validation |
| **Social / Platform Video** | YouTube, TikTok, Instagram, Twitter/X, Facebook | Policy compliance metadata notice, OAuth API requirement guidance | **Platform Terms Compliance**: Returns non-downloadable platform metadata and explicit guidance |

---

## 2. Platform Policies & DRM Compliance

MediaForge strictly adheres to modern software ethics, terms of service agreements, and digital rights management (DRM):

1. **No DRM Circumvention**: The system does NOT decrypt Widevine, FairPlay, PlayReady, or encrypted HLS/DASH streams.
2. **No Credential Spoofing or Anti-Bot Bypass**: MediaForge does not solve CAPTCHAs, bypass Cloudflare Turnstile, or impersonate logged-in user sessions.
3. **Third-Party Platform Policy**: Commercial streaming and social networks (e.g., YouTube, TikTok, Instagram) explicitly require authorized API keys or OAuth integrations. Attempting unauthorized stream scraping without platform agreements is disabled by design.
4. **Authorized Ingestion**: Users are permitted to download and process media files from authorized direct hosts, public repositories, and personal cloud storage buckets.

---

## 3. URL Verification & Sanitization Rules

Every candidate URL must satisfy the following validation criteria before any network socket is opened:
- **Valid Scheme**: Must use standard `http://` or `https://`. File schemes (`file://`), loopback schemes (`gopher://`), and internal protocols are rejected.
- **FQDN / Host Presence**: Hostnames must resolve through standard DNS resolvers.
- **SSRF Subnet Check**: Resolved IP addresses must not fall within loopback, RFC 1918 private subnets, carrier-grade NAT, or link-local cloud metadata addresses.
- **Port Restrictions**: Non-standard internal ports (e.g. `22`, `3306`, `5432`, `6379`, `9200`) are rejected.

