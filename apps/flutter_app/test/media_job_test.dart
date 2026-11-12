import 'package:flutter_test/flutter_test.dart';
import 'package:mediaforge_desktop/shared/models/media_job.dart';
import 'package:mediaforge_desktop/shared/models/media_info.dart';

void main() {
  group('MediaJob Model Tests', () {
    test('creates job with generated UUID and default queued status', () {
      final job = MediaJob(
        type: JobType.videoConversion,
        inputPath: 'C:\\Videos\\sample.mp4',
        outputPath: 'C:\\Videos\\sample_converted.webm',
        outputFormat: 'webm',
      );

      expect(job.id, isNotEmpty);
      expect(job.status, equals(JobStatus.queued));
      expect(job.statusLabel, equals('Queued'));
      expect(job.progress, equals(0.0));
      expect(job.inputFilename, equals('sample.mp4'));
      expect(job.outputFilename, equals('sample_converted.webm'));
    });

    test('correct status labels', () {
      final job = MediaJob(
        type: JobType.audioConversion,
        inputPath: '/home/user/song.wav',
        outputPath: '/home/user/song.mp3',
        outputFormat: 'mp3',
      );

      job.status = JobStatus.processing;
      expect(job.statusLabel, equals('Processing'));

      job.status = JobStatus.completed;
      expect(job.statusLabel, equals('Completed'));

      job.status = JobStatus.failed;
      expect(job.statusLabel, equals('Failed'));

      job.status = JobStatus.cancelled;
      expect(job.statusLabel, equals('Cancelled'));
    });
  });

  group('MediaInfo Model Tests', () {
    test('computes media types correctly', () {
      const videoInfo = MediaInfo(
        path: 'test.mp4',
        filename: 'test.mp4',
        format: 'mp4',
        width: 1920,
        height: 1080,
        durationSeconds: 125.5,
        bitrate: 4500,
        fileSizeBytes: 20971520, // 20 MB
      );

      expect(videoInfo.isVideo, isTrue);
      expect(videoInfo.isAudio, isFalse);
      expect(videoInfo.resolution, equals('1920x1080'));
      expect(videoInfo.duration, equals('02:05'));
      expect(videoInfo.fileSizeMb, equals('20.0 MB'));

      const audioInfo = MediaInfo(
        path: 'audio.flac',
        filename: 'audio.flac',
        format: 'flac',
        sampleRate: 44100,
        channels: 2,
        durationSeconds: 70.0,
        fileSizeBytes: 10485760,
      );

      expect(audioInfo.isAudio, isTrue);
      expect(audioInfo.isVideo, isFalse);
      expect(audioInfo.duration, equals('01:10'));

      const imageInfo = MediaInfo(
        path: 'photo.png',
        filename: 'photo.png',
        format: 'png',
        fileSizeBytes: 1048576,
      );

      expect(imageInfo.isImage, isTrue);
      expect(imageInfo.isVideo, isFalse);
      expect(imageInfo.isAudio, isFalse);
    });
  });
}
