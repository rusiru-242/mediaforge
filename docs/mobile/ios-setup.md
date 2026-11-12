# iOS Platform Configuration & Setup Guide

## 1. Application Details

- **Bundle Identifier**: `com.mediaforge.app`
- **Display Name**: `MediaForge`
- **Supported iOS Version**: iOS 13.0+
- **Architectures**: arm64 (Device), x86_64 / arm64 (Simulator)

---

## 2. Privacy Usage Descriptions (`Info.plist`)

Apple requires explicit human-readable descriptions in `apps/flutter_app/ios/Runner/Info.plist` for media library access and file sharing:

```xml
<dict>
    <key>CFBundleDisplayName</key>
    <string>MediaForge</string>
    <key>CFBundleName</key>
    <string>mediaforge</string>

    <!-- Photo Library Permission for Picking Video/Image files -->
    <key>NSPhotoLibraryUsageDescription</key>
    <string>MediaForge requires access to your photo library to select media files for conversion and processing.</string>

    <!-- Photo Library Add Permission for Saving Converted Media -->
    <key>NSPhotoLibraryAddUsageDescription</key>
    <string>MediaForge needs permission to save converted videos, audio files, and images to your photo library.</string>

    <!-- Enable Document File Sharing & In-Place Opening -->
    <key>UIFileSharingEnabled</key>
    <true/>
    <key>LSSupportsOpeningDocumentsInPlace</key>
    <true/>
</dict>
```

---

## 3. macOS & CI Build Requirements

Since iOS builds require Xcode toolchains, building the iOS runner requires macOS.

In our monorepo CI/CD, the `.github/workflows/flutter-mobile-ci.yml` pipeline uses a `macos-latest` runner for iOS build verification:

```bash
# On macOS host:
cd apps/flutter_app
flutter build ios --no-codesign --simulator
```

This ensures the iOS project compiles cleanly without requiring code-signing certificates on every push.

