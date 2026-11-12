# MediaForge Mobile Architecture & Cross-Platform Foundation

## 1. System Overview

MediaForge Mobile is built as a single, unified, responsive Flutter application that targets **Android**, **iOS**, and **Desktop** (Windows, macOS, Linux) from a unified codebase in `apps/flutter_app/`.

In alignment with the MediaForge database-free and ephemeral philosophy:
- **Zero Databases**: No PostgreSQL, Neon, or SQLite on device.
- **Zero Accounts**: No authentication, registration, or cloud profiles.
- **Ephemeral Job Queue**: In-memory job state tracked via Riverpod state notifiers.
- **Scoped Storage & Sharing**: Outputs are saved directly to platform-safe application storage and exposed immediately via native system share sheets (`share_plus`).

```
+------------------------------------------------------------------+
|                       MediaForge AppShell                        |
|   Responsive Adapter (< 720px: Bottom NavigationBar & Drawer)   |
|   (>= 720px: Desktop NavigationRail & Hotkey Callbacks)          |
+------------------------------------------------------------------+
         |               |              |              |
+----------------+ +------------+ +------------+ +------------+
| Media Downloader| | Video Conv | | Audio Conv | | Image Conv |
| (HTTP Streaming| | (Presets & | | (Extraction| | (Quality &  |
|  & Chunk Sink) | |  Encoders) | |  & Resample) | Format Pick) |
+----------------+ +------------+ +------------+ +------------+
         \               |              |              /
          +-------------------------------------------+
          |             JobListNotifier               |
          |       (In-Memory Ephemeral Queue)         |
          +-------------------------------------------+
                         |             |
        +----------------+             +----------------+
        v                                               v
+-----------------------+                    +---------------------+
|    PlatformService    |                    |  ConversionService  |
| - Native Share Sheet  |                    | - Mobile Fallbacks  |
| - Scoped App Storage  |                    | - Subprocess Exec   |
| - File/Folder Launch  |                    | - Real-time Progress|
+-----------------------+                    +---------------------+
```

---

## 2. Directory Structure

```
apps/flutter_app/
├── android/                   # Native Android configuration (Gradle, Manifest, Kotlin)
│   ├── app/
│   │   ├── build.gradle.kts   # App-level Gradle config (namespace: com.mediaforge.app)
│   │   └── src/main/
│   │       ├── AndroidManifest.xml  # Permissions (Internet, Scoped Storage)
│   │       └── kotlin/com/mediaforge/app/MainActivity.kt
├── ios/                       # Native iOS configuration (Xcode, Info.plist, Swift)
│   └── Runner/
│       └── Info.plist         # Photo library privacy usage descriptions & file sharing
├── lib/
│   ├── app.dart               # MaterialApp with Riverpod & GoRouter integration
│   ├── main.dart              # Multi-platform entry point (guarded desktop window manager)
│   ├── core/
│   │   ├── config/            # AppConfig, supported MIME types, formats
│   │   ├── constants/         # UI strings, labels, badges
│   │   ├── errors/            # Strongly-typed AppException hierarchy
│   │   ├── services/          # PlatformService, ConversionService, FfmpegService
│   │   └── theme/             # Dark/Light Material 3 Themes
│   ├── features/
│   │   ├── audio_converter/   # Audio transcode & MP3 extraction
│   │   ├── batch_converter/   # Multi-file queue processing
│   │   ├── downloader/        # HTTP/HTTPS direct media download engine
│   │   ├── home/              # Dashboard, quick launcher, active jobs
│   │   ├── image_converter/   # Image format conversion & quality compression
│   │   ├── settings/          # Ephemeral settings, themes, directories
│   │   ├── shell/             # Adaptive AppShell (NavigationBar + Rail + Drawer)
│   │   └── video_converter/   # Offline video conversion & resolution presets
│   └── shared/
│       ├── models/            # MediaJob, MediaInfo, JobType, JobStatus
│       ├── providers/         # Riverpod providers, SharedPreferences, JobListNotifier
│       └── widgets/           # Responsive SettingRow, FilePickerCard, MediaInfoPanel
└── test/                      # Comprehensive unit and widget tests
    ├── mobile_shell_test.dart # Mobile layout, bottom navigation & drawer tests
    ├── platform_service_test.dart
    ├── conversion_service_test.dart
    ├── ffmpeg_service_test.dart
    ├── media_job_test.dart
    ├── settings_service_test.dart
    └── widget_test.dart
```

---

## 3. Adaptive Mobile Navigation

The app dynamically inspects `MediaQuery.of(context).size.width`:
- **Screen Width < 720px (Mobile)**:
  - **Top AppBar**: Displays current section title and MediaForge branding badge, hamburger button for drawer, and quick settings action.
  - **Bottom NavigationBar**: 5 primary thumb-accessible destinations (`Home`, `Download`, `Video`, `Audio`, `More`).
  - **More Modal Bottom Sheet**: Provides quick access to `Image Converter`, `Batch Processing`, and `Settings`.
  - **Navigation Drawer**: Full slide-out menu with all 7 destinations and version telemetry.
- **Screen Width >= 720px (Desktop / Tablet)**:
  - **NavigationRail**: Full sidebar with hotkey access (Ctrl+1 through Ctrl+7).

---

## 4. Native Sharing & Storage Integration

Mobile platforms enforce sandboxing (Android Scoped Storage and iOS Sandbox):
1. Downloads and conversions write to standard `getApplicationDocumentsDirectory()`.
2. Users can immediately dispatch any output file via the native share sheet (`PlatformService.shareFile`) to save into Google Photos, Apple Files, WhatsApp, AirDrop, or external storage.

