# Cross-platform audit — 2026-11-16

Inspected web overview/downloader/video/audio/image/batch pages, globals.css tokens,
Flutter main/app, desktop workspace and engine, legacy AppShell/converters,
backend DTOs/job/FFmpeg services, Android Gradle/manifest/activity, iOS project,
AppDelegate/Info.plist, pubspec and existing verification reports.

| Capability before this change | Windows | Android/iOS |
|---|---|---|
| Website typography, palette, light/dark | Implemented, tested | Shared theme present; legacy mobile layout |
| Offline video/audio/image processing | Bundled FFmpeg, verified | Broken assumption: CLI tools available on mobile |
| Preview, trim/crop, per-file settings | Native desktop implementation | Legacy screens, no native processing engine |
| Batch and cancellation | Bounded local queue, verified | Legacy CLI-dependent queue |
| Downloader | Bundled yt-dlp, internet/platform restrictions | No packaged extractor; online service required |
| Export | Native Save As, streaming | Existing file plugins; no native processing integration |
| Backend dependency | Local processing independent | No working offline native replacement |
| Native platform channels | Windows plugin dependencies | Android activity and iOS delegate only templates |

Android SDK 36.1.0 and Pixel_7_Pro emulator are available. Flutter 3.47.5,
Dart 3.13.4 and Windows toolchain verified. Xcode/macOS unavailable. iOS target
is already 15.0. Existing Windows binaries are GPLv3; their source-distribution
restrictions in standalone-windows.md still apply. Android Media3/ExifInterface
are Apache-2.0; Apple frameworks ship with iOS. No Windows FFmpeg binaries will
be distributed inside mobile packages.

Implementation: typed MediaProcessingEngine contract, existing Windows adapter,
native Android Media3/Bitmap engine and iOS AVFoundation/Core Image engine,
shared sequential queue and responsive mobile UI using the same bundled fonts,
colors and brand mark. Native capability responses control offered formats.
Online extraction remains optional and isolated from local processing.

Authoritative API references:
- https://developer.android.com/media/media3/transformer/getting-started
- https://developer.android.com/media/media3/transformer/transformations
- https://developer.android.com/reference/androidx/media3/transformer/EditedMediaItemSequence.Builder
- https://developer.apple.com/documentation/avfoundation/avassetexportsession
- https://pub.dev/packages/video_player
