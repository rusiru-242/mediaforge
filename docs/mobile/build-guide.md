# Mobile Application Build & Distribution Guide

## 1. Prerequisites

- **Flutter SDK**: 3.24.x+ / 3.47.x (Channel stable)
- **Dart SDK**: 3.5.x+ / 3.13.x
- **Android SDK**: Build-tools 34.0.0+ / 36.1.0, Android API 34+
- **JDK**: Java 17 or Java 21
- **Xcode**: 15+ (Required for iOS builds, macOS only)

---

## 2. Android Build

### Debug APK
```bash
cd apps/flutter_app
flutter build apk --debug
# Output: apps/flutter_app/build/app/outputs/flutter-apk/app-debug.apk
```

### Release APK
```bash
cd apps/flutter_app
flutter build apk --release
# Output: apps/flutter_app/build/app/outputs/flutter-apk/app-release.apk
```

### Android App Bundle (AAB) for Google Play
```bash
cd apps/flutter_app
flutter build appbundle --release
# Output: apps/flutter_app/build/app/outputs/bundle/release/app-release.aab
```

---

## 3. iOS Build (macOS)

### iOS Simulator Build (No Code Signing Required)
```bash
cd apps/flutter_app
flutter build ios --no-codesign --simulator
```

### iOS Release IPA
```bash
cd apps/flutter_app
flutter build ipa --release
```

