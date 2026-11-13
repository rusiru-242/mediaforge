# MediaForge Platform Support Matrix

**Version:** 1.0.0  
**Phase:** Phase 10 — Production Deployment & Release

---

## 1. Supported Platform Matrix

| Platform | Tier | Architecture | Minimum OS | Offline Conversion | Hardware Acceleration |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Website** | Tier 1 | Modern Web | Chrome 100+, Safari 15+, Firefox 100+, Edge | Backend-Driven | Server-side |
| **Windows Desktop** | Tier 1 | x86_64 | Windows 10 (Build 19041+) / 11 | **Full Offline (Native)** | NVENC / QSV / AMF |
| **macOS Desktop** | Tier 1 | Universal / Apple Silicon | macOS 12 (Monterey) or newer | **Full Offline (Native)** | VideoToolbox |
| **Linux Desktop** | Tier 1 | x86_64 | Ubuntu 20.04+, Debian 11+, Fedora 38+ | **Full Offline (Native)** | VAAPI / NVENC |
| **Android Mobile** | Tier 1 | ARM64, ARMv7, x86_64 | Android 8.0 (Oreo / API 26)+ | **Full Offline (Native)** | MediaCodec |
| **iOS Mobile** | Tier 2 | ARM64 | iOS 14.0+ / iPadOS 14.0+ | **Full Offline (Native)** | VideoToolbox |

---

## 2. Feature Availability by Platform

```
+-----------------------------------+---------+---------+---------+---------+---------+---------+
| Feature                           |   Web   | Windows |  macOS  |  Linux  | Android |   iOS   |
+-----------------------------------+---------+---------+---------+---------+---------+---------+
| URL Media Inspection & Download   |    ✓    |    ✓    |    ✓    |    ✓    |    ✓    |    ✓    |
| Online Cloud Transcode            |    ✓    |    ✓    |    ✓    |    ✓    |    ✓    |    ✓    |
| 100% Offline Local Transcode      |    —    |    ✓    |    ✓    |    ✓    |    ✓    |    ✓    |
| Multi-file Batch Processing       |    ✓    |    ✓    |    ✓    |    ✓    |    ✓    |    ✓    |
| Drag-and-Drop Ingestion           |    ✓    |    ✓    |    ✓    |    ✓    |    —    |    —    |
| System File Picker                |    ✓    |    ✓    |    ✓    |    ✓    |    ✓    |    ✓    |
| Dark / Light Theme Switching      |    ✓    |    ✓    |    ✓    |    ✓    |    ✓    |    ✓    |
| Zero Database / Zero Accounts     |    ✓    |    ✓    |    ✓    |    ✓    |    ✓    |    ✓    |
+-----------------------------------+---------+---------+---------+---------+---------+---------+
```

---

## 3. Format & Codec Compatibility Matrix

### 3.1 Video
- **MP4:** H.264 (libx264), H.265 (libx265), AV1 (libaom-av1, libsvtav1)
- **WebM:** VP8, VP9, AV1 with Opus/Vorbis audio
- **MKV:** Universal container supporting all standard audio/video streams
- **MOV:** Apple ProRes, H.264, HEVC
- **AVI:** Legacy MPEG-4 / DivX / Xvid

### 3.2 Audio
- **MP3:** libmp3lame (VBR & CBR up to 320 kbps)
- **WAV:** Uncompressed PCM 16-bit / 24-bit
- **AAC:** Native AAC encoder (up to 320 kbps)
- **FLAC:** Lossless Free Lossless Audio Codec (levels 0-8)
- **OGG:** Vorbis and Opus
- **M4A:** AAC / ALAC in MP4 audio container

### 3.3 Images
- **JPEG:** Standard lossy JPEG compression with quality factor 1-100
- **PNG:** Lossless PNG with transparency channel preservation
- **WebP:** Modern web image format supporting lossy and lossless modes
- **AVIF:** Next-generation AV1-based image format

