# MediaForge v1.0 — Windows installer

Installer: `MediaForge-Setup-v1.0.exe` (Windows 11, x64).

The installer contains the complete existing Flutter Windows Release directory,
including native plugin DLLs, data/fonts, app-local Microsoft Visual C++ runtime,
FFmpeg, FFprobe, yt-dlp and existing tool notices/source materials. Spring Boot
and Java are not bundled. Local media processing uses application-local tools.

Default installation: `%LOCALAPPDATA%\Programs\MediaForge` (no administrator
privileges required). A Start Menu entry and Installed Apps uninstaller are
created. The Desktop shortcut is optional and unchecked by default. The existing
MediaForge application icon is used.

## Rebuild

From the repository root, after preparing a verified Windows Release folder:

```powershell
.\apps\flutter_app\tool\package_windows.ps1 -FlutterSdk C:\path\to\flutter -Compiler C:\path\to\ISCC.exe
```

The reusable installer source is `apps/flutter_app/installer/MediaForge.iss`.
The package script verifies the Flutter release-engine hash and required tools,
stages x64 redistributable CRT DLLs from Visual Studio, and writes an installer
SHA-256 file plus `MediaForge-v1.0-runtime-manifest.json`.

## Current rebuild (2026-11-17)

Application version is 1.0.0; the distributable filename remains
`MediaForge-Setup-v1.0.exe`. `flutter pub get`, `flutter analyze`, and
`flutter build windows --release` completed successfully. The complete release
payload was recursively compiled by Inno Setup and hashed in the runtime manifest.

Current evidence: `MediaForge-v1.0-packaging-verification.json` and
`MediaForge-Setup-v1.0.exe.sha256`. A copy of the runtime outside the source tree
launched successfully. Its actual EXE verified bundled tools, video trim/crop/
resize, MP3/M4A/WAV, image processing, batch ZIP, cancellation, invalid inputs,
missing tools and large streaming saves with Java/FFmpeg absent from PATH.

The backend-stopped precondition failed because an existing backend was listening
on 8081; it was preserved. The automated normal-close request timed out after
10 seconds and only the verification process was terminated. Installation and
uninstallation of this rebuild were not tested because an existing user
installation must not be overwritten or removed. Online downloads were not tested.

Manual verification on a spare Windows 11 x64 PC: run the setup, optionally enable
the Desktop shortcut, launch from Start Menu, import and export owned video/audio/
image files, and check output playback. With the source project unavailable and
Java/global FFmpeg absent, verify local conversion again. Confirm Installed Apps
lists MediaForge, then uninstall that test installation and verify shortcuts and
application files are removed. Do not uninstall an existing user installation as
part of this test without explicit approval.

## Historical installer verification (previous artifact)

Inno Setup 6.4.1 generated the installer. It was installed into a separate test
directory containing spaces on the current Windows 11 x64 machine. All 62
runtime files matched the release manifest. Start Menu/Desktop shortcut targets,
Installed Apps registration, responsive application startup, normal application
close, installed FFmpeg/FFprobe/yt-dlp execution and silent uninstall passed.
The test installation, its shortcuts and registration were removed. The existing
source-tree application and backend process were left running.

Evidence: `MediaForge-v1.0-verification.json`. Detailed installer logs remain
under `apps/flutter_app/build/installer-verification/`.

To repeat the test when no MediaForge installation/shortcut already exists:

```powershell
.\apps\flutter_app\tool\verify_windows_installer.ps1
```

## Limitations

- The installer is unsigned; no signing certificate was provided.
- A clean Windows machine without development tools was not available. All
  app-local runtime files were packaged and verified on this machine.
- Full editor operations and live online downloads were not retested as part of
  installer verification; online services still require network access.
- Bundled FFmpeg notices explicitly state that the included upstream source
  archive alone is not the complete corresponding source of all statically
  linked third-party libraries. Complete the corresponding-source/licensing
  review before public redistribution. This artifact is for local evaluation;
  it has not been published or deployed.
