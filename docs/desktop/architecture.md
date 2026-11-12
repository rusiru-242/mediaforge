# MediaForge Desktop Architecture

## 1. Overview

The MediaForge Desktop Application (`apps/flutter_app/`) is a cross-platform desktop media processing suite engineered in Flutter 3 and Dart. It provides fully offline video, audio, and image conversion using local FFmpeg/FFprobe binaries, alongside permitted URL stream downloading, batch queuing, and in-memory job orchestration.

```
┌─────────────────────────────────────────────────────────────┐
│                 MediaForge Desktop (Flutter)               │
│                                                             │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────────────┐ │
│  │ Home / Quick │ │ Downloader   │ │ Video / Audio / Img  │ │
│  │ Dashboard    │ │ URL Stream   │ │ Converter Pages      │ │
│  └──────┬───────┘ └──────┬───────┘ └──────────┬───────────┘ │
│         │                │                    │             │
│  ┌──────▼────────────────▼────────────────────▼───────────┐ │
│  │             Riverpod State Management                  │ │
│  │ (JobListNotifier, SettingsService, ThemeModeProvider)  │ │
│  └──────┬────────────────┬────────────────────┬───────────┘ │
│         │                │                    │             │
│  ┌──────▼────────┐┌──────▼────────┐    ┌──────▼───────────┐ │
│  │ FfmpegService ││ ConversionSvc │    │ SettingsService  │ │
│  │ (Process exec)││ (Job runner)  │    │(SharedPreferences│ │
│  └──────┬────────┘└──────┬────────┘    └──────────────────┘ │
└─────────┼────────────────┼──────────────────────────────────┘
          │ (stdin/stderr) │
          ▼                ▼
   ┌───────────────────────────────────────────┐
   │ Local FFmpeg / FFprobe System Executables │
   │ (Offline, zero network, zero database)    │
   └───────────────────────────────────────────┘
```

---

## 2. Core Architectural Principles

### 2.1 Database-Free & Privacy-First
- **No SQLite, No PostgreSQL, No Neon**: All session jobs and recent results are maintained strictly in-memory using Riverpod's `JobListNotifier`.
- **Zero Tracking**: When the application closes, temporary session history is discarded. User original files are never deleted or modified.
- **Local Settings Only**: Configuration (theme, default folders, format preferences, custom FFmpeg paths) is persisted locally via `SharedPreferences`.

### 2.2 Offline-First Media Engine
- All conversion suites (Video, Audio, Image, and Batch) execute locally through asynchronous process streaming with FFmpeg.
- Conversions function 100% offline without requiring internet access or the Spring Boot backend server.

### 2.3 Layered Directory Layout
```
lib/
├── core/
│   ├── config/          # AppConfig, format catalogs, constants
│   ├── constants/       # Text labels, strings
│   ├── errors/          # AppException hierarchy
│   ├── services/        # FfmpegService, ConversionService, SettingsService
│   └── theme/           # Material 3 light and dark theme definitions
├── features/
│   ├── home/            # Dashboard, quick actions, active job monitors
│   ├── downloader/      # URL stream downloader & inspector
│   ├── video_converter/ # Offline video transcoding UI & options
│   ├── audio_converter/ # Offline audio transcoding & extraction
│   ├── image_converter/ # Offline image conversion & compression
│   ├── batch_converter/ # Multi-file batch queue & orchestrator
│   ├── settings/        # Preferences, FFmpeg configuration, paths
│   └── shell/           # AppShell, desktop sidebar navigation, hotkeys
├── shared/
│   ├── models/          # MediaJob, MediaInfo models
│   ├── providers/       # Riverpod dependency injection & state stores
│   └── widgets/         # FilePickerCard, SettingRow, MediaInfoPanel
└── main.dart            # Desktop window initialization & bootstrap
```

---

## 3. Platform Integration & Security

- **Safe Process Execution**: Arguments are passed as validated tokenized lists directly to `Process.start` / `Process.run`, avoiding command-line injection vulnerabilities.
- **Aspect Ratio Preservation**: Video scaling uses FFmpeg's `force_original_aspect_ratio=decrease` to prevent aspect distortion.
- **Cooperative Cancellation**: Active conversions can be cancelled cleanly at any time by terminating the background process.
