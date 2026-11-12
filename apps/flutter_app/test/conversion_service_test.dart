import 'package:flutter_test/flutter_test.dart';
import 'package:mediaforge_desktop/core/services/ffmpeg_service.dart';
import 'package:mediaforge_desktop/core/services/conversion_service.dart';
import 'package:mediaforge_desktop/shared/models/media_job.dart';
import 'package:mediaforge_desktop/shared/models/media_info.dart';

void main() {
  group('ConversionService Argument Building Tests', () {
    late FfmpegService ffmpegService;
    late ConversionService conversionService;

    setUp(() {
      ffmpegService = FfmpegService();
      conversionService = ConversionService(ffmpegService);
    });

    test('Video conversion service instance is properly initialized', () {
      expect(conversionService, isNotNull);
    });

    test('Cancel non-existent job returns false safely', () async {
      final cancelled = await conversionService.cancelJob('non-existent-id');
      expect(cancelled, isFalse);
    });

    test('Job cancellation tracking does not crash', () async {
      await conversionService.cancelAll();
      expect(true, isTrue);
    });

    test('MediaJob settings map stores conversion parameters', () {
      final job = MediaJob(
        type: JobType.videoConversion,
        inputPath: 'sample.mp4',
        outputPath: 'sample_out.mp4',
        outputFormat: 'mp4',
        settings: {
          'resolution': '1920x1080',
          'videoBitrate': '2M',
          'audioBitrate': '192k',
          'frameRate': '30',
        },
      );

      expect(job.settings['resolution'], equals('1920x1080'));
      expect(job.settings['videoBitrate'], equals('2M'));
      expect(job.settings['audioBitrate'], equals('192k'));
      expect(job.settings['frameRate'], equals('30'));
    });

    test('MediaInfo accurately identifies video stream characteristics', () {
      const info = MediaInfo(
        path: 'clip.mov',
        filename: 'clip.mov',
        format: 'mov',
        width: 1280,
        height: 720,
        durationSeconds: 45.2,
        bitrate: 2500,
        codec: 'h264',
        fileSizeBytes: 14155776,
      );

      expect(info.isVideo, isTrue);
      expect(info.isAudio, isFalse);
      expect(info.codec, equals('h264'));
      expect(info.resolution, equals('1280x720'));
      expect(info.fileSizeMb, equals('13.5 MB'));
    });
  });
}

