import 'dart:async';
import 'dart:io';
import 'dart:isolate';
import 'package:archive/archive_io.dart';
import 'package:path/path.dart' as p;
import 'package:uuid/uuid.dart';
import 'media_api.dart';
import 'local_media_engine.dart';

/// An in-process facade preserving the existing UI contract. No network calls.
class LocalMediaApi implements MediaApi {
  final LocalMediaEngine engine;
  bool _closed = false;
  Isolate? _zip;
  Completer<void>? _zipDone;
  LocalMediaJob? analysisJob;
  LocalMediaApi({LocalMediaEngine? engine})
      : engine = engine ?? LocalMediaEngine.shared;
  @override
  void close() {
    _closed = true;
    _zip?.kill(priority: Isolate.immediate);
    if (_zipDone?.isCompleted == false) {
      _zipDone!.completeError(const LocalOperationCancelled());
    }
    final owner = analysisJob;
    if (owner != null) {
      owner.cancelled = true;
      for (final process in owner.processes.toList()) {
        unawaited(engine.kill(process));
      }
    }
  }

  @override
  Future<Json> upload(String path, {void Function(double)? onProgress}) =>
      engine.register(path);
  @override
  Future<BackendJob> createJob(String endpoint, Json body) =>
      engine.create(body, download: endpoint == '/downloads');
  @override
  Future<BackendJob> job(String id) async =>
      engine.jobs[id]?.snapshot ??
      (throw const BackendException('Local job no longer exists.', 404));
  @override
  Future<BackendJob> cancel(String id) async {
    await engine.cancel(id);
    return job(id);
  }

  @override
  Stream<BackendJob> watch(String id,
      {Duration interval = const Duration(milliseconds: 200),
      Duration limit = const Duration(hours: 2)}) async* {
    final elapsed = Stopwatch()..start();
    while (!_closed && elapsed.elapsed < limit) {
      final value = await job(id);
      yield value;
      if (value.terminal) return;
      await Future<void>.delayed(interval);
    }
    if (_closed) throw const LocalOperationCancelled();
    await cancel(id);
    throw const BackendException('Local processing exceeded the time limit.');
  }

  @override
  Future<Json> request(String endpoint,
      {Json? body, String method = 'GET'}) async {
    final parts = Uri.parse(endpoint).pathSegments;
    if (endpoint == '/health') {
      return {
        'status': 'UP',
        'service': 'MediaForge local engine',
        'tools': await engine.tools.verify(includeExtractor: false)
      };
    }
    if (endpoint == '/formats') {
      return {
        'video': LocalMediaEngine.videoFormats,
        'audio': LocalMediaEngine.audioFormats,
        'image': LocalMediaEngine.imageFormats
      };
    }
    if (parts.length == 3 && parts[0] == 'files' && parts[2] == 'metadata') {
      final file = engine.files[parts[1]];
      if (file == null || !await File(file['path'] as String).exists()) {
        throw const BackendException(
            'Local output expired. Export again.', 404);
      }
      return Map<String, dynamic>.from(file);
    }
    if (endpoint == '/conversions/estimate-size') {
      final duration = body?['sourceDuration'] as num?;
      final bitrate = body?['audioBitrate'] as num?;
      if (body?['outputFormat'] == 'mp3' &&
          duration != null &&
          duration > 0 &&
          bitrate != null &&
          bitrate > 0) {
        final bytes = duration * bitrate * 1000 / 8;
        return {
          'estimatedBytes': (bytes * 1.02).round(),
          'minBytes': bytes.round(),
          'maxBytes': (bytes * 1.05).round(),
          'formattedRange':
              '${(bytes / 1048576).toStringAsFixed(1)}–${(bytes * 1.05 / 1048576).toStringAsFixed(1)} MB',
          'estimationMethod':
              'Audio bitrate × source duration, with up to 5% container overhead'
        };
      }
      return {
        'estimatedBytes': 0,
        'formattedRange': 'Unavailable before encoding',
        'estimationMethod': 'Variable source/encoding bitrate'
      };
    }
    if (endpoint == '/conversions/batch') {
      final requests = body?['items'];
      if (requests is! List || requests.isEmpty || requests.length > 100) {
        throw const BackendException(
            'Choose between 1 and 100 files for a batch.');
      }
      final jobs = <Json>[];
      final batchId = const Uuid().v4();
      engine.batches[batchId] = [];
      for (final request in requests) {
        final job =
            await engine.create(Map<String, dynamic>.from(request as Map));
        engine.batches[batchId]!.add(job.id);
        jobs.add(
            {'id': job.id, 'status': job.status, 'progress': job.progress});
      }
      return {'batchId': batchId, 'jobs': jobs, 'totalJobs': jobs.length};
    }
    if (endpoint == '/downloads/metadata') {
      analysisJob = LocalMediaJob(const Uuid().v4(), {});
      engine.analyses.add(analysisJob!);
      try {
        return await analyzeSource(engine, '${body?['url']}', analysisJob!);
      } finally {
        engine.analyses.remove(analysisJob);
      }
    }
    throw BackendException('Unsupported local operation: $endpoint');
  }

  @override
  Future<void> save(String endpoint, String destination,
      {void Function(double?)? onProgress}) async {
    final target = p.normalize(File(destination).absolute.path);
    final install = p.dirname(engine.tools.directory);
    if (p.isWithin(install.toLowerCase(), target.toLowerCase())) {
      throw const BackendException(
          'Choose an export folder outside the application installation.');
    }
    final partial = File('$target.${const Uuid().v4()}.part');
    final parts = Uri.parse(endpoint).pathSegments;
    try {
      await partial.parent.create(recursive: true);
      if (parts.length == 4 &&
          parts[0] == 'conversions' &&
          parts[1] == 'batch' &&
          parts[3] == 'zip') {
        final ids = engine.batches[parts[2]];
        if (ids == null || ids.isEmpty) {
          throw const BackendException(
              'This local batch no longer exists.', 404);
        }
        final sources = <List<String>>[];
        for (var i = 0; i < ids.length; i++) {
          final job = engine.jobs[ids[i]];
          if (job?.status != 'COMPLETED') {
            throw const BackendException(
                'All batch files must finish successfully before ZIP export.');
          }
          final file = engine.files[job!.outputId]!;
          sources.add(
              [file['path'] as String, '${i + 1}_${file['originalFilename']}']);
        }
        final port = ReceivePort();
        _zipDone = Completer<void>();
        final subscription = port.listen((value) {
          if (value == 'done') {
            if (!_zipDone!.isCompleted) _zipDone!.complete();
          } else if (value is double) {
            onProgress?.call(value);
          } else if (value is String && !_zipDone!.isCompleted) {
            _zipDone!.completeError(BackendException(value));
          }
        });
        try {
          await Future.wait<void>([
            Isolate.spawn(_zipFiles, [port.sendPort, partial.path, sources])
                .then((worker) {
              _zip = worker;
              if (_closed) worker.kill();
            }),
            _zipDone!.future,
          ]);
        } finally {
          _zip?.kill();
          _zip = null;
          await subscription.cancel();
          port.close();
        }
      } else if (parts.length == 3 &&
          parts[0] == 'files' &&
          parts[2] == 'download') {
        final metadata = await request('/files/${parts[1]}/metadata');
        final input = File(metadata['path'] as String);
        if (p.equals(input.absolute.path, target)) {
          throw const BackendException(
              'Choose a different filename from the source file.');
        }
        final length = await input.length();
        var written = 0;
        final sink = partial.openWrite();
        try {
          await sink.addStream(input.openRead().map((bytes) {
            if (_closed) throw const LocalOperationCancelled();
            written += bytes.length;
            onProgress?.call(written / length);
            return bytes;
          }));
          await sink.flush();
        } finally {
          try {
            await sink.close();
          } catch (_) {
            if (!_closed) rethrow;
          }
        }
        if (written != length) {
          throw const BackendException('Incomplete file copy.');
        }
      } else {
        throw const BackendException('Invalid output file.');
      }
      if (_closed) throw const LocalOperationCancelled();
      if (await partial.length() == 0) {
        throw const BackendException('Empty output cannot be saved.');
      }
      await partial.rename(target);
    } finally {
      if (await partial.exists()) await partial.delete();
    }
  }
}

void _zipFiles(List<dynamic> data) async {
  final port = data[0] as SendPort;
  final encoder = ZipFileEncoder();
  try {
    encoder.create(data[1] as String, level: ZipFileEncoder.store);
    final files = (data[2] as List).cast<List<String>>();
    var done = 0, total = 0;
    for (final file in files) {
      total += await File(file[0]).length();
    }
    for (final file in files) {
      await encoder.addFile(File(file[0]), file[1]);
      done += await File(file[0]).length();
      port.send(done / total);
    }
    await encoder.close();
    port.send('done');
  } catch (e) {
    try {
      await encoder.close();
    } catch (_) {}
    port.send('ZIP creation failed: $e');
  }
}
