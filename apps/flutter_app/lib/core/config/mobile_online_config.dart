import 'package:flutter/foundation.dart';

/// Online configuration is separate from all offline engines and desktop URLs.
class MobileOnlineConfig {
  static const emulatorApiBase = 'http://10.0.2.2:8081/api/v1';
  static const configuredApiBase =
      String.fromEnvironment('MEDIAFORGE_ONLINE_API_BASE');

  static String resolve(
      {String definedBase = configuredApiBase,
      String savedBase = '',
      bool development = kDebugMode,
      TargetPlatform? platform}) {
    final target = platform ?? defaultTargetPlatform;
    final value = definedBase.trim().isNotEmpty
        ? definedBase.trim()
        : savedBase.trim().isNotEmpty
            ? savedBase.trim()
            : development && target == TargetPlatform.android
                ? emulatorApiBase
                : '';
    if (value.isEmpty) {
      throw StateError(
          'Online downloads are not configured in this build. Local editors work offline.');
    }
    final clean = value.replaceFirst(RegExp(r'/+$'), '');
    final uri = Uri.tryParse(clean);
    final emulatorHttp = development &&
        target == TargetPlatform.android &&
        clean == emulatorApiBase;
    if (uri == null ||
        uri.host.isEmpty ||
        uri.userInfo.isNotEmpty ||
        uri.hasQuery ||
        uri.hasFragment ||
        uri.path != '/api/v1' ||
        (uri.scheme != 'https' && !emulatorHttp)) {
      throw StateError(
          'Use an HTTPS MediaForge API URL ending in /api/v1. HTTP is allowed only for 10.0.2.2:8081 in Android debug builds.');
    }
    return clean;
  }
}
