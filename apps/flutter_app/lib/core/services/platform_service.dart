import 'dart:io';
import 'package:flutter/foundation.dart';
import 'package:path_provider/path_provider.dart';
import 'package:share_plus/share_plus.dart';

class PlatformService {
  static bool get isMobile => !kIsWeb && (Platform.isAndroid || Platform.isIOS);
  static bool get isDesktop => !kIsWeb && (Platform.isWindows || Platform.isMacOS || Platform.isLinux);
  static bool get isAndroid => !kIsWeb && Platform.isAndroid;
  static bool get isIOS => !kIsWeb && Platform.isIOS;

  /// Share a local file using the platform's native share sheet (Android Intent / iOS UIActivityViewController).
  static Future<void> shareFile(String filePath, {String? subject, String? text}) async {
    final file = File(filePath);
    if (await file.exists()) {
      await Share.shareXFiles([XFile(filePath)], text: text, subject: subject);
    }
  }

  /// Share plain text or a link via native share sheet.
  static Future<void> shareText(String text, {String? subject}) async {
    await Share.share(text, subject: subject);
  }

  /// Open directory in system file manager (desktop) or fallback to sharing if file on mobile.
  static Future<void> openFolder(String path) async {
    if (isDesktop) {
      if (Platform.isWindows) {
        await Process.run('explorer', [path]);
      } else if (Platform.isMacOS) {
        await Process.run('open', [path]);
      } else {
        await Process.run('xdg-open', [path]);
      }
    } else if (isMobile) {
      final file = File(path);
      if (await file.exists()) {
        await shareFile(path);
      }
    }
  }

  /// Get the standard output storage directory for the active platform.
  static Future<String> getDefaultDownloadDirectory() async {
    if (isDesktop) {
      try {
        final dir = await getDownloadsDirectory();
        if (dir != null) return dir.path;
      } catch (_) {}
      if (Platform.environment['USERPROFILE'] != null) {
        return '${Platform.environment['USERPROFILE']}\\Downloads';
      }
      return Directory.current.path;
    } else {
      try {
        final dir = await getApplicationDocumentsDirectory();
        return dir.path;
      } catch (_) {
        return Directory.current.path;
      }
    }
  }
}
