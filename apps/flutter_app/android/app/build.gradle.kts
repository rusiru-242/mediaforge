import java.util.Properties
import java.security.KeyStore
import java.security.cert.X509Certificate

plugins {
    id("com.android.application")
    // The Flutter Gradle Plugin must be applied after the Android and Kotlin Gradle plugins.
    id("dev.flutter.flutter-gradle-plugin")
}

// Environment variables take precedence over the optional, gitignored local file.
val releaseSigningProperties = Properties()
val releaseSigningFile = rootProject.file("key.properties")
if (releaseSigningFile.isFile) {
    releaseSigningFile.reader(Charsets.UTF_8).use { releaseSigningProperties.load(it) }
}
fun releaseSigningValue(environment: String, property: String): String? =
    providers.environmentVariable(environment).orNull ?: releaseSigningProperties.getProperty(property)
val releaseStore = releaseSigningValue("MEDIAFORGE_ANDROID_KEYSTORE", "storeFile")
val releaseStorePassword = releaseSigningValue("MEDIAFORGE_ANDROID_STORE_PASSWORD", "storePassword")
val releaseAlias = releaseSigningValue("MEDIAFORGE_ANDROID_KEY_ALIAS", "keyAlias")
val releaseKeyPassword = releaseSigningValue("MEDIAFORGE_ANDROID_KEY_PASSWORD", "keyPassword")

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

    signingConfigs {
        create("production") {
            if (!releaseStore.isNullOrEmpty()) storeFile = rootProject.file(releaseStore)
            storePassword = releaseStorePassword
            keyAlias = releaseAlias
            keyPassword = releaseKeyPassword
        }
    }
    buildTypes {
        release {
            // Fail closed: release artifacts must never fall back to Android Debug.
            signingConfig = signingConfigs.getByName("production")
        }
    }
}

// Explicit guard is required even when AGP omits its own signing-validation task
// for an incomplete signing config (otherwise it can emit an unsigned release).
val validateProductionReleaseSigning = tasks.register("validateProductionReleaseSigning") {
    doLast {
        if (listOf(releaseStore, releaseStorePassword, releaseAlias, releaseKeyPassword).any { it.isNullOrEmpty() }) {
            throw GradleException("Production signing is not configured. Use tool/sign_android_release.ps1 or provide the MEDIAFORGE_ANDROID_* signing variables / gitignored android/key.properties. Debug signing is never used for release builds.")
        }
        val keystoreFile = rootProject.file(releaseStore!!)
        if (!keystoreFile.isFile) throw GradleException("The configured production keystore was not found.")
        val store = KeyStore.getInstance(keystoreFile, releaseStorePassword!!.toCharArray())
        if (!store.entryInstanceOf(releaseAlias, KeyStore.PrivateKeyEntry::class.java)) {
            throw GradleException("The production signing alias is not a private-key entry.")
        }
        val certificate = store.getCertificate(releaseAlias) as? X509Certificate
            ?: throw GradleException("The production signing certificate is missing.")
        if (Regex("CN\\s*=\\s*Android Debug", RegexOption.IGNORE_CASE).containsMatchIn(certificate.subjectX500Principal.name)) {
            throw GradleException("Android Debug certificates are forbidden for production releases.")
        }
    }
}
tasks.configureEach {
    if (name.endsWith("Release", ignoreCase = true) &&
        listOf("assemble", "package", "bundle", "sign", "validateSigning").any { name.startsWith(it) }) {
        dependsOn(validateProductionReleaseSigning)
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
