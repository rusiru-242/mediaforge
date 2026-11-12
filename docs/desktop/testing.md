# Desktop Testing & Quality Assurance Guide

## 1. Test Suite Architecture

MediaForge Desktop includes comprehensive unit tests, widget tests, and model verification tests located in `apps/flutter_app/test/`:

| Test Suite | File | Focus |
|---|---|---|
| **Widget & AppShell Test** | `widget_test.dart` | Navigation rail, destination switching, Material 3 layout, smoke tests |
| **FFmpeg Progress Parsing** | `ffmpeg_service_test.dart` | Stderr timestamp regex parsing, fractional seconds, clamping, configuration |
| **Media Models** | `media_job_test.dart` | `MediaJob` UUID creation, status transitions, `MediaInfo` media types and calculations |
| **Settings Service** | `settings_service_test.dart` | `SharedPreferences` persistence for themes, format defaults, output directory |
| **Conversion Service** | `conversion_service_test.dart` | Command parameter generation, active process cancellation tracking |

---

## 2. Executing Tests Locally

```bash
cd apps/flutter_app

# Run all tests
flutter test

# Run tests with code coverage report
flutter test --coverage

# Run specific test file
flutter test test/ffmpeg_service_test.dart
```

---

## 3. Real Media FFprobe Verification Protocol

As part of the media processing assurance protocol, media conversions are tested against real local media files using FFprobe to inspect stream properties:

```powershell
# Verify audio stream extraction
ffprobe -v error -show_entries format=format_name,duration,size:stream=codec_name sample_extracted.mp3

# Verify video transcoding and resolution scaling
ffprobe -v error -show_entries format=format_name:stream=codec_name,width,height sample_video_converted.webm

# Verify image transcoding
ffprobe -v error -show_entries format=format_name:stream=codec_name,width,height sample_image_converted.png
```
