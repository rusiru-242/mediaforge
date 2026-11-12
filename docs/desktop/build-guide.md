# Desktop Build & Distribution Guide

## 1. Building Windows Desktop Application

### Prerequisites
- Windows 10/11 x64
- Flutter 3.24+ (Stable channel)
- Visual Studio 2022 with **Desktop development with C++**

### Build Command
```cmd
cd apps/flutter_app
flutter pub get
flutter build windows --release
```

### Build Artifacts
The release package will be generated at:
```
apps/flutter_app/build/windows/x64/runner/Release/
├── mediaforge_desktop.exe
├── flutter_windows.dll
└── data/
```

To distribute, zip the contents of the `Release` folder. Users can run `mediaforge_desktop.exe` directly without installation.

---

## 2. Building macOS Desktop Application

### Prerequisites
- macOS Sonoma / Sequoia
- Xcode 15+
- Flutter 3.24+ (Stable channel)

### Build Command
```bash
cd apps/flutter_app
flutter pub get
flutter build macos --release --no-codesign
```

### Build Artifacts
The compiled `.app` bundle will be generated at:
```
apps/flutter_app/build/macos/Build/Products/Release/mediaforge_desktop.app
```

---

## 3. Building Linux Desktop Application

### Prerequisites
- Ubuntu 22.04+ / Debian 12+
- `clang`, `cmake`, `ninja-build`, `pkg-config`, `libgtk-3-dev`, `liblzma-dev`
- Flutter 3.24+ (Stable channel)

### Build Command
```bash
cd apps/flutter_app
flutter pub get
flutter build linux --release
```

### Build Artifacts
The compiled Linux executable bundle will be generated at:
```
apps/flutter_app/build/linux/x64/release/bundle/
├── mediaforge_desktop
├── data/
└── lib/
```
