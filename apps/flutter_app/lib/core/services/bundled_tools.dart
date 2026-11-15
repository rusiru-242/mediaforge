import 'dart:io';
import 'package:path/path.dart' as p;

/// Never searches PATH or a development directory on an installed Windows PC.
class BundledTools {
  final String directory;
  BundledTools({String? directory})
      : directory = directory ??
            p.join(p.dirname(Platform.resolvedExecutable), 'tools');
  String get ffmpeg => p.join(directory, 'ffmpeg.exe');
  String get ffprobe => p.join(directory, 'ffprobe.exe');
  String get extractor => p.join(directory, 'yt-dlp.exe');
  Future<Map<String, String>> verify({bool includeExtractor = true}) async {
    final result = <String, String>{};
    for (final entry in {
      'FFmpeg': ffmpeg,
      'FFprobe': ffprobe,
      if (includeExtractor) 'Extractor': extractor
    }.entries) {
      if (!await File(entry.value).exists()) {
        throw StateError(
            '${entry.key} is missing from the application. Repair or reinstall MediaForge.');
      }
      final process = await Process.start(
          entry.value, [entry.key == 'Extractor' ? '--version' : '-version'],
          runInShell: false);
      final output =
          process.stdout.transform(const SystemEncoding().decoder).join();
      final errors = process.stderr.drain<void>();
      try {
        if (await process.exitCode.timeout(const Duration(seconds: 15)) != 0) {
          throw StateError(
              '${entry.key} could not start. Repair the application.');
        }
        await errors;
        result[entry.key] = (await output).split('\n').first.trim();
      } finally {
        process.kill();
      }
    }
    return result;
  }
}
