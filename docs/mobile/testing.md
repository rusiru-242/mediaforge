# Mobile Testing Strategy & Verification Guide

## 1. Test Suite Summary

The Flutter test suite in `apps/flutter_app/test/` covers both core services, data models, and adaptive UI layouts:

| Test File | Target | Coverage |
| :--- | :--- | :--- |
| `mobile_shell_test.dart` | Mobile UI & Navigation | Verifies `NavigationBar`, `Drawer`, bottom sheet modal, and responsive layout under narrow screen widths (< 720px) |
| `widget_test.dart` | Desktop AppShell UI | Verifies `NavigationRail`, large screen responsiveness, and navigation page switching |
| `platform_service_test.dart` | `PlatformService` | Verifies platform detection, download paths, and sharing contract |
| `conversion_service_test.dart` | `ConversionService` | Verifies argument builders for video, audio, image, and cooperative cancellation |
| `ffmpeg_service_test.dart` | `FfmpegService` | Verifies regex progress parser across durations, fractional timestamps, and clamp limits |
| `media_job_test.dart` | Models (`MediaJob`, `MediaInfo`) | Verifies UUID generation, status state transitions, and media format detections |
| `settings_service_test.dart` | `SettingsService` | Verifies preferences persistence, default values, and reactive theme updates |

---

## 2. Running the Test Suite

```bash
cd apps/flutter_app

# Run static analysis
flutter analyze

# Run all test suites
flutter test
```

---

## 3. Responsive Screen Testing

Widget tests simulate physical mobile screen sizes using:

```dart
tester.view.physicalSize = const Size(400, 800);
tester.view.devicePixelRatio = 1.0;
addTearDown(tester.view.resetPhysicalSize);
addTearDown(tester.view.resetDevicePixelRatio);
```

This guarantees layout stability and prevents `RenderFlex` overflows on small devices.
