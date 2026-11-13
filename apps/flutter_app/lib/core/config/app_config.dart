import 'dart:io';
import 'package:path/path.dart' as p;

class VideoPresetConfig {
  final String id;
  final String label;
  final String resolution;
  final String videoBitrate;
  final String audioBitrate;

  const VideoPresetConfig({
    required this.id,
    required this.label,
    required this.resolution,
    required this.videoBitrate,
    required this.audioBitrate,
  });
}

class AudioPresetConfig {
  final String id;
  final String label;
  final String bitrate;
  final String sampleRate;

  const AudioPresetConfig({
    required this.id,
    required this.label,
    required this.bitrate,
    required this.sampleRate,
  });
}

class ImagePresetConfig {
  final String id;
  final String label;
  final int quality;

  const ImagePresetConfig({
    required this.id,
    required this.label,
    required this.quality,
  });
}

class AppConfig {
  static const String appName = 'MediaForge';
  static const String appVersion = '1.0.0';
  static const String backendBaseUrl = 'http://localhost:8081/api/v1';
  static const int maxConcurrentJobs = 3;
  static const int downloadTimeoutSeconds = 300;

  static const List<String> supportedVideoFormats = ['mp4', 'mkv', 'webm', 'mov', 'avi'];
  static const List<String> supportedAudioFormats = ['mp3', 'wav', 'aac', 'flac', 'm4a', 'ogg'];
  static const List<String> supportedImageFormats = ['jpg', 'jpeg', 'png', 'webp', 'avif'];

  static const List<String> videoInputFormats = ['mp4', 'mkv', 'webm', 'mov', 'avi', 'flv', 'wmv', 'm4v'];
  static const List<String> audioInputFormats = ['mp3', 'wav', 'aac', 'flac', 'm4a', 'ogg', 'wma', 'opus'];
  static const List<String> imageInputFormats = ['jpg', 'jpeg', 'png', 'webp', 'gif', 'bmp', 'tiff', 'avif'];
  static const int maxFileSizeMb = 2048;

  static const List<VideoPresetConfig> videoPresets = [
    VideoPresetConfig(
      id: 'original',
      label: 'Original Quality (Source)',
      resolution: 'Original',
      videoBitrate: '',
      audioBitrate: '192k',
    ),
    VideoPresetConfig(
      id: 'high',
      label: 'High Quality (1080p)',
      resolution: '1920x1080',
      videoBitrate: '2500k',
      audioBitrate: '256k',
    ),
    VideoPresetConfig(
      id: 'balanced',
      label: 'Balanced (720p - Recommended)',
      resolution: '1280x720',
      videoBitrate: '1200k',
      audioBitrate: '192k',
    ),
    VideoPresetConfig(
      id: 'small',
      label: 'Small File Size (480p)',
      resolution: '854x480',
      videoBitrate: '600k',
      audioBitrate: '128k',
    ),
  ];

  static const List<AudioPresetConfig> audioPresets = [
    AudioPresetConfig(
      id: 'high',
      label: 'High Fidelity (320 kbps, 48 kHz)',
      bitrate: '320k',
      sampleRate: '48000',
    ),
    AudioPresetConfig(
      id: 'standard',
      label: 'Standard (192 kbps, 44.1 kHz - Recommended)',
      bitrate: '192k',
      sampleRate: '44100',
    ),
    AudioPresetConfig(
      id: 'small',
      label: 'Voice / Compact (128 kbps, 44.1 kHz)',
      bitrate: '128k',
      sampleRate: '44100',
    ),
  ];

  static const List<ImagePresetConfig> imagePresets = [
    ImagePresetConfig(
      id: 'high',
      label: 'High Quality (90% - Near Lossless)',
      quality: 90,
    ),
    ImagePresetConfig(
      id: 'balanced',
      label: 'Balanced (75% - Recommended)',
      quality: 75,
    ),
    ImagePresetConfig(
      id: 'compression',
      label: 'Maximum Compression (50%)',
      quality: 50,
    ),
  ];

  static String detectMediaType(String filename) {
    final ext = p.extension(filename).replaceFirst('.', '').toLowerCase();
    if (videoInputFormats.contains(ext)) return 'video';
    if (audioInputFormats.contains(ext)) return 'audio';
    if (imageInputFormats.contains(ext)) return 'image';
    return 'unknown';
  }

  static List<String> getCompatibleOutputFormats(String filename) {
    final type = detectMediaType(filename);
    switch (type) {
      case 'video':
        return ['mp4', 'webm', 'mkv', 'mov', 'avi', 'mp3', 'wav', 'aac', 'flac'];
      case 'audio':
        return ['mp3', 'wav', 'aac', 'flac', 'm4a', 'ogg'];
      case 'image':
        return ['webp', 'jpg', 'png', 'avif'];
      default:
        return ['mp4', 'mp3', 'jpg'];
    }
  }

  static String getDefaultOutputFormat(String filename) {
    final type = detectMediaType(filename);
    switch (type) {
      case 'video':
        return 'mp4';
      case 'audio':
        return 'mp3';
      case 'image':
        return 'webp';
      default:
        return 'mp4';
    }
  }

  /// Generates a collision-free output file path.
  /// If `baseName.ext` exists in [directory], appends ` (1)`, ` (2)`, etc.
  static String getUniqueOutputPath(String directory, String baseName, String extension) {
    final cleanExt = extension.startsWith('.') ? extension.substring(1) : extension;
    String targetPath = p.join(directory, '$baseName.$cleanExt');
    int counter = 1;
    while (File(targetPath).existsSync()) {
      targetPath = p.join(directory, '$baseName ($counter).$cleanExt');
      counter++;
    }
    return targetPath;
  }
}
