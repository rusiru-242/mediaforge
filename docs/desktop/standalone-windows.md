# MediaForge standalone Windows implementation

This report supersedes the backend-dependent architecture in windows-parity-report.md. Built on Windows 11 with Flutter 3.47.5. The Next.js website and Spring Boot backend are preserved.

## Architecture and feature audit

The website pages inspected were the overview, downloader, video/audio/image/batch converters, job detail, supported formats and legal/about pages, together with their theme, navigation, editor controls and API DTOs. The existing native desktop counterparts are retained: overview, downloader, three editors, batch converter and settings. Website colors, Plus Jakarta Sans/Inter fonts (bundled with OFL licenses), film/play mark, rounded cards, light/dark themes and responsive desktop sidebar remain in use.

Previously the desktop editors uploaded media and created Spring Boot jobs. They now use an in-process MediaApi implementation backed by LocalMediaEngine. Its route-shaped methods are compatibility adapters, not HTTP requests or a local server. BackendApi remains available for existing website API regression tests; normal Windows editing does not instantiate it. Other-platform presentation and backend/web source were not changed by this standalone work.

| Feature | Current execution/dependency |
|---|---|
| Video trim, cut intervals, crop, resize, quality/container, audio extraction | Local bundled FFmpeg and FFprobe |
| Audio trim, volume, fades, five adjustable effects, formats/bitrate/channels/sample rate | Local bundled FFmpeg and FFprobe |
| Image crop, aspect presets, resize, rotate/flip, filters/color/quality | Local bundled FFmpeg and FFprobe |
| Native video/audio playback and waveform | Bundled media-kit/libmpv and FFmpeg |
| Mixed batch queue, per-file settings, individual saves and ZIP | Local processes, ZIP isolate, no backend |
| Downloader analysis and downloads | Internet required; bundled yt-dlp, no private API key or Java |
| Accounts/cloud sync/DRM/private-source access | Not implemented; no database or authentication bypass |

The local engine retains input references, schedules at most two processing jobs, uses safe argument lists with runInShell:false, and reports actual FFmpeg output timestamps. Cancellation terminates only owned process trees. Completed outputs are validated by FFprobe for actual streams, container, duration, size and requested height. MP4 video cannot be completed with audio-only content. Audio exports reject unexpected video streams. Saving streams through temporary .part files with backpressure and atomic promotion. Cache files expire after 24 hours and owned job directories are removed on normal shutdown. Outputs are saved outside the installation directory.

Settings provides a user-selected default export folder and bundled-tool diagnostics. Native file selection, Save As, drag/drop, output file/folder actions, copy path, shortcuts and navigation guards are retained. A chosen export directory is checked for write access. Windows starts no embedded Java/backend/server.

## Bundled dependencies and packaging

Run `python tool/prepare_windows_tools.py` in apps/flutter_app before building. This build-time preparation resolves the installed FFmpeg distribution, copies FFmpeg/FFprobe and its notices, downloads the pinned official yt-dlp release with SHA-256 verification, and generates a dependency manifest. Runtime resolution is exclusively relative to the installed EXE's tools directory, never a development path or global PATH. Missing tools produce a repair/reinstall error. CMake refuses a build with missing tools.

Versions used: FFmpeg/FFprobe 9.0.1 essentials (Gyan), yt-dlp 2026.10.26, Inno Setup 7.1.1. Flutter includes its runtime and native playback/plugin libraries. `tool/package_windows.ps1` adds the Microsoft application-local x64 CRT DLLs from the installed Visual Studio redistributable directory and compiles installer/MediaForge.iss.

The per-user installer includes Start Menu entries, optional desktop shortcut and uninstaller. Default location is `%LOCALAPPDATA%/Programs/MediaForge`. This is a multi-file native application, not a single portable EXE. No Java installation or manual FFmpeg setup is required. Installer and executable are unsigned.

Release EXE: `apps/flutter_app/build/windows/x64/runner/Release/mediaforge_desktop.exe` (keep the entire Release directory).

Installer: `apps/flutter_app/dist/MediaForge-1.0.0-windows-x64-setup.exe`.

## Verification

The production EXE accepts `--verify-offline=<writable-folder>` and optional `--verify-shell`. It generates owned fixtures, performs actual exports, verifies output streams and writes verification.json. Run with Spring Boot stopped and PATH restricted to Windows/System32 to prove bundled-tool resolution. This is a diagnostic mode of the actual compiled app, not simulated UI progress.

Executed results and limitations are recorded alongside this report in standalone-verification.json. Local tests cover all six video, six audio and four image containers, Unicode paths, trim/crop/resize, cuts/effects, cancellation, missing tools, invalid/oversized inputs, 256 MiB valid MP4 copying/partial cleanup and ZIP with HTTP clients forbidden. Responsive widget checks cover 1920x1080, 1600x900, 1366x768, 1280x720 and 640x480, both themes. Native Windows integration exercises previews, selected-range playback, exports and batch with the backend stopped.

## Remaining restrictions

Final executed totals: flutter pub get completed; flutter analyze reported no issues; flutter test passed 78 tests with 8 optional HTTP tests skipped; one native Windows integration test passed; flutter run and release build succeeded. The installed production EXE passed all 14 diagnostic checks with port 8081 absent and Java/FFmpeg/FFprobe absent from PATH. Install and uninstall returned 0. The app is now installed at `%LOCALAPPDATA%/Programs/MediaForge/mediaforge_desktop.exe` and its GUI launched independently from the temporary working directory. The original backend was restored afterward and its health endpoint returned UP. Bundled yt-dlp retrieved nine real formats for the user's authorized Instagram URL; full online downloads were not rerun through the new engine.

## Files changed for standalone processing

Added services: `lib/core/services/media_api.dart`, `bundled_tools.dart`, `local_media_engine.dart`, `local_media_api.dart`, `local_extractor.dart`, `standalone_verification.dart`; settings `lib/features/desktop/local_settings.dart`; tests `test/local_media_engine_test.dart`; packaging `tool/prepare_windows_tools.py`, `tool/package_windows.ps1`, `installer/MediaForge.iss`.

Updated native integration: `lib/main.dart`, `lib/core/services/backend_api.dart`, `preview_probe.dart`, `lib/shared/providers/app_providers.dart`, `lib/features/desktop/desktop_workspace.dart`, `desktop_editor.dart`, `desktop_downloader.dart`, `desktop_batch.dart`, `desktop_task.dart`, `task_panel.dart`; `windows/CMakeLists.txt`, `.gitignore`, `integration_test/desktop_flow_test.dart`, `test/desktop_workspace_test.dart`. Font/theme/UI files from the earlier desktop parity work remain present. Generated binaries, staged tools and build logs are intentionally ignored by Git. `docs/desktop/standalone-verification.json` records actual verification output and installer hash.

## Remaining restrictions and manual checks

Online source availability depends on the platform, network and current extractor. Visible platform tabs do not guarantee all URLs work. No universal TikTok/YouTube/Facebook/X support claim is made. Direct URLs whose extractor metadata has no usable codecs are rejected rather than given fabricated formats. Constant-quality output size is unavailable before export; MP3 bitrate estimates use duration and overhead; completed outputs show measured size. Upscaling does not restore detail.

Native Open/Save dialogs and drag/drop need manual interaction verification; prior automated Windows dialog driving was unreliable and is not reported as passed. A clean Windows VM without installed developer tools was unavailable; isolated-PATH installed-EXE checks do not replace that test. Very large files beyond the enforced 2 GiB input limit are unsupported.

Licensing: the staged Gyan build is GPLv3. FFmpeg licenses, build README, exact upstream FFmpeg source archive and yt-dlp notices are included. The archive does NOT constitute the complete corresponding source for all statically linked external libraries. Before public redistribution, supply/review all corresponding dependency sources and build instructions and applicable playback/CRT licenses. The generated installer is for local evaluation; public redistribution is not represented as cleared. See https://ffmpeg.org/legal.html and https://www.gyan.dev/ffmpeg/builds/ . Nothing was deployed or published.
