# Android Platform Configuration & Setup Guide

## 1. Application Details

- **Application ID / Package**: `com.mediaforge.app`
- **Application Label**: `MediaForge`
- **Minimum SDK Version**: 24 (Android 7.0 Nougat)
- **Target SDK Version**: 34 (Android 14)
- **Compile SDK Version**: 34
- **Language**: Kotlin 1.9+ & Java 17/21 compatibility

---

## 2. Android Manifest Configuration

The manifest at `apps/flutter_app/android/app/src/main/AndroidManifest.xml` configures:

```xml
<manifest xmlns:android="http://schemas.android.com/apk/res/android">
    <!-- Network access for media downloading and metadata inspection -->
    <uses-permission android:name="android.permission.INTERNET"/>
    <uses-permission android:name="android.permission.ACCESS_NETWORK_STATE"/>

    <!-- Android 13+ Granular Media Permissions -->
    <uses-permission android:name="android.permission.READ_MEDIA_VIDEO"/>
    <uses-permission android:name="android.permission.READ_MEDIA_AUDIO"/>
    <uses-permission android:name="android.permission.READ_MEDIA_IMAGES"/>

    <!-- Legacy Storage Permissions for Android 12 and below -->
    <uses-permission android:name="android.permission.READ_EXTERNAL_STORAGE" android:maxSdkVersion="32"/>
    <uses-permission android:name="android.permission.WRITE_EXTERNAL_STORAGE" android:maxSdkVersion="29"/>

    <application
        android:label="MediaForge"
        android:name="${applicationName}"
        android:icon="@mipmap/ic_launcher">
        ...
    </application>
</manifest>
```

---

## 3. Gradle Configuration (`build.gradle.kts`)

Located at `apps/flutter_app/android/app/build.gradle.kts`:

```kotlin
plugins {
    id("com.android.application")
    id("dev.flutter.flutter-gradle-plugin")
}

android {
    namespace = "com.mediaforge.app"
    compileSdk = 34
    ndkVersion = flutter.ndkVersion

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }

    defaultConfig {
        applicationId = "com.mediaforge.app"
        minSdk = 24
        targetSdk = 34
        versionCode = flutter.versionCode
        versionName = flutter.versionName
    }
}
```

---

## 4. Local Build & Run Instructions

Ensure Android Studio or Android SDK Command-line Tools are installed:

```bash
# Verify connected devices or emulator
flutter devices

# Build Debug APK
cd apps/flutter_app
flutter build apk --debug

# Build Release APK
flutter build apk --release

# Run on connected device or emulator
flutter run -d android
```
