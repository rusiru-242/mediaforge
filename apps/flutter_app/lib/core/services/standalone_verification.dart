import 'dart:convert';
import 'dart:io';
import 'dart:typed_data';
import 'package:path/path.dart' as p;
import 'package:url_launcher/url_launcher.dart';
import 'bundled_tools.dart';
import 'local_media_engine.dart';
import 'local_media_api.dart';
import 'media_api.dart';

/// Runs inside the installed EXE, not the development Dart VM. Generates owned
/// fixtures and writes auditable results to an explicitly chosen writable folder.
Future<bool> verifyStandalone(String folder, {bool verifyShell = false}) async {
  final root = Directory(folder).absolute;
  final engine = LocalMediaEngine();
  if (p.equals(p.dirname(engine.tools.directory).toLowerCase(),
          root.path.toLowerCase()) ||
      p.isWithin(p.dirname(engine.tools.directory).toLowerCase(),
          root.path.toLowerCase())) {
    return false;
  }
  await root.create(recursive: true);
  final api = LocalMediaApi(engine: engine);
  final report = <String, dynamic>{
    'standalone': true,
    'executable': Platform.resolvedExecutable,
    'checks': <String, dynamic>{},
    'success': false
  };
  final checks = report['checks'] as Map<String, dynamic>;
  final inputs = <File>[];
  Future<void> check(String name, Future<void> Function() action) async {
    try {
      await action();
      checks[name] = {'passed': true};
    } catch (e) {
      checks[name] = {'passed': false, 'error': e.toString()};
    }
  }

  Future<void> require(bool value, String error) async {
    if (!value) throw StateError(error);
  }

  Future<String> export(String file, String format, Json options) async {
    final input = await api.upload(file);
    final job = await api.createJob('/conversions',
        {'inputFileId': input['id'], 'outputFormat': format, ...options});
    final history = <double>[];
    await for (final value
        in api.watch(job.id, interval: const Duration(milliseconds: 100))) {
      history.add(value.progress);
    }
    final done = await api.job(job.id);
    if (!done.completed) throw StateError(done.error ?? done.status);
    final destination = p.join(root.path, 'verified-${job.id}.$format');
    await api.save('/files/${done.outputFileId}/download', destination);
    await engine.probe(destination);
    report['lastProgressSamples'] = history;
    return destination;
  }

  try {
    await check('no_backend_listener', () async {
      Socket? connection;
      try {
        connection = await Socket.connect('127.0.0.1', 8081,
            timeout: const Duration(seconds: 1));
      } on SocketException {/* Expected: no service on 8081. */} finally {
        connection?.destroy();
      }
      await require(
          connection == null, 'Stop Spring Boot before offline verification.');
    });
    await check('packaged_tools', () async {
      report['toolVersions'] = await engine.tools.verify();
    });
    await check('no_global_ffmpeg_or_java_on_path', () async {
      final where = p.join(Platform.environment['SystemRoot'] ?? r'C:\Windows',
          'System32', 'where.exe');
      for (final name in ['java', 'ffmpeg', 'ffprobe']) {
        final result = await Process.run(where, [name]);
        await require(result.exitCode != 0,
            '$name is still visible on PATH; use an isolated PATH for this check.');
      }
    });
    final video = p.join(root.path, 'සිංහල source with spaces.mp4');
    final image = p.join(root.path, 'owned image.png');
    inputs.addAll([File(video), File(image)]);
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
      '-threads',
      '2',
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
    await check('video_unicode_trim_crop_resize_mp4', () async {
      final path = await export(video, 'mp4', {
        'startTime': .5,
        'endTime': 2.5,
        'cropX': 160,
        'cropY': 0,
        'cropWidth': 960,
        'cropHeight': 720,
        'targetResolution': '360p'
      });
      final data = await engine.probe(path);
      final streams = (data['streams'] as List).cast<Map>();
      await require(
          streams.any(
                  (s) => s['codec_type'] == 'video' && s['height'] == 360) &&
              streams.any((s) => s['codec_type'] == 'audio'),
          'MP4 stream verification failed.');
      await require(
          (double.parse(data['format']['duration'].toString()) - 2).abs() < .2,
          'Trim duration did not match.');
    });
    for (final format in ['mp3', 'm4a', 'wav']) {
      await check('audio_$format', () async {
        final path = await export(video, format, {
          'startTime': .5,
          'endTime': 2.5,
          'volume': .7,
          'fadeInDuration': .2,
          'fadeOutDuration': .3,
          'audioEffects': ['echo', 'bass'],
          'audioEffectLevels': {'echo': 25, 'bass': 40}
        });
        final data = await engine.probe(path);
        await require(
            (data['streams'] as List).every((s) => s['codec_type'] == 'audio'),
            'Audio export contained video.');
      });
    }
    await check('image_filter_crop_rotate_resize_webp', () async {
      final path = await export(image, 'webp', {
        'cropX': 80,
        'cropY': 0,
        'cropWidth': 480,
        'cropHeight': 480,
        'imageWidth': 240,
        'imageHeight': 240,
        'imageRotation': 90,
        'saturation': 1.45,
        'warmth': .3,
        'imageQuality': 75
      });
      final info = await engine.probe(path);
      await require(
          info['streams'][0]['width'] == 240 &&
              info['streams'][0]['height'] == 240,
          'Image resize failed.');
    });
    await check('mixed_batch_zip', () async {
      final a = await api.upload(video), b = await api.upload(image);
      final batch = await api.request('/conversions/batch',
          body: {
            'items': [
              {
                'inputFileId': a['id'],
                'outputFormat': 'mp4',
                'targetResolution': '360p'
              },
              {
                'inputFileId': b['id'],
                'outputFormat': 'jpg',
                'imageQuality': 50
              }
            ]
          },
          method: 'POST');
      for (final job in batch['jobs'] as List) {
        final done = await api.watch(job['id'] as String).last;
        await require(done.completed, done.error ?? 'Batch failed.');
      }
      final zip = p.join(root.path, 'verified-batch.zip');
      await api.save('/conversions/batch/${batch['batchId']}/zip', zip);
      final bytes = await File(zip).openRead(0, 2).first;
      await require(bytes[0] == 80 && bytes[1] == 75, 'Invalid ZIP signature.');
    });
    await check('process_cancellation', () async {
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
      await require((await api.cancel(job.id)).status == 'CANCELLED',
          'Cancellation was not confirmed.');
    });
    await check('invalid_input_and_missing_tools', () async {
      bool rejected = false;
      try {
        await api.upload(p.join(root.path, 'missing.mp4'));
      } catch (_) {
        rejected = true;
      }
      await require(rejected, 'Missing input was accepted.');
      rejected = false;
      try {
        await BundledTools(directory: p.join(root.path, 'missing-tools'))
            .verify();
      } catch (_) {
        rejected = true;
      }
      await require(rejected, 'Missing tools were not reported.');
    });
    await check('large_256MiB_streaming_save', () async {
      final file =
          await File(video).copy(p.join(root.path, 'large source.mp4'));
      inputs.add(file);
      final size = 256 * 1024 * 1024, old = await file.length();
      final header = ByteData(8)
        ..setUint32(0, size - old, Endian.big)
        ..setUint32(4, 0x66726565, Endian.big);
      final handle = await file.open(mode: FileMode.append);
      await handle.writeFrom(header.buffer.asUint8List());
      await handle.truncate(size);
      await handle.close();
      await engine.probe(file.path);
      final input = await api.upload(file.path);
      final destination = p.join(root.path, 'large saved.mp4');
      await api.save('/files/${input['id']}/download', destination);
      await require(await File(destination).length() == size,
          'Large file was truncated.');
      await File(destination).delete();
    });
    if (verifyShell) {
      await check('open_output_folder', () async {
        await require(
            await launchUrl(root.uri, mode: LaunchMode.externalApplication),
            'Windows did not accept the output folder.');
      });
      final output = root
          .listSync()
          .whereType<File>()
          .where((f) => f.path.endsWith('.webp'))
          .firstOrNull;
      if (output != null) {
        await check('open_exported_file', () async {
          await require(
              await launchUrl(output.uri, mode: LaunchMode.externalApplication),
              'Windows did not accept the output file.');
        });
      }
    }
    report['success'] =
        checks.values.every((v) => (v as Map)['passed'] == true);
  } catch (e) {
    report['fatalError'] = e.toString();
  } finally {
    api.close();
    await engine.shutdown();
    for (final file in inputs) {
      if (await file.exists()) await file.delete();
    }
    await File(p.join(root.path, 'verification.json'))
        .writeAsString(const JsonEncoder.withIndent('  ').convert(report));
  }
  return report['success'] == true;
}
