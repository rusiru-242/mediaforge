plugins {
    id("com.android.application")
    // The Flutter Gradle Plugin must be applied after the Android and Kotlin Gradle plugins.
    id("dev.flutter.flutter-gradle-plugin")
}

android {
    namespace = "com.mediaforge.app"
    compileSdk = flutter.compileSdkVersion
    ndkVersion = flutter.ndkVersion

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }

    defaultConfig {
        applicationId = "com.mediaforge.app"
        minSdk = maxOf(flutter.minSdkVersion, 26)
        ndk { abiFilters += listOf("arm64-v8a", "x86_64") }
        targetSdk = flutter.targetSdkVersion
        versionCode = flutter.versionCode
        versionName = flutter.versionName
    }

    val releaseStore = providers.environmentVariable("MEDIAFORGE_ANDROID_KEYSTORE").orNull
    signingConfigs {
        if (releaseStore != null) {
            create("production") {
                storeFile = file(releaseStore)
                storePassword = providers.environmentVariable("MEDIAFORGE_ANDROID_STORE_PASSWORD").get()
                keyAlias = providers.environmentVariable("MEDIAFORGE_ANDROID_KEY_ALIAS").get()
                keyPassword = providers.environmentVariable("MEDIAFORGE_ANDROID_KEY_PASSWORD").get()
            }
        }
    }
    buildTypes {
        release {
            // A debug-signed release is for local evaluation, never store publication.
            signingConfig = signingConfigs.findByName("production") ?: signingConfigs.getByName("debug")
        }
    }
}

kotlin {
    compilerOptions {
        jvmTarget = org.jetbrains.kotlin.gradle.dsl.JvmTarget.JVM_17
    }
}

flutter {
    source = "../.."
}

dependencies {
    implementation("dev.ffmpegkit-maintained:ffmpeg-kit-full:8.1.9")
    implementation("androidx.media3:media3-transformer:1.9.3")
    implementation("androidx.media3:media3-effect:1.9.3")
    implementation("androidx.exifinterface:exifinterface:1.4.2")
}
