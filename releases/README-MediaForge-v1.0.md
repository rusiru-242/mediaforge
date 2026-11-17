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

## Executed verification

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
