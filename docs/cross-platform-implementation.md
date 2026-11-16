# MediaForge cross-platform implementation

This report supersedes earlier desktop-only results. The website and Spring Boot source remain unchanged by this implementation. No database, WebView or embedded Java server was introduced.

## Architecture and feature mapping

The website overview, downloader, video, audio, image and batch pages, CSS tokens and bundled fonts were inspected. Flutter retains the same film/play branding, Plus Jakarta Sans/Inter fonts, purple accent, rounded cards and light/dark themes. Windows retains desktop sidebar navigation; mobile uses a responsive header and drawer. Visited editor state is preserved and leaving active work requires confirmation.

| Website tool | Windows | Android | iOS source implementation |
|---|---|---|---|
| Overview/navigation/themes | Native desktop workspace | Native responsive workspace | Shared mobile workspace |
| Video preview/trim/cut/crop/resize/export | Bundled FFmpeg and media_kit | Media3 Transformer and video_player | AVFoundation and video_player |
| Audio playback/trim/conversion | FFmpeg; existing formats/effects | AAC in M4A | AAC in M4A |
| Image crop/resize/rotation/conversion | FFmpeg; existing filters | Bitmap/Exif; JPG, PNG, WebP | Core Image/Image I/O; JPG, PNG |
| Batch | Existing bounded desktop queue/ZIP | Sequential local queue | Shared sequential local queue |
| Downloader | Bundled yt-dlp, internet required | Optional public HTTPS API | Optional public HTTPS API |

`MediaProcessingEngine` provides typed media requests, metadata, capabilities, job states, probing, conversion, cancellation and cleanup. `WindowsMediaEngine` adapts the existing local engine; desktop screens retain their existing LocalMediaApi facade. `NativeMediaEngine` uses the `mediaforge/media` platform channel. `MediaQueue` serializes mobile work and continues after individual failures. `MediaFileStore` handles cached imports, streamed desktop saves and native mobile export/share.

Android uses Media3 1.9.3, ExifInterface 1.4.2 and actual device encoder capabilities. Video exports are H.264 MP4 with AAC when audio is expected. iOS uses Apple frameworks, MP4/MOV and M4A. Native exports verify stream presence, duration and requested display height before completion. Files are processed locally; no upload occurs for these operations. Progress is read from native processing, with an indeterminate indicator when unavailable. Cancellation stops native exports and removes partial output. App-owned stale outputs are cleaned after 24 hours. Mobile operations are foreground-only and cancel when the app backgrounds.

Mobile file import uses the system picker and cached local paths rather than loading entire files into Dart memory. Android uses scoped MediaStore on API 29+ for Gallery saving, or the system Files dialog. iOS uses Files and add-only Photos access; audio uses Files. Input is limited to 2 GiB, native images to 16 megapixels, and mobile jobs run sequentially. These limits are not proof of stress testing on low-memory phones.

## Verification and artifacts

The initial full Flutter suite executed 111 passing tests, with 8 optional HTTP tests skipped. Real Windows FFmpeg tests cover formats, resolution changes, filters, cancellation and invalid outputs while HTTP creation is forbidden. `flutter analyze` completed with no issues. Generated, owned fixtures were processed on an Android emulator: 12 checks passed covering video metadata, trim/crop/resize, cuts, M4A audio, image transforms, PNG transparency, batch, cancellation, invalid input, scoped Gallery saving and cleanup. Exported files were independently inspected with host FFprobe. See [Android evidence](desktop/android-native-verification.json).

Final shared/mobile regression tests passed 7/7. The final Android integration run passed both tests: all 12 native checks above, followed by real video-player trim-boundary playback, export and workspace clearing. Native Save As/file-picker automation timed out and is not counted as passed. Physical Android device, large-file stress and clean-machine installer tests have not been executed. iOS cannot be compiled or run on this Windows host; its implementation is unverified until Xcode build/device tests succeed. Windows release compilation and Inno Setup installer compilation succeeded. Consult final build logs and the final response for the latest release results.

Expected artifact paths relative to the repository:

- Windows executable: `apps/flutter_app/build/windows/x64/runner/Release/mediaforge_desktop.exe`
- Windows installer: `apps/flutter_app/dist/MediaForge-1.0.0-windows-x64-setup.exe`
- Android APK: `apps/flutter_app/build/app/outputs/flutter-apk/app-release.apk`

Android release builds without production signing environment variables use the debug certificate for local evaluation. Supply `MEDIAFORGE_ANDROID_KEYSTORE`, `MEDIAFORGE_ANDROID_STORE_PASSWORD`, `MEDIAFORGE_ANDROID_KEY_ALIAS` and `MEDIAFORGE_ANDROID_KEY_PASSWORD` for production signing. Do not commit those secrets. Minimum Android API is 26; target is 36. Existing plugin Kotlin/Java deprecation warnings remain.

The final APK release build and emulator installation succeeded. A stale generated registration for the test-only integration plugin initially broke a rebuild; running `flutter pub get` regenerated it and the subsequent release build passed. Do not run Flutter target builds concurrently because they share generated plugin metadata. An emulator System UI not-responding dialog interrupted final release visual inspection; installation/start was verified, but this is not a complete release UI acceptance test.

Windows bundles FFmpeg/FFprobe 9.0.1, yt-dlp 2026.10.26, Flutter runtime and required native DLLs. It is not a single-file executable. The installer is unsigned. The existing FFmpeg GPL redistribution/source-completeness limitation in [Windows documentation](desktop/standalone-windows.md) remains: local artifacts are for evaluation until distribution obligations are satisfied. Local processing requires neither Java nor Spring Boot. The existing backend was left running; no claim is made that it was stopped for this round of tests.

## Online and platform limitations

Windows downloading remains subject to connectivity and source restrictions. Mobile has no packaged yt-dlp: a user-configured public HTTPS MediaForge-compatible service is optional, with no embedded private API keys and no default localhost dependency. No hosted production service was supplied or tested. Mobile online platform support is therefore not claimed. Restricted/private/DRM content is not bypassed.

Mobile does not currently implement the desktop audio effects, photo/video presets, waveform editor or batch ZIP. Formats are intentionally limited to implemented native codecs. Native codec/device failures are surfaced rather than replaced with fabricated output. iOS capability and export behavior still require device verification. Resolution enlargement cannot restore source detail.

## macOS/iOS verification required

1. Install current Xcode and its command-line tools, accept its license and install an iOS simulator runtime.
2. Install Flutter matching the project SDK and run `flutter doctor -v`.
3. In `apps/flutter_app`, run `flutter pub get`; when using CocoaPods, run `pod install` inside `ios` (the Podfile targets iOS 15).
4. Open `ios/Runner.xcworkspace`, select an Apple development team and a unique bundle identifier, and resolve signing.
5. Run `flutter run -d <simulator-id>`, then `flutter test integration_test/mobile_native_test.dart -d <device-id>` on a supported real device. Verify Files/Photos dialogs and cancellation separately.
6. Test offline video/audio/image/batch exports, permissions, orientation, transparency and background cancellation on an iPhone.
7. Only after those succeed, run `flutter build ipa --release` with production signing. No IPA or successful iOS build is supplied from Windows.

## Changed implementation groups

- `apps/flutter_app/lib/core/processing/`: shared contract, native/Windows adapters, queue and file store.
- `apps/flutter_app/lib/features/mobile/`: workspace, editor, batch and optional downloader.
- `apps/flutter_app/android/app/`: native engine, activity, SDK/dependencies, manifest and brand icon.
- `apps/flutter_app/ios/`: Swift engine, registration, project references, permissions, Podfile and icons.
- Flutter app routing, dependency lockfile, desktop resolution/filter components and associated regression tests.
- `integration_test/mobile_native_test.dart`, owned fixture data, processing/mobile widget tests, icon generator, ignore exceptions and audit/evidence documentation.

The complete path list can be reviewed with `git diff --name-only` plus `git ls-files --others --exclude-standard`. No unrelated project data was deleted. Disk exhaustion interrupted earlier work; affected source files were restored and the passing suite was run afterward.
