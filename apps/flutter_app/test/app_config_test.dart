import 'dart:io';
import 'package:flutter_test/flutter_test.dart';
import 'package:mediaforge_desktop/core/config/app_config.dart';

void main() {
  group('AppConfig Presets and Formatting', () {
    test('defines presets for video, audio, and image', () {
      expect(AppConfig.videoPresets.isNotEmpty, true);
      expect(AppConfig.audioPresets.isNotEmpty, true);
      expect(AppConfig.imagePresets.isNotEmpty, true);

      final highVideo = AppConfig.videoPresets.firstWhere((p) => p.id == 'high');
      expect(highVideo.resolution, '1920x1080');

      final highAudio = AppConfig.audioPresets.firstWhere((p) => p.id == 'high');
      expect(highAudio.bitrate, '320k');

      final balancedImg = AppConfig.imagePresets.firstWhere((p) => p.id == 'balanced');
      expect(balancedImg.quality, 75);
    });

    test('detects media type from filename correctly', () {
      expect(AppConfig.detectMediaType('video.mp4'), 'video');
      expect(AppConfig.detectMediaType('movie.mkv'), 'video');
      expect(AppConfig.detectMediaType('song.mp3'), 'audio');
      expect(AppConfig.detectMediaType('track.wav'), 'audio');
      expect(AppConfig.detectMediaType('photo.jpg'), 'image');
      expect(AppConfig.detectMediaType('graphic.png'), 'image');
      expect(AppConfig.detectMediaType('file.unknown'), 'unknown');
    });

    test('returns compatible output formats', () {
      final videoOutputs = AppConfig.getCompatibleOutputFormats('sample.mp4');
      expect(videoOutputs.contains('mp4'), true);
      expect(videoOutputs.contains('webm'), true);
      expect(videoOutputs.contains('mp3'), true); // Audio extraction

      final audioOutputs = AppConfig.getCompatibleOutputFormats('sample.wav');
      expect(audioOutputs.contains('mp3'), true);
      expect(audioOutputs.contains('flac'), true);
      expect(audioOutputs.contains('mp4'), false);

      final imgOutputs = AppConfig.getCompatibleOutputFormats('sample.png');
      expect(imgOutputs.contains('webp'), true);
      expect(imgOutputs.contains('jpg'), true);
      expect(imgOutputs.contains('mp3'), false);
    });

    test('generates unique collision-free output paths', () {
      final tempDir = Directory.systemTemp.createTempSync('mediaforge_test_');
      try {
        final path1 = AppConfig.getUniqueOutputPath(tempDir.path, 'output', 'mp4');
        expect(path1.endsWith('output.mp4'), true);

        // Create file to simulate collision
        File(path1).writeAsStringSync('dummy content');

        final path2 = AppConfig.getUniqueOutputPath(tempDir.path, 'output', 'mp4');
        expect(path2.endsWith('output (1).mp4'), true);
      } finally {
        tempDir.deleteSync(recursive: true);
      }
    });
  });
}
