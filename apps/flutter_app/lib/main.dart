import 'dart:io' show Platform, exit;
import 'package:flutter/foundation.dart' show kIsWeb;
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:window_manager/window_manager.dart';
import 'package:screen_retriever/screen_retriever.dart';
import 'features/desktop/desktop_window.dart';
import 'dart:math' as math;
import 'app.dart';
import 'shared/providers/app_providers.dart';
import 'package:media_kit/media_kit.dart';
import 'core/services/local_media_engine.dart';
import 'core/services/standalone_verification.dart';

void main(List<String> args) async {
  WidgetsFlutterBinding.ensureInitialized();
  if (!kIsWeb &&
      Platform.isWindows &&
      args.any((a) => a.startsWith('--verify-offline='))) {
    final directory = args
        .firstWhere((a) => a.startsWith('--verify-offline='))
        .substring('--verify-offline='.length);
    exit(await verifyStandalone(directory,
            verifyShell: args.contains('--verify-shell'))
        ? 0
        : 1);
  }
  if (!kIsWeb && Platform.isWindows) MediaKit.ensureInitialized();
  if (!kIsWeb && Platform.isWindows) {
    await LocalMediaEngine.shared.cleanupExpired();
  }

  // Desktop window manager setup (guarded for non-desktop platforms)
  if (!kIsWeb && (Platform.isWindows || Platform.isLinux || Platform.isMacOS)) {
    await windowManager.ensureInitialized();
    var initialSize = const Size(1280, 800);
    if (Platform.isWindows) {
      try {
        final display = await screenRetriever.getPrimaryDisplay();
        initialSize = initialDesktopSize(display.visibleSize ?? display.size);
      } catch (_) {
        /* Fall back to the normal size if display metrics are unavailable. */
      }
    }
    final windowOptions = WindowOptions(
      size: initialSize,
      minimumSize: Platform.isWindows
          ? Size(math.min(640, initialSize.width),
              math.min(480, initialSize.height))
          : const Size(900, 600),
      center: true,
      backgroundColor: Colors.transparent,
      skipTaskbar: false,
      titleBarStyle: TitleBarStyle.normal,
      title: 'MediaForge',
    );
    await windowManager.waitUntilReadyToShow(windowOptions, () async {
      await windowManager.show();
      await windowManager.focus();
    });
  }

  final prefs = await SharedPreferences.getInstance();

  runApp(
    ProviderScope(
      overrides: [
        sharedPreferencesProvider.overrideWithValue(prefs),
      ],
      child: MediaForgeApp(desktop: !kIsWeb && Platform.isWindows),
    ),
  );
}
