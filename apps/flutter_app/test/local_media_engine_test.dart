import 'dart:io';
import 'dart:typed_data';
import 'package:flutter_test/flutter_test.dart';
import 'package:mediaforge_desktop/core/services/bundled_tools.dart';
import 'package:mediaforge_desktop/core/services/local_media_api.dart';
import 'package:mediaforge_desktop/core/services/local_media_engine.dart';
import 'package:mediaforge_desktop/core/services/media_api.dart';

void main() {
  late Directory temp;
  late LocalMediaEngine engine;
  late LocalMediaApi api;
  late String video, image;
  setUpAll(() async {
    temp = await Directory.systemTemp.createTemp('mediaforge-local-tests-');
    engine = LocalMediaEngine(
        tools: BundledTools(
            directory: Directory('vendor/windows/tools').absolute.path),
        cache: Directory('${temp.path}/cache'));
    api = LocalMediaApi(engine: engine);
    await engine.tools.verify();
    video = '${temp.path}/සිංහල clip with spaces.mp4';
    image = '${temp.path}/image with spaces.png';
    await engine.run(engine.tools.ffmpeg, [
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
      '-c:a',
      'aac',
      '-shortest',
      video
    ]);
    await engine.run(engine.tools.ffmpeg, [
      '-y',
      '-v',
      'error',
      '-f',
      'lavfi',
      '-i',
      'testsrc2=size=640x480',
      '-frames:v',
      '1',
      image
    ]);
  });
  tearDownAll(() async {
    api.close();
    await engine.shutdown();
    await temp.delete(recursive: true);
  });
  Future<BackendJob> convert(String input, Json options) async {
    final source = await api.upload(input);
    final job = await api
        .createJob('/conversions', {'inputFileId': source['id'], ...options});
    final done = await api
        .watch(job.id, interval: const Duration(milliseconds: 50))
        .last;
    expect(done.status, 'COMPLETED', reason: done.error);
    return done;
  }

  test('Bundled tools verify without any Java or server check', () async {
    expect((await api.request('/health'))['status'], 'UP');
  });
  for (final format in ['webm','mov','mkv','avi','flv']) {
    test('Verified $format video output with audio',()async {
      final done=await convert(video,{'outputFormat':format,'startTime':.5,'endTime':1.5,'targetResolution':'360p'});
      final file=await api.request('/files/${done.outputFileId}/metadata');final data=await engine.probe(file['path'] as String);
      expect((data['streams'] as List).any((s)=>s['codec_type']=='video'),true);expect((data['streams'] as List).any((s)=>s['codec_type']=='audio'),true);
    });
  }
  test('256 MiB valid MP4 streams to disk, and cancelled copies clean up',()async {
    final large=await File(video).copy('${temp.path}/large padded.mp4');
    final length=await large.length(), target=256*1024*1024;
    final header=ByteData(8)..setUint32(0,target-length,Endian.big)..setUint32(4,0x66726565,Endian.big);
    final handle=await large.open(mode:FileMode.append);await handle.writeFrom(header.buffer.asUint8List());await handle.truncate(target);await handle.close();
    await engine.probe(large.path);
    final source=await api.upload(large.path);final output='${temp.path}/large saved.mp4';
    var updates=0;await api.save('/files/${source['id']}/download',output,onProgress:(_)=>updates++);
    expect(await File(output).length(),target);expect(updates,greaterThan(2));
    final cancelled=LocalMediaApi(engine:engine);final failed='${temp.path}/cancelled copy.mp4';
    await expectLater(cancelled.save('/files/${source['id']}/download',failed,onProgress:(_)=>cancelled.close()),throwsA(isA<LocalOperationCancelled>()));
    expect(await File(failed).exists(),false);expect(temp.listSync().where((f)=>f.path.endsWith('.part')),isEmpty);
    await File(output).delete();await large.delete();
  });
  test('Unicode video trim/crop/resize and verified MP4 with audio', () async {
    final done = await convert(video, {
      'outputFormat': 'mp4',
      'startTime': .5,
      'endTime': 2.5,
      'cropX': 160,
      'cropY': 0,
      'cropWidth': 960,
      'cropHeight': 720,
      'targetResolution': '360p'
    });
    final file = await api.request('/files/${done.outputFileId}/metadata');
    final info = await engine.probe(file['path'] as String);
    expect(
        (info['streams'] as List)
            .any((s) => s['codec_type'] == 'video' && s['height'] == 360),
        true);
    expect(
        (info['streams'] as List).any((s) => s['codec_type'] == 'audio'), true);
    final output = '${temp.path}/saved සිංහල.mp4';
    await api.save('/files/${done.outputFileId}/download', output);
    expect(await File(output).length(), file['fileSize']);
  });
  for (final format in ['mp3', 'm4a', 'wav', 'aac', 'flac', 'ogg']) {
    test('Real $format audio-only export, fades and adjustable effects',
        () async {
      final done = await convert(video, {
        'outputFormat': format,
        'startTime': .5,
        'endTime': 2.5,
        'volume': .75,
        'audioEffects': ['reverb', 'bass'],
        'audioEffectLevels': {'reverb': 25, 'bass': 40},
        'fadeInDuration': .2,
        'fadeOutDuration': .3
      });
      final file = await api.request('/files/${done.outputFileId}/metadata');
      final info = await engine.probe(file['path'] as String);
      expect((info['streams'] as List).every((s) => s['codec_type'] == 'audio'),
          true);
    });
  }
  for (final format in ['webp', 'jpg', 'png', 'avif']) {
    test('Real $format image crop/resize/filter/rotate', () async {
      final done = await convert(image, {
        'outputFormat': format,
        'cropX': 80,
        'cropY': 0,
        'cropWidth': 480,
        'cropHeight': 480,
        'imageWidth': 240,
        'imageHeight': 240,
        'imageRotation': 90,
        'imageQuality': 75,
        'saturation': 1.45,
        'warmth': .3
      });
      final file = await api.request('/files/${done.outputFileId}/metadata');
      final info = await engine.probe(file['path'] as String);
      expect(info['streams'][0]['width'], 240);
      expect(info['streams'][0]['height'], 240);
    });
  }
  test('Cut intervals remove actual duration', () async {
    final done = await convert(video, {
      'outputFormat': 'mp4',
      'startTime': .2,
      'endTime': 2.8,
      'removeSegments': [
        {'start': 1.0, 'end': 2.0}
      ]
    });
    final file = await api.request('/files/${done.outputFileId}/metadata');
    final info = await engine.probe(file['path'] as String);
    expect(
        double.parse(info['format']['duration'].toString()), closeTo(1.6, .2));
  });
  test('Cancellation terminates a real process and removes incomplete output',
      () async {
    final input = await api.upload(video);
    final job = await api.createJob('/conversions', {
      'inputFileId': input['id'],
      'outputFormat': 'webm',
      'targetResolution': '1080p'
    });
    while (engine.jobs[job.id]!.processes.isEmpty &&
        !engine.jobs[job.id]!.snapshot.terminal) {
      await Future<void>.delayed(const Duration(milliseconds: 10));
    }
    expect((await api.cancel(job.id)).status, 'CANCELLED');
    while (engine.jobs[job.id]!.processes.isNotEmpty) {
      await Future<void>.delayed(const Duration(milliseconds: 10));
    }
    expect(engine.jobs[job.id]!.outputId, isNull);
  });
  test('Invalid input and an oversized sparse file are rejected', () async {
    await expectLater(api.upload('${temp.path}/missing.mp4'),
        throwsA(isA<BackendException>()));
    final file = File('${temp.path}/oversized.mp4');
    final handle = await file.open(mode: FileMode.write);
    await handle.truncate(2 * 1024 * 1024 * 1024 + 1);
    await handle.close();
    await expectLater(api.upload(file.path), throwsA(isA<BackendException>()));
    await file.delete();
  });
  test('Missing bundled FFmpeg gives a repair message, not PATH fallback',
      () async {
    final missing = BundledTools(directory: '${temp.path}/missing-tools');
    await expectLater(
        missing.verify(),
        throwsA(isA<StateError>()
            .having((e) => e.message, 'message', contains('missing'))));
  });
  test('Local jobs and a real ZIP work with HTTP clients forbidden', () async {
    await HttpOverrides.runZoned(() async {
      final a = await api.upload(video), b = await api.upload(image);
      final batch =
          await api.request('/conversions/batch', method: 'POST', body: {
        'items': [
          {
            'inputFileId': a['id'],
            'outputFormat': 'mp4',
            'targetResolution': '360p'
          },
          {'inputFileId': b['id'], 'outputFormat': 'jpg', 'imageQuality': 50}
        ]
      });
      for (final j in batch['jobs'] as List) {
        expect(
            (await api
                    .watch(j['id'] as String,
                        interval: const Duration(milliseconds: 50))
                    .last)
                .completed,
            true);
      }
      final path = '${temp.path}/batch.zip';
      await api.save('/conversions/batch/${batch['batchId']}/zip', path);
      expect(await File(path).openRead(0, 2).first, [80, 75]);
    },
        createHttpClient: (_) =>
            throw StateError('Networking is forbidden in local workflows.'));
  });
}
