import 'dart:convert';
import 'dart:io';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:mediaforge_desktop/core/services/backend_api.dart';
import 'package:mediaforge_desktop/features/desktop/desktop_downloader.dart';
import 'package:mediaforge_desktop/features/desktop/desktop_task.dart';

void main() {
  test('Rate limited polling resumes the same job without creating another',
      () async {
    var calls = 0;
    final api = BackendApi(client: MockClient((request) async {
      expect(request.method, 'GET');
      expect(request.url.path, endsWith('/jobs/existing'));
      calls++;
      return calls == 1
          ? http.Response('{"message":"Too many requests"}', 429)
          : http.Response(
              '{"id":"existing","status":"COMPLETED","progress":100,"outputFileId":"file"}',
              200);
    }));
    final values = await api.watch('existing').toList();
    expect(calls, 2);
    expect(values.single.completed, isTrue);
    api.close();
  });
  test('Expired desktop output becomes exportable again instead of stale Save',
      () async {
    final directory =
        await Directory.systemTemp.createTemp('mediaforge-expiry-test-');
    addTearDown(() => directory.delete(recursive: true));
    final task = DesktopTask(
        apiFactory: () => BackendApi(
            client: MockClient((_) async =>
                http.Response('{"message":"File expired"}', 404))));
    task.job = const BackendJob('job', 'COMPLETED', 100, 'expired', null);
    task.output = {'originalFilename': 'video.mp4'};
    await task.save('/files/expired/download', '${directory.path}/video.mp4');
    expect(task.job, isNull);
    expect(task.output, isNull);
    expect(task.error, contains('expired'));
    expect(task.busy, false);
    expect(directory.listSync(), isEmpty);
    task.dispose();
  });
  test('A completed job without an output file cannot become save-ready',
      () async {
    final task = DesktopTask(
        apiFactory: () => BackendApi(
            client: MockClient((_) async => http.Response(
                '{"id":"job","status":"COMPLETED","progress":100}', 200))));
    await task
        .run((api) => api.createJob('/conversions', {'outputFormat': 'mp4'}));
    expect(task.output, isNull);
    expect(task.error, contains('no verified output'));
    expect(task.savedPath, isNull);
    task.dispose();
  });
  for (final entry in {
    'https://youtu.be/abc': 'YouTube',
    'https://www.youtube.com/shorts/abc': 'YouTube',
    'https://vm.tiktok.com/abc': 'TikTok',
    'https://fb.watch/abc': 'Facebook',
    'https://www.instagram.com/reels/abc/': 'Instagram',
    'https://x.com/user/status/1': 'X / Twitter',
    'https://example.org/movie.mp4': 'Direct Media URL',
    'https://youtube.com.evil.example/a': 'Direct Media URL',
    'file:///C:/private': null,
  }.entries) {
    test('Platform recognition: ${entry.key}',
        () => expect(detectPlatform(entry.key), entry.value));
  }
  test('Job wrapper parsing requires real identity and terminal state', () {
    final job = BackendJob.fromJson({
      'job': {
        'id': 'real-id',
        'status': 'COMPLETED',
        'progress': 100,
        'outputFileId': 'file-id'
      }
    });
    expect(job.id, 'real-id');
    expect(job.outputFileId, 'file-id');
    expect(job.completed, true);
    expect(() => BackendJob.fromJson({'status': 'COMPLETED'}),
        throwsA(isA<BackendException>()));
  });
  test('JSON request sends actual selected format, resolution and type',
      () async {
    final api = BackendApi(client: MockClient((req) async {
      expect(req.url.toString(), 'http://localhost:8081/api/v1/downloads');
      expect(jsonDecode(req.body), {
        'selectedFormat': 'mp4',
        'selectedQuality': '720p',
        'mediaType': 'video'
      });
      return http.Response(
          jsonEncode({
            'job': {'id': 'job', 'status': 'PENDING', 'progress': 0}
          }),
          201);
    }));
    expect(
        (await api.createJob('/downloads', {
          'selectedFormat': 'mp4',
          'selectedQuality': '720p',
          'mediaType': 'video'
        }))
            .id,
        'job');
    api.close();
  });
  test('Preserves backend errors and rejects malformed success', () async {
    final api = BackendApi(
        client: MockClient(
            (_) async => http.Response('{"message":"Login required"}', 403)));
    await expectLater(
        api.request('/downloads'),
        throwsA(isA<BackendException>()
            .having((e) => e.message, 'message', 'Login required')));
    api.close();
    final invalid = BackendApi(
        client: MockClient((_) async => http.Response('<html/>', 200)));
    await expectLater(
        invalid.request('/health'), throwsA(isA<BackendException>()));
    invalid.close();
  });
  test('Polling follows backend progress and ends at completion', () async {
    var index = 0;
    final api = BackendApi(
        client: MockClient((_) async => http.Response(
            jsonEncode({
              'id': 'job',
              'status': index++ == 0 ? 'PROCESSING' : 'COMPLETED',
              'progress': index == 1 ? 42 : 100
            }),
            200)));
    final jobs = await api.watch('job', interval: Duration.zero).toList();
    expect(jobs.map((j) => j.progress), [42, 100]);
    api.close();
  });
  test('Cancellation uses the real POST endpoint', () async {
    final api = BackendApi(client: MockClient((req) async {
      expect(req.method, 'POST');
      expect(req.url.path, '/api/v1/jobs/job/cancel');
      return http.Response(
          '{"id":"job","status":"CANCELLED","progress":0}', 200);
    }));
    expect((await api.cancel('job')).status, 'CANCELLED');
    api.close();
  });
  test('Streaming save replaces output only after complete transfer', () async {
    final directory =
        await Directory.systemTemp.createTemp('mediaforge-save-test-');
    addTearDown(() => directory.delete(recursive: true));
    final target = File('${directory.path}/output.mp4');
    await target.writeAsString('old');
    final api = BackendApi(
        client:
            MockClient((_) async => http.Response.bytes([1, 2, 3, 4], 200)));
    await api.save('/files/output/download', target.path);
    expect(await target.readAsBytes(), [1, 2, 3, 4]);
    expect(directory.listSync().length, 1);
    api.close();
  });
  test('Missing file never overwrites destination and removes partial output',
      () async {
    final directory =
        await Directory.systemTemp.createTemp('mediaforge-save-error-');
    addTearDown(() => directory.delete(recursive: true));
    final target = File('${directory.path}/output.mp4');
    await target.writeAsString('keep');
    final api = BackendApi(
        client: MockClient(
            (_) async => http.Response('{"message":"File expired"}', 404)));
    await expectLater(api.save('/files/output/download', target.path),
        throwsA(isA<BackendException>()));
    expect(await target.readAsString(), 'keep');
    expect(directory.listSync().length, 1);
    api.close();
  });
}
