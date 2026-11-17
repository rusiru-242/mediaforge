import 'dart:async';
import 'dart:io';
import 'package:path/path.dart' as p;
import 'bundled_tools.dart';

/// Render with the complete bundled FFmpeg, not libmpv's reduced filter build.
class DesktopAudioPreview {
  final BundledTools tools;
  DesktopAudioPreview({BundledTools? tools}) : tools = tools ?? BundledTools();
  Process? _process;
  Directory? _directory;
  Future<Directory>? _creatingDirectory;
  int _generation = 0;
  bool _closed = false;

  void cancel() {
    _generation++;
    _process?.kill();
  }

  Future<String?> render(
      String source, Map<String, int> effects, double duration) async {
    cancel();
    final generation = _generation;
    final filters = <String>[];
    for (final name in ['reverb', 'echo', 'bass', 'treble', 'warmth']) {
      final level = (effects[name] ?? 0).clamp(0, 100) / 100;
      if (level == 0) continue;
      filters.add(switch (name) {
        'reverb' =>
          'aecho=${1 - .2 * level}:${1 - .12 * level}:40|70|100:${.25 * level}|${.18 * level}|${.12 * level}',
        'echo' => 'aecho=${1 - .2 * level}:${1 - .1 * level}:180:${.3 * level}',
        'bass' => 'bass=g=${6 * level}:f=200',
        'treble' => 'treble=g=${5 * level}:f=3000',
        _ => 'lowpass=f=${20000 - 15000 * level}',
      });
    }
    if (_closed || filters.isEmpty) return null;
    _directory = await (_creatingDirectory ??=
        Directory.systemTemp.createTemp('mediaforge-preview-'));
    if (_closed) {
      await close();
      return null;
    }
    if (_closed || generation != _generation) return null;
    final output = '${_directory!.path}/effects-$generation.flac';
    filters.add('atrim=duration=$duration');
    final process = await Process.start(
        tools.ffmpeg,
        [
          '-hide_banner',
          '-v',
          'error',
          '-nostdin',
          '-y',
          '-protocol_whitelist',
          'file,pipe',
          '-i',
          source,
          '-map',
          '0:a:0',
          '-vn',
          '-af',
          filters.join(','),
          '-c:a',
          'flac',
          output,
        ],
        runInShell: false);
    if (_closed || generation != _generation) {
      process.kill();
    } else {
      _process = process;
    }
    final stdout = process.stdout.drain<void>();
    final stderr = process.stderr.drain<void>();
    try {
      final code = await process.exitCode.timeout(const Duration(minutes: 5));
      await Future.wait([stdout, stderr]);
      if (_closed || generation != _generation) return null;
      if (code != 0 ||
          !await File(output).exists() ||
          await File(output).length() == 0) {
        throw StateError('Could not prepare audio effects preview.');
      }
      return output;
    } finally {
      process.kill();
      if (identical(_process, process)) _process = null;
    }
  }

  Future<void> releaseUnused(String? selected) async {
    final directory = _directory;
    if (directory == null || !await directory.exists()) return;
    await for (final file in directory.list()) {
      if (file is File &&
          (selected == null || !p.equals(file.path, selected))) {
        try {
          await file.delete();
        } on FileSystemException {/* Decoder still releasing. */}
      }
    }
  }

  /// Call after the player releases its external audio tracks.
  Future<void> close() async {
    _closed = true;
    final process = _process;
    cancel();
    if (process != null) {
      try {
        await process.exitCode.timeout(const Duration(seconds: 5));
      } on TimeoutException {
        process.kill();
      }
    }
    final directory = _directory;
    if (directory != null && await directory.exists()) {
      try {
        await directory.delete(recursive: true);
      } on FileSystemException {
        // Windows may still be releasing a decoder handle.
      }
    }
  }
}
