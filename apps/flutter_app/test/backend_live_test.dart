import 'dart:convert';
import 'dart:io';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:mediaforge_desktop/core/services/backend_api.dart';

/// Generated, owned fixtures only. Requires the existing backend on port 8081.
void main() {
  const enabled = bool.fromEnvironment('MEDIAFORGE_LIVE');
  group('Real desktop HTTP integration', () {
    late Directory temp;
    late String source, picture;
    late BackendApi api;
    Future<Json> probe(String file) async {
      final result = await Process.run('ffprobe', [
        '-v',
        'error',
        '-show_streams',
        '-show_format',
        '-of',
        'json',
        file
      ]);
      expect(result.exitCode, 0, reason: result.stderr.toString());
      return jsonDecode(result.stdout.toString()) as Json;
    }

    Future<BackendJob> complete(BackendJob job) async {
      final finalJob = await api
          .watch(job.id,
              interval: const Duration(milliseconds: 200),
              limit: const Duration(minutes: 3))
          .last;
      expect(finalJob.status, 'COMPLETED', reason: finalJob.error);
      expect(finalJob.outputFileId, isNotEmpty);
      return finalJob;
    }

    Future<BackendJob> convert(
        String input, String format, Json options) async {
      final upload = await api.upload(input);
      expect(upload['id'] ?? upload['fileId'], isNotEmpty);
      return complete(await api.createJob('/conversions', {
        'inputFileId': upload['id'] ?? upload['fileId'],
        'outputFormat': format,
        ...options
      }));
    }

    setUpAll(() async {
      temp = await Directory.systemTemp.createTemp('mediaforge-desktop-live-');
      api = BackendApi();
      expect((await api.request('/health'))['status'], 'UP');
      source = '${temp.path}/owned-fixture.mp4';
      picture = '${temp.path}/owned-image.png';
      final video = await Process.run('ffmpeg', [
        '-y',
        '-v',
        'error',
        '-f',
        'lavfi',
        '-i',
        'testsrc2=size=1280x720:rate=24:duration=3',
        '-f',
        'lavfi',
        '-i',
        'sine=frequency=440:duration=3',
        '-c:v',
        'libx264',
        '-preset',
        'ultrafast',
        '-pix_fmt',
        'yuv420p',
        '-c:a',
        'aac',
        '-shortest',
        source
      ]);
      expect(video.exitCode, 0, reason: video.stderr.toString());
      final image = await Process.run('ffmpeg', [
        '-y',
        '-v',
        'error',
        '-f',
        'lavfi',
        '-i',
        'testsrc2=size=640x480',
        '-frames:v',
        '1',
        picture
      ]);
      expect(image.exitCode, 0, reason: image.stderr.toString());
    });
    tearDownAll(() async {
      api.close();
      await temp.delete(recursive: true);
    });

    test('Video upload, trim, crop, real progress, MP4 download and FFprobe',
        () async {
      final job = await convert(source, 'mp4', {
        'mediaType': 'video',
        'startTime': .5,
        'endTime': 2.5,
        'targetResolution': '360p',
        'cropX': 160,
        'cropY': 0,
        'cropWidth': 960,
        'cropHeight': 720,
        'videoBitrate': '600k'
      });
      final path = '${temp.path}/verified-video.mp4';
      final metadata = await api.request('/files/${job.outputFileId}/metadata');
      expect(metadata['mimeType'], 'video/mp4');
      await api.save('/files/${job.outputFileId}/download', path);
      final data = await probe(path);
      final streams = (data['streams'] as List).cast<Map>();
      expect(
          streams.any((s) => s['codec_type'] == 'video' && s['height'] == 360),
          true);
      expect(streams.any((s) => s['codec_type'] == 'audio'), true);
      expect(
          double.parse(data['format']['duration'].toString()), closeTo(2, .2));
    });
    for (final format in ['mp3', 'm4a', 'wav']) {
      test('Audio export $format, fade/effects, save and stream verification',
          () async {
        final job = await convert(source, format, {
          'mediaType': 'audio',
          'startTime': .5,
          'endTime': 2.5,
          'audioBitrate': 192,
          'volume': .7,
          'fadeInDuration': .2,
          'fadeOutDuration': .3,
          'audioEffects': ['reverb', 'bass'],
          'audioEffectLevels': {'reverb': 35, 'bass': 45}
        });
        final output = '${temp.path}/verified-audio.$format';
        await api.save('/files/${job.outputFileId}/download', output);
        final data = await probe(output);
        final streams = (data['streams'] as List).cast<Map>();
        expect(streams.any((s) => s['codec_type'] == 'audio'), true);
        expect(streams.any((s) => s['codec_type'] == 'video'), false);
        expect(double.parse(data['format']['duration'].toString()),
            closeTo(2, .25));
      });
    }
    test('Image crop, filter, rotate, resize and WebP delivery', () async {
      final job = await convert(picture, 'webp', {
        'mediaType': 'image',
        'cropX': 80,
        'cropY': 0,
        'cropWidth': 480,
        'cropHeight': 480,
        'imageWidth': 240,
        'imageHeight': 240,
        'imageQuality': 85,
        'imageRotation': 90,
        'brightness': .03,
        'contrast': 1.12,
        'saturation': 1.45,
        'warmth': .3
      });
      final output = '${temp.path}/verified-image.webp';
      await api.save('/files/${job.outputFileId}/download', output);
      final data = await probe(output);
      expect(data['streams'][0]['width'], 240);
      expect(data['streams'][0]['height'], 240);
    });
    test('Mixed batch jobs, per-file options, ZIP content type and signature',
        () async {
      final video = await api.upload(source), image = await api.upload(picture);
      final batch =
          await api.request('/conversions/batch', method: 'POST', body: {
        'items': [
          {
            'inputFileId': video['id'],
            'outputFormat': 'mp4',
            'mediaType': 'video',
            'targetResolution': '480p',
            'videoBitrate': '600k'
          },
          {
            'inputFileId': image['id'],
            'outputFormat': 'jpg',
            'mediaType': 'image',
            'imageQuality': 50
          },
        ]
      });
      for (final job in batch['jobs'] as List) {
        await complete(
            BackendJob.fromJson(Map<String, dynamic>.from(job as Map)));
      }
      final endpoint = '/conversions/batch/${batch['batchId']}/zip';
      final response = await http.get(api.uri(endpoint));
      expect(response.statusCode, 200);
      expect(response.headers['content-type'], contains('zip'));
      final output = '${temp.path}/verified-batch.zip';
      await api.save(endpoint, output);
      expect((await File(output).openRead(0, 2).first), [80, 75]);
    });
    test('Estimate uses actual duration; missing output reports 404', () async {
      final estimate = await api
          .request('/conversions/estimate-size', method: 'POST', body: {
        'estimationContext': 'download',
        'mediaType': 'audio',
        'outputFormat': 'mp3',
        'sourceDuration': 3,
        'audioBitrate': 192
      });
      expect(estimate['estimatedBytes'] as num, greaterThan(70000));
      await expectLater(
          api.request('/files/00000000-0000-0000-0000-000000000000/metadata'),
          throwsA(
              isA<BackendException>().having((e) => e.status, 'status', 404)));
    });
    test('Cancellation reaches backend and a terminal state', () async {
      final upload = await api.upload(source);
      final job = await api.createJob('/conversions', {
        'inputFileId': upload['id'],
        'outputFormat': 'webm',
        'mediaType': 'video',
        'targetResolution': '1080p'
      });
      final result = await api.cancel(job.id);
      expect(result.status, 'CANCELLED');
    });
  }, skip: !enabled);
}
