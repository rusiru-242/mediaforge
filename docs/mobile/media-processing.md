# Mobile Media Processing & Platform Abstraction

## 1. Multi-Platform Media Processing Strategy

MediaForge processes video, audio, and images without external servers, tracking all jobs in memory.

| Feature | Desktop Execution | Mobile Execution |
| :--- | :--- | :--- |
| **Media Downloader** | Direct HTTP streaming & disk buffer | Direct HTTP streaming to app documents directory |
| **Video Conversion** | CLI FFmpeg subprocess (`Process.start`) | Guarded execution / platform channel adapter |
| **Audio Extraction** | CLI FFmpeg audio demuxer & encoder | CLI FFmpeg / on-device extraction pipeline |
| **Image Conversion** | CLI FFmpeg image coder / pure Dart | CLI FFmpeg / image compression pipeline |
| **File Sharing** | OS File Explorer / Finder / xdg-open | Native system share sheet (`share_plus`) |

---

## 2. Platform Safety & Window Manager Guards

Certain plugins like `window_manager` only apply to desktop windowing environments (Windows, macOS, Linux). Initializing them on mobile would cause unhandled missing plugin exceptions.

In `lib/main.dart`:
```dart
if (!kIsWeb && (Platform.isWindows || Platform.isLinux || Platform.isMacOS)) {
  await windowManager.ensureInitialized();
  const windowOptions = WindowOptions(
    size: Size(1280, 800),
    minimumSize: Size(900, 600),
    center: true,
    title: 'MediaForge',
  );
  await windowManager.waitUntilReadyToShow(windowOptions, () async {
    await windowManager.show();
    await windowManager.focus();
  });
}
```

---

## 3. Cooperative Job Cancellation

Active conversions and downloads support cooperative real-time cancellation:
- **Downloads**: Active `http.Client` is immediately terminated via `_activeClient?.close()`, resetting progress and updating the UI state.
- **Conversion Jobs**: In-flight processes are terminated via `ConversionService.cancelJob(jobId)` or `cancelAll()`, setting job status to `JobStatus.cancelled`.

