import 'package:flutter_test/flutter_test.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:mediaforge_desktop/core/services/settings_service.dart';

void main() {
  group('SettingsService Tests', () {
    late SharedPreferences prefs;
    late SettingsService service;

    setUp(() async {
      SharedPreferences.setMockInitialValues({});
      prefs = await SharedPreferences.getInstance();
      service = SettingsService(prefs);
    });

    test('default settings values', () {
      expect(service.outputFolder, isEmpty);
      expect(service.defaultVideoFormat, equals('mp4'));
      expect(service.defaultAudioFormat, equals('mp3'));
      expect(service.defaultImageFormat, equals('jpg'));
      expect(service.defaultQuality, equals('High'));
      expect(service.themeMode, equals('system'));
      expect(service.maxConcurrentJobs, equals(3));
      expect(service.ffmpegPath, equals('ffmpeg'));
      expect(service.ffprobePath, equals('ffprobe'));
    });

    test('persists updated values', () async {
      await service.setOutputFolder('C:\\MediaForgeOutputs');
      await service.setDefaultVideoFormat('webm');
      await service.setDefaultAudioFormat('wav');
      await service.setDefaultImageFormat('webp');
      await service.setDefaultQuality('Medium');
      await service.setThemeMode('dark');
      await service.setMaxConcurrentJobs(4);
      await service.setFfmpegPath('/opt/homebrew/bin/ffmpeg');
      await service.setFfprobePath('/opt/homebrew/bin/ffprobe');

      expect(service.outputFolder, equals('C:\\MediaForgeOutputs'));
      expect(service.defaultVideoFormat, equals('webm'));
      expect(service.defaultAudioFormat, equals('wav'));
      expect(service.defaultImageFormat, equals('webp'));
      expect(service.defaultQuality, equals('Medium'));
      expect(service.themeMode, equals('dark'));
      expect(service.maxConcurrentJobs, equals(4));
      expect(service.ffmpegPath, equals('/opt/homebrew/bin/ffmpeg'));
      expect(service.ffprobePath, equals('/opt/homebrew/bin/ffprobe'));
    });
  });
}

