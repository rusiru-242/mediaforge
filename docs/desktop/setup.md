# MediaForge Desktop Setup Guide

## 1. Prerequisites

Before running or building the MediaForge Desktop application, verify that your development environment meets the following requirements:

| Tool | Recommended Version | Purpose |
|------|:-------------------:|---------|
| Flutter SDK | 3.24+ (Stable) | Application framework |
| Dart SDK | 3.5+ (bundled with Flutter) | Programming language |
| FFmpeg & FFprobe | 6.0+ (9.0+ recommended) | Local media processing engine |
| Git | 2.40+ | Version control |

---

## 2. Platform-Specific Build Dependencies

### Windows 11 / 10
To build native Windows desktop executables (`.exe`), the Visual Studio toolchain is required:
1. Download **Visual Studio 2022 Community** (or Visual Studio Build Tools) from [visualstudio.microsoft.com](https://visualstudio.microsoft.com/downloads/).
2. In the Visual Studio Installer, select the workload:
   - **Desktop development with C++**
   - Ensure the default MSVC C++ x64/x86 build tools and Windows 10/11 SDK are selected.
3. Verify installation with:
   ```cmd
   flutter doctor
   ```

### macOS (Sonoma / Sequoia)
1. Install **Xcode** from the Mac App Store or Apple Developer portal.
2. Run command line tools configuration:
   ```bash
   sudo xcode-select --switch /Applications/Xcode.app/Contents/Developer
   sudo xcodebuild -runFirstLaunch
   ```
3. Install FFmpeg via Homebrew:
   ```bash
   brew install ffmpeg
   ```

### Linux (Ubuntu 22.04 / 24.04, Debian, Fedora)
Install required build headers and libraries:
```bash
sudo apt-get update
sudo apt-get install -y clang cmake ninja-build pkg-config libgtk-3-dev liblzma-dev ffmpeg
```

---

## 3. Running the Desktop Application Locally

```bash
# Navigate to the Flutter desktop application directory
cd apps/flutter_app

# Fetch dependencies
flutter pub get

# Run static analysis
flutter analyze

# Run test suite
flutter test

# Launch on Windows desktop
flutter run -d windows

# Launch on macOS desktop
flutter run -d macos

# Launch on Linux desktop
flutter run -d linux
```

