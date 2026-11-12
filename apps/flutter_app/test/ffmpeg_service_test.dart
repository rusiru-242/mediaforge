import 'package:flutter_test/flutter_test.dart';
import 'package:mediaforge_desktop/core/services/ffmpeg_service.dart';

void main() {
  group('FfmpegService Tests', () {
    test('parseProgress correctly calculates progress percentage', () {
      // 10 seconds total duration, elapsed 5 seconds
      const line = 'frame=  120 fps= 60 q=28.0 size=    1024kB time=00:00:05.00 bitrate=1677.7kbits/s speed=2.0x';
      final progress = FfmpegService.parseProgress(line, 10.0);

      expect(progress, isNotNull);
      expect(progress, closeTo(0.5, 0.01));
    });

    test('parseProgress handles fractional seconds and clamps to 1.0', () {
      const line = 'frame=  500 fps= 60 q=28.0 size=    4096kB time=00:01:05.50 bitrate=1677.7kbits/s speed=2.0x';
      // 60 seconds total, 65.5s elapsed -> should clamp to 1.0
      final progress = FfmpegService.parseProgress(line, 60.0);

      expect(progress, isNotNull);
      expect(progress, equals(1.0));
    });

    test('parseProgress returns null when time match is missing', () {
      const line = 'Output #0, mp4, to output.mp4: Metadata: encoder: Lavf61.1.101';
      final progress = FfmpegService.parseProgress(line, 100.0);

      expect(progress, isNull);
    });

    test('parseProgress returns null when total duration is zero or null', () {
      const line = 'frame=  100 time=00:00:10.00';
      expect(FfmpegService.parseProgress(line, 0.0), isNull);
      expect(FfmpegService.parseProgress(line, null), isNull);
    });

    test('FfmpegService custom executable configuration', () {
      final service = FfmpegService();
      expect(service.ffmpegPath, equals('ffmpeg'));
      expect(service.ffprobePath, equals('ffprobe'));

      service.configure(ffmpegPath: 'C:\\custom\\ffmpeg.exe', ffprobePath: 'C:\\custom\\ffprobe.exe');
      expect(service.ffmpegPath, equals('C:\\custom\\ffmpeg.exe'));
      expect(service.ffprobePath, equals('C:\\custom\\ffprobe.exe'));
    });
  });
}
