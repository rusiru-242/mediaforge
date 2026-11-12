import 'dart:io';
import 'dart:convert';
import 'package:flutter/foundation.dart';
import 'package:path/path.dart' as p;
import '../errors/app_exceptions.dart';
import '../../shared/models/media_info.dart';

class FfmpegService {
  String _ffmpegPath = 'ffmpeg';
  String _ffprobePath = 'ffprobe';

  String get ffmpegPath => _ffmpegPath;
  String get ffprobePath => _ffprobePath;

  void configure({String? ffmpegPath, String? ffprobePath}) {
    if (ffmpegPath != null && ffmpegPath.isNotEmpty) _ffmpegPath = ffmpegPath;
    if (ffprobePath != null && ffprobePath.isNotEmpty) _ffprobePath = ffprobePath;
  }

  Future<bool> isAvailable() async {
    try {
      final result = await Process.run(_ffmpegPath, ['-version']);
      return result.exitCode == 0;
    } catch (_) {
      return false;
    }
  }

  Future<bool> isFfprobeAvailable() async {
    try {
      final result = await Process.run(_ffprobePath, ['-version']);
      return result.exitCode == 0;
    } catch (_) {
      return false;
    }
  }

  Future<MediaInfo> probeFile(String filePath) async {
    final file = File(filePath);
    if (!await file.exists()) throw FileException('File not found: $filePath');

    try {
      final result = await Process.run(_ffprobePath, [
        '-v', 'quiet',
        '-print_format', 'json',
        '-show_format',
        '-show_streams',
        filePath,
      ]);

      if (result.exitCode != 0) throw FileException('FFprobe failed: ${result.stderr}');

      final json = jsonDecode(result.stdout as String) as Map<String, dynamic>;
      final format = json['format'] as Map<String, dynamic>? ?? {};
      final streams = (json['streams'] as List<dynamic>? ?? []).cast<Map<String, dynamic>>();

      final videoStream = streams.firstWhere(
        (s) => s['codec_type'] == 'video',
        orElse: () => {},
      );
      final audioStream = streams.firstWhere(
        (s) => s['codec_type'] == 'audio',
        orElse: () => {},
      );

      final formatName = (format['format_name'] as String? ?? '').split(',').first;
      final ext = p.extension(filePath).replaceFirst('.', '').toLowerCase();
      final fileSize = await file.length();
      final durationStr = format['duration'] as String?;
      final duration = durationStr != null ? double.tryParse(durationStr) : null;
      final bitrateStr = format['bit_rate'] as String?;
      final bitrate = bitrateStr != null ? int.tryParse(bitrateStr) : null;

      return MediaInfo(
        path: filePath,
        filename: p.basename(filePath),
        format: ext.isNotEmpty ? ext : formatName,
        width: videoStream['width'] as int?,
        height: videoStream['height'] as int?,
        durationSeconds: duration,
        bitrate: bitrate != null ? bitrate ~/ 1000 : null,
        sampleRate: audioStream['sample_rate'] != null
            ? int.tryParse(audioStream['sample_rate'].toString())
            : null,
        channels: audioStream['channels'] as int?,
        codec: videoStream.isNotEmpty
            ? videoStream['codec_name'] as String?
            : audioStream['codec_name'] as String?,
        fileSizeBytes: fileSize,
      );
    } catch (e) {
      if (e is AppException) rethrow;
      throw FileException('Failed to probe file: $e');
    }
  }

  Future<Process> startConversion({
    required String inputPath,
    required String outputPath,
    required List<String> additionalArgs,
    bool overwrite = true,
  }) async {
    final args = [
      '-i', inputPath,
      ...additionalArgs,
      if (overwrite) '-y',
      outputPath,
    ];

    debugPrint('FFmpeg command: $_ffmpegPath ${args.join(' ')}');

    return Process.start(_ffmpegPath, args);
  }

  /// Parse FFmpeg stderr progress output: "time=HH:MM:SS.ms"
  static double? parseProgress(String line, double? totalDuration) {
    final timeMatch = RegExp(r'time=(\d+):(\d+):(\d+\.\d+)').firstMatch(line);
    if (timeMatch == null || totalDuration == null || totalDuration <= 0) return null;
    final h = int.parse(timeMatch.group(1)!);
    final m = int.parse(timeMatch.group(2)!);
    final s = double.parse(timeMatch.group(3)!);
    final elapsed = h * 3600 + m * 60 + s;
    return (elapsed / totalDuration).clamp(0.0, 1.0);
  }
}
