import 'dart:async';
import 'dart:io';
import '../errors/app_exceptions.dart';
import '../../shared/models/media_job.dart';
import '../../shared/models/media_info.dart';
import 'ffmpeg_service.dart';

class ConversionService {
  final FfmpegService _ffmpeg;
  final Map<String, Process> _activeProcesses = {};

  ConversionService(this._ffmpeg);

  Future<void> convertVideo({
    required MediaJob job,
    required MediaInfo sourceInfo,
    required String targetFormat,
    String? resolution,
    String? videoBitrate,
    String? audiobitrate,
    String? frameRate,
    void Function(double progress)? onProgress,
    void Function(String error)? onError,
    void Function()? onComplete,
  }) async {
    final args = _buildVideoArgs(
      targetFormat: targetFormat,
      resolution: resolution,
      videoBitrate: videoBitrate,
      audioBitrate: audiobitrate,
      frameRate: frameRate,
    );

    await _runConversion(
      job: job,
      args: args,
      totalDuration: sourceInfo.durationSeconds,
      onProgress: onProgress,
      onError: onError,
      onComplete: onComplete,
    );
  }

  Future<void> convertAudio({
    required MediaJob job,
    required MediaInfo sourceInfo,
    required String targetFormat,
    String? bitrate,
    String? sampleRate,
    String? channels,
    void Function(double progress)? onProgress,
    void Function(String error)? onError,
    void Function()? onComplete,
  }) async {
    final args = _buildAudioArgs(
      targetFormat: targetFormat,
      bitrate: bitrate,
      sampleRate: sampleRate,
      channels: channels,
    );

    await _runConversion(
      job: job,
      args: args,
      totalDuration: sourceInfo.durationSeconds,
      onProgress: onProgress,
      onError: onError,
      onComplete: onComplete,
    );
  }

  Future<void> convertImage({
    required MediaJob job,
    required String targetFormat,
    int? quality,
    int? width,
    int? height,
    void Function(double progress)? onProgress,
    void Function(String error)? onError,
    void Function()? onComplete,
  }) async {
    final args = _buildImageArgs(
      targetFormat: targetFormat,
      quality: quality,
      width: width,
      height: height,
    );

    await _runConversion(
      job: job,
      args: args,
      totalDuration: null,
      onProgress: onProgress,
      onError: onError,
      onComplete: onComplete,
    );
  }

  Future<void> _runConversion({
    required MediaJob job,
    required List<String> args,
    double? totalDuration,
    void Function(double progress)? onProgress,
    void Function(String error)? onError,
    void Function()? onComplete,
  }) async {
    final available = await _ffmpeg.isAvailable();
    if (!available) {
      throw const FfmpegNotFoundException();
    }

    try {
      final process = await _ffmpeg.startConversion(
        inputPath: job.inputPath,
        outputPath: job.outputPath,
        additionalArgs: args,
      );

      _activeProcesses[job.id] = process;

      final stderrBuffer = StringBuffer();
      process.stderr.transform(const SystemEncoding().decoder).listen((line) {
        stderrBuffer.write(line);
        if (onProgress != null) {
          final progress = FfmpegService.parseProgress(line, totalDuration);
          if (progress != null) {
            onProgress(progress);
          }
        }
      });

      final exitCode = await process.exitCode;
      _activeProcesses.remove(job.id);

      if (exitCode == 0) {
        onProgress?.call(1.0);
        onComplete?.call();
      } else {
        final stderr = stderrBuffer.toString();
        final lastLines = stderr.split('\n').reversed.take(5).join('\n');
        onError?.call('FFmpeg exited with code $exitCode: $lastLines');
      }
    } catch (e) {
      _activeProcesses.remove(job.id);
      if (e is AppException) rethrow;
      throw ConversionException('Conversion failed: $e');
    }
  }

  Future<bool> cancelJob(String jobId) async {
    final process = _activeProcesses[jobId];
    if (process != null) {
      final success = process.kill();
      _activeProcesses.remove(jobId);
      return success;
    }
    return false;
  }

  Future<void> cancelAll() async {
    final jobIds = _activeProcesses.keys.toList();
    for (final id in jobIds) {
      await cancelJob(id);
    }
  }

  List<String> _buildVideoArgs({
    required String targetFormat,
    String? resolution,
    String? videoBitrate,
    String? audioBitrate,
    String? frameRate,
  }) {
    final args = <String>[];
    switch (targetFormat.toLowerCase()) {
      case 'mp4':
        args.addAll(['-c:v', 'libx264', '-c:a', 'aac', '-movflags', '+faststart']);
        break;
      case 'webm':
        args.addAll(['-c:v', 'libvpx-vp9', '-c:a', 'libopus']);
        break;
      case 'mkv':
        args.addAll(['-c:v', 'libx264', '-c:a', 'aac']);
        break;
      case 'mov':
        args.addAll(['-c:v', 'libx264', '-c:a', 'aac']);
        break;
      case 'avi':
        args.addAll(['-c:v', 'mpeg4', '-c:a', 'mp3']);
        break;
      default:
        args.addAll(['-c:v', 'libx264', '-c:a', 'aac']);
    }
    if (resolution != null && resolution != 'Original') {
      final resFormatted = resolution.replaceAll('x', ':');
      args.addAll(['-vf', 'scale=$resFormatted:force_original_aspect_ratio=decrease']);
    }
    if (videoBitrate != null && videoBitrate.isNotEmpty) {
      args.addAll(['-b:v', videoBitrate]);
    }
    if (audioBitrate != null && audioBitrate.isNotEmpty) {
      args.addAll(['-b:a', audioBitrate]);
    }
    if (frameRate != null && frameRate != 'Original') {
      args.addAll(['-r', frameRate]);
    }
    return args;
  }

  List<String> _buildAudioArgs({
    required String targetFormat,
    String? bitrate,
    String? sampleRate,
    String? channels,
  }) {
    final args = <String>['-vn'];
    switch (targetFormat.toLowerCase()) {
      case 'mp3':
        args.addAll(['-c:a', 'libmp3lame']);
        break;
      case 'aac':
        args.addAll(['-c:a', 'aac']);
        break;
      case 'flac':
        args.addAll(['-c:a', 'flac']);
        break;
      case 'wav':
        args.addAll(['-c:a', 'pcm_s16le']);
        break;
      case 'm4a':
        args.addAll(['-c:a', 'aac']);
        break;
      case 'ogg':
        args.addAll(['-c:a', 'libvorbis']);
        break;
      default:
        args.addAll(['-c:a', 'libmp3lame']);
    }
    if (bitrate != null && bitrate.isNotEmpty) {
      args.addAll(['-b:a', bitrate]);
    }
    if (sampleRate != null && sampleRate != 'Original') {
      args.addAll(['-ar', sampleRate]);
    }
    if (channels != null) {
      switch (channels) {
        case 'Mono':
          args.addAll(['-ac', '1']);
          break;
        case 'Stereo':
          args.addAll(['-ac', '2']);
          break;
      }
    }
    return args;
  }

  List<String> _buildImageArgs({
    required String targetFormat,
    int? quality,
    int? width,
    int? height,
  }) {
    final args = <String>[];
    if (width != null || height != null) {
      final w = width?.toString() ?? '-1';
      final h = height?.toString() ?? '-1';
      args.addAll(['-vf', 'scale=$w:$h:flags=lanczos']);
    }
    switch (targetFormat.toLowerCase()) {
      case 'jpg':
      case 'jpeg':
        if (quality != null) {
          args.addAll(['-q:v', ((100 - quality) ~/ 10 + 1).clamp(1, 31).toString()]);
        }
        break;
      case 'webp':
        if (quality != null) {
          args.addAll(['-q:v', quality.toString()]);
        }
        break;
      case 'png':
        args.addAll(['-c:v', 'png']);
        break;
      case 'avif':
        args.addAll(['-c:v', 'libaom-av1']);
        if (quality != null) {
          args.addAll(['-crf', ((100 - quality) ~/ 2).clamp(0, 63).toString()]);
        }
        break;
    }
    return args;
  }
}
