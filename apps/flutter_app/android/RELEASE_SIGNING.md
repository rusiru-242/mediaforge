# Android production signing

Release builds use the `production` signing configuration exclusively. There is
no debug-signing fallback. A Gradle guard checks for complete configuration,
a private-key alias and a non-debug X.509 certificate before release packaging.
Debug builds retain Android's normal debug signing configuration.

Application ID, Flutter version values, SDK configuration and dependencies are
unchanged.

## Local secure build (Windows)

From the Flutter project directory:

```powershell
.\tool\sign_android_release.ps1 -FlutterSdk C:\path\to\flutter -ConsolePrompt
```

The default keystore is `%USERPROFILE%\mediaforge-signing\mediaforge-release.jks`
and the alias is `mediaforge`. Override them with `-Keystore` and `-KeyAlias`
when needed. Password entry uses `Read-Host -AsSecureString`. Press Enter at
the key-password prompt to use the keystore password. No password is placed
in the command line or written to a configuration file by the helper.

The helper passes passwords through its own temporary process environment,
disables persistent Gradle daemons/configuration caching for the build and
clears password variables afterward. As with any signing tool, decrypted
credentials necessarily exist in process memory while signing.

It executes `flutter pub get`, `flutter build apk --release`, then
`apksigner verify --verbose --print-certs`. Verification compares the APK signer
SHA-256 against the public certificate exported from the chosen keystore alias
and rejects an Android Debug certificate.

Output: `build/app/outputs/flutter-apk/app-release.apk`.

Status, build logs, public certificate and verification evidence are written
under `build/` (gitignored). Do not share private keystores or passwords.

## Gradle configuration sources

Environment variables take precedence over optional `android/key.properties`:

| Environment variable | Local properties key |
| --- | --- |
| `MEDIAFORGE_ANDROID_KEYSTORE` | `storeFile` |
| `MEDIAFORGE_ANDROID_KEY_ALIAS` | `keyAlias` |
| `MEDIAFORGE_ANDROID_STORE_PASSWORD` | `storePassword` |
| `MEDIAFORGE_ANDROID_KEY_PASSWORD` | `keyPassword` |

`key.properties`, `*.jks` and `*.keystore` are gitignored. The supplied local
file contains only the keystore path and alias; passwords come from the prompt.
Prefer environment credentials over persisting passwords in a local file.
Never use `--debug`/`--info` logging or print credential environment variables
when diagnosing signing issues.

Existing debug-signed installations cannot be updated in place with a different
production certificate. This build helper does not uninstall applications or
erase application data.

References: [Flutter Android signing](https://docs.flutter.dev/deployment/android)
and [Android apksigner](https://developer.android.com/tools/apksigner).
