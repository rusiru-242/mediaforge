import 'dart:async';
import 'dart:collection';
import 'dart:convert';
import 'dart:io';
import 'dart:math' as math;
import 'package:path/path.dart' as p;
import 'package:uuid/uuid.dart';
import 'bundled_tools.dart';
import 'media_api.dart';
part 'local_extractor.dart';

class LocalOperationCancelled implements Exception {
  const LocalOperationCancelled();
  @override
  String toString() => 'Operation cancelled.';
}

class LocalMediaJob {
  final String id;
  final Json options;
  final bool download;
  String status = 'QUEUED', stage = 'Queued', error = '';
  double progress = 0;
  String? outputId;
  bool cancelled = false;
  final Set<Process> processes = {};
  LocalMediaJob(this.id, this.options, {this.download = false});
  BackendJob get snapshot =>
      BackendJob(id, status, progress, outputId, error.isEmpty ? null : error);
}

/// Native, in-process job management. No HTTP listener, Java or database.
class LocalMediaEngine {
  static final shared = LocalMediaEngine();
  final BundledTools tools;
  final Directory cache;
  final int concurrency;
  final Map<String, Json> files = {};
  final Map<String, LocalMediaJob> jobs = {};
  final Map<String, List<String>> batches = {};
  final Set<LocalMediaJob> analyses = {};
  final Queue<LocalMediaJob> _queue = Queue();
  int _running = 0;
  static const videoFormats = ['mp4', 'webm', 'mov', 'mkv', 'avi', 'flv'];
  static const audioFormats = ['mp3', 'm4a', 'wav', 'aac', 'flac', 'ogg'];
  static const imageFormats = ['webp', 'avif', 'jpg', 'png'];
  LocalMediaEngine(
      {BundledTools? tools, Directory? cache, this.concurrency = 2})
      : tools = tools ?? BundledTools(),
        cache = cache ??
            Directory(p.join(
                Platform.environment['LOCALAPPDATA'] ??
                    Directory.systemTemp.path,
                'MediaForge',
                'Cache',
                'jobs'));

  Future<Json> register(String path) async {
    final file = File(path);
    if (!await file.exists()) {
      throw const BackendException('The selected file no longer exists.');
    }
    final size = await file.length();
    if (size <= 0 || size > 2 * 1024 * 1024 * 1024) {
      throw const BackendException(
          'Choose a non-empty media file no larger than 2 GB.');
    }
    final id = const Uuid().v4();
    final value = <String, dynamic>{
      'id': id,
      'fileId': id,
      'path': p.normalize(file.absolute.path),
      'originalFilename': p.basename(path),
      'fileSize': size
    };
    files[id] = value;
    return value;
  }

  Future<Json> probe(String path, {LocalMediaJob? job}) async {
    final text = await run(
        tools.ffprobe,
        [
          '-v',
          'error',
          '-protocol_whitelist',
          'file,pipe',
          '-show_format',
          '-show_streams',
          '-of',
          'json',
          path
        ],
        job: job,
        timeout: const Duration(seconds: 30));
    final result = jsonDecode(text);
    if (result is! Map || result['streams'] is! List) {
      throw const BackendException('This file has no usable media streams.');
    }
    return Map<String, dynamic>.from(result);
  }

  Future<String> run(String executable, List<String> args,
      {LocalMediaJob? job,
      Duration timeout = const Duration(hours: 2),
      void Function(String)? onLine}) async {
    if (job?.cancelled == true) throw const LocalOperationCancelled();
    if (!await File(executable).exists()) {
      throw const BackendException(
          'A bundled processing tool is missing. Repair or reinstall MediaForge.');
    }
    final process = await Process.start(executable, args, runInShell: false);
    job?.processes.add(process);
    if (job?.cancelled == true) await kill(process);
    final output = StringBuffer(), errors = StringBuffer();
    final stdoutDone = process.stdout
        .transform(utf8.decoder)
        .transform(const LineSplitter())
        .forEach((line) {
      onLine?.call(line);
      if (output.length < 4 * 1024 * 1024) output.writeln(line);
    });
    final stderrDone = process.stderr.transform(utf8.decoder).forEach((line) {
      if (errors.length < 32000) errors.write(line);
    });
    try {
      final status = await process.exitCode.timeout(timeout);
      await Future.wait([stdoutDone, stderrDone]);
      if (job?.cancelled == true) throw const LocalOperationCancelled();
      if (status != 0) {
        final message = errors
            .toString()
            .replaceAll(RegExp(r'https?://\S+'), '[source]')
            .trim();
        throw BackendException(message.isEmpty
            ? 'Media processing failed (exit $status).'
            : message.substring(math.max(0, message.length - 1800)));
      }
      return output.toString();
    } on TimeoutException {
      await kill(process);
      throw const BackendException(
          'Media processing timed out. Try a shorter clip or a lower output quality.');
    } finally {
      job?.processes.remove(process);
    }
  }

  Future<void> kill(Process process) async {
    if (Platform.isWindows) {
      // Only a PID spawned and retained by this engine is supplied here.
      await Process.run(
          p.join(Platform.environment['SystemRoot'] ?? r'C:\Windows',
              'System32', 'taskkill.exe'),
          ['/PID', '${process.pid}', '/T', '/F']);
    } else {
      process.kill();
    }
  }

  Future<BackendJob> create(Json request, {bool download = false}) async {
    if (_queue.length >= 100) {
      throw const BackendException('The local processing queue is full.');
    }
    final format =
        '${request['outputFormat'] ?? request['selectedFormat'] ?? ''}'
            .toLowerCase();
    if (![...videoFormats, ...audioFormats, ...imageFormats].contains(format)) {
      throw const BackendException('Unsupported output format.');
    }
    if (!download && !files.containsKey(request['inputFileId'])) {
      throw const BackendException('Import a media file first.');
    }
    // A deep snapshot prevents settings changing underneath a queued job.
    final options =
        Map<String, dynamic>.from(jsonDecode(jsonEncode(request)) as Map);
    options['outputFormat'] = format;
    final job = LocalMediaJob(const Uuid().v4(), options, download: download);
    jobs[job.id] = job;
    _queue.add(job);
    _pump();
    return job.snapshot;
  }

  void _pump() {
    while (_running < concurrency && _queue.isNotEmpty) {
      final job = _queue.removeFirst();
      if (job.cancelled) continue;
      _running++;
      unawaited(_execute(job).whenComplete(() {
        _running--;
        _pump();
      }));
    }
  }

  Future<void> _execute(LocalMediaJob job) async {
    final directory = Directory(p.join(cache.path, job.id));
    try {
      await directory.create(recursive: true);
      if (job.cancelled) throw const LocalOperationCancelled();
      job.status = 'PROCESSING';
      job.stage = 'Inspecting source';
      String input;
      String sourceName;
      if (job.download) {
        final downloaded = await downloadSource(job, directory);
        input = downloaded['path'] as String;
        sourceName = downloaded['title'] as String;
      } else {
        final source = files[job.options['inputFileId']]!;
        input = source['path'] as String;
        sourceName =
            p.basenameWithoutExtension(source['originalFilename'] as String);
      }
      final info = await probe(input, job: job);
      final plan = buildPlan(
          input,
          p.join(directory.path, 'output.${job.options['outputFormat']}'),
          info,
          job.options);
      job.stage = 'Processing media';
      await run(
          tools.ffmpeg,
          [
            '-y',
            '-nostdin',
            '-v',
            'warning',
            '-protocol_whitelist',
            'file,pipe',
            ...plan.arguments,
            '-progress',
            'pipe:1',
            '-nostats'
          ],
          job: job, onLine: (line) {
        if (line.startsWith('out_time_us=') && plan.duration > 0) {
          final seconds = (double.tryParse(line.substring(12)) ?? 0) / 1000000;
          final base = job.download ? 50.0 : 0.0;
          job.progress =
              base + (seconds / plan.duration).clamp(0, 1) * (95 - base);
        }
      });
      job.stage = 'Verifying output';
      final verified = await probe(plan.output, job: job);
      await validateOutput(plan, verified);
      if (job.cancelled) throw const LocalOperationCancelled();
      final id = const Uuid().v4();
      final format = job.options['outputFormat'] as String;
      final suffix = job.download && plan.video
          ? ' (${(verified['streams'] as List).cast<Map>().firstWhere((s) => s['codec_type'] == 'video')['height']})'
          : '_converted';
      final name = '${safeName(sourceName)}$suffix.$format';
      final outputSize = await File(plan.output).length();
      if (job.cancelled) throw const LocalOperationCancelled();
      files[id] = {
        'id': id,
        'fileId': id,
        'path': plan.output,
        'originalFilename': name,
        'fileSize': outputSize,
        'mimeType': mime(format),
        'duration': plan.duration
      };
      job.outputId = id;
      job.progress = 100;
      job.status = 'COMPLETED';
      job.stage = 'Ready';
      // Remove source extraction fragments after a verified final output exists.
      await for (final entry in directory.list()) {
        if (entry is File && entry.path != plan.output) await entry.delete();
      }
    } catch (e) {
      job.status = job.cancelled || e is LocalOperationCancelled
          ? 'CANCELLED'
          : 'FAILED';
      job.error = e.toString();
      job.stage = job.status;
      if (await directory.exists()) await directory.delete(recursive: true);
    }
  }

  Future<void> cancel(String id) async {
    final job = jobs[id];
    if (job == null || job.snapshot.terminal) return;
    job.cancelled = true;
    job.status = 'CANCELLED';
    job.stage = 'Cancelled';
    for (final process in job.processes.toList()) {
      await kill(process);
    }
  }

  Future<void> cleanupExpired() async {
    if (!await cache.exists()) return;
    final cutoff = DateTime.now().subtract(const Duration(hours: 24));
    await for (final entry in cache.list(followLinks: false)) {
      if (entry is! Directory ||
          !RegExp(r'^[0-9a-f-]{36}$').hasMatch(p.basename(entry.path))) {
        continue;
      }
      if ((await entry.stat()).modified.isBefore(cutoff) &&
          !jobs.containsKey(p.basename(entry.path))) {
        await entry.delete(recursive: true);
      }
    }
  }

  Future<void> shutdown() async {
    for (final owner in analyses.toList()) {
      owner.cancelled = true;
      for (final process in owner.processes.toList()) {
        await kill(process);
      }
    }
    for (final job in jobs.values.toList()) {
      await cancel(job.id);
    }
    while (_running > 0) {
      await Future<void>.delayed(const Duration(milliseconds: 30));
    }
    for (final job in jobs.values) {
      final dir = Directory(p.join(cache.path, job.id));
      if (await dir.exists()) await dir.delete(recursive: true);
    }
    files.clear();
    jobs.clear();
    batches.clear();
    analyses.clear();
  }

  static String safeName(String value) {
    final result = value
        .replaceAll(RegExp(r'[<>:"/\\|?*\x00-\x1f]'), '_')
        .replaceAll(RegExp(r'[. ]+$'), '')
        .trim();
    return result.isEmpty
        ? 'MediaForge'
        : result.substring(0, math.min(150, result.length));
  }

  static String mime(String format) =>
      {
        'mp4': 'video/mp4',
        'webm': 'video/webm',
        'mkv': 'video/x-matroska',
        'mov': 'video/quicktime',
        'avi': 'video/x-msvideo',
        'flv': 'video/x-flv',
        'mp3': 'audio/mpeg',
        'm4a': 'audio/mp4',
        'aac': 'audio/aac',
        'wav': 'audio/wav',
        'flac': 'audio/flac',
        'ogg': 'audio/ogg',
        'webp': 'image/webp',
        'avif': 'image/avif',
        'jpg': 'image/jpeg',
        'png': 'image/png'
      }[format] ??
      'application/octet-stream';

  // Implemented in the extractor extension; local exports do not use internet.
  Future<Json> downloadSource(LocalMediaJob job, Directory directory) =>
      extractorDownload(this, job, directory);
}

class MediaPlan {
  final List<String> arguments;
  final String output, format;
  final double duration;
  final bool video, audio, image;
  final int? height;
  MediaPlan(this.arguments, this.output, this.format, this.duration,
      {required this.video,
      required this.audio,
      required this.image,
      this.height});
}

double _number(Json o, String key, double fallback, double min, double max) {
  final value = o[key];
  if (value == null) return fallback;
  if (value is! num ||
      !value.toDouble().isFinite ||
      value < min ||
      value > max) {
    throw BackendException('Invalid $key.');
  }
  return value.toDouble();
}

MediaPlan buildPlan(String input, String output, Json probe, Json o) {
  final format = '${o['outputFormat']}'.toLowerCase();
  final image = LocalMediaEngine.imageFormats.contains(format);
  final video = LocalMediaEngine.videoFormats.contains(format);
  final streams = (probe['streams'] as List).cast<Map>();
  final vs = streams.where((s) => s['codec_type'] == 'video').firstOrNull;
  final hasAudio = streams.any((s) => s['codec_type'] == 'audio');
  final audio = !image &&
      hasAudio &&
      (!video || o['removeAudio'] != true && o['stripAudio'] != true);
  if ((image || video) && vs == null) {
    throw const BackendException('The source has no video/image stream.');
  }
  if (!image && !video && !hasAudio) {
    throw const BackendException('The source has no audio stream.');
  }
  final duration =
      double.tryParse('${(probe['format'] as Map?)?['duration']}') ?? 0.0;
  if (!image && (!duration.isFinite || duration <= 0)) {
    throw const BackendException('The source has no valid duration.');
  }
  final start = image ? 0.0 : _number(o, 'startTime', 0, 0, duration);
  final end = image
      ? 0.0
      : _number(o, 'endTime', duration, start, duration + .05)
          .clamp(0, duration)
          .toDouble();
  if (!image && end - start < .05) {
    throw const BackendException('Select a non-empty trim range.');
  }
  final cuts = (o['removeSegments'] as List? ?? []).map((v) {
    if (v is! Map) throw const BackendException('Invalid cut interval.');
    final c = Map<String, dynamic>.from(v);
    final a = _number(c, 'start', 0, 0, duration),
        b = _number(c, 'end', 0, 0, duration);
    if (b <= a) throw const BackendException('Cut end must follow its start.');
    return [a, b];
  }).toList()
    ..sort((a, b) => a[0].compareTo(b[0]));
  final segments = <List<double>>[];
  var cursor = start;
  for (final cut in cuts) {
    if (cut[1] <= cursor || cut[0] >= end) continue;
    if (cut[0] > cursor) segments.add([cursor, math.min(end, cut[0])]);
    cursor = math.max(cursor, cut[1]);
  }
  if (cursor < end) segments.add([cursor, end]);
  final effective =
      image ? 0.0 : segments.fold<double>(0, (sum, s) => sum + s[1] - s[0]);
  if (!image && effective < .05) {
    throw const BackendException('The cuts remove the entire selection.');
  }
  final vf = <String>[], af = <String>[];
  if (o['cropWidth'] != null || o['cropHeight'] != null) {
    final w =
        _number(o, 'cropWidth', 0, 2, (vs?['width'] as num? ?? 0).toDouble())
            .toInt();
    final h =
        _number(o, 'cropHeight', 0, 2, (vs?['height'] as num? ?? 0).toDouble())
            .toInt();
    final x =
        _number(o, 'cropX', 0, 0, (vs?['width'] as num? ?? 0).toDouble() - w)
            .toInt();
    final y =
        _number(o, 'cropY', 0, 0, (vs?['height'] as num? ?? 0).toDouble() - h)
            .toInt();
    if (w < 2 || h < 2) throw const BackendException('Invalid crop rectangle.');
    vf.add('crop=$w:$h:$x:$y');
  }
  int? targetHeight;
  if (image) {
    final rotation = _number(o, 'imageRotation', 0, 0, 360).round() % 360;
    if (![0, 90, 180, 270].contains(rotation)) {
      throw const BackendException('Unsupported image rotation.');
    }
    if (rotation == 90) vf.add('transpose=1');
    if (rotation == 180) vf.addAll(['hflip', 'vflip']);
    if (rotation == 270) vf.add('transpose=2');
    if (o['flipHorizontal'] == true) vf.add('hflip');
    if (o['flipVertical'] == true) vf.add('vflip');
    vf.add(
        'eq=brightness=${_number(o, 'brightness', 0, -1, 1)}:contrast=${_number(o, 'contrast', 1, 0, 2)}:saturation=${_number(o, 'saturation', 1, 0, 2)}');
    final warmth = _number(o, 'warmth', 0, -1, 1) * .15;
    if (warmth != 0) vf.add('colorbalance=rm=$warmth:bm=${-warmth}');
    if (o['imageWidth'] != null || o['imageHeight'] != null) {
      final w =
          _number(o, 'imageWidth', (vs!['width'] as num).toDouble(), 2, 16384)
              .round();
      final h =
          _number(o, 'imageHeight', (vs['height'] as num).toDouble(), 2, 16384)
              .round();
      vf.add(o['preserveAspectRatio'] == false
          ? 'scale=$w:$h'
          : 'scale=$w:$h:force_original_aspect_ratio=decrease');
    }
  } else if (video) {
    final res = '${o['targetResolution'] ?? 'source'}';
    if (res != 'source' && res != 'Original') {
      final match = RegExp(r'^(\d{2,4})p(?:\s.*)?$').firstMatch(res);
      if (match == null) {
        throw const BackendException('Invalid output resolution.');
      }
      targetHeight = int.parse(match.group(1)!);
      if (targetHeight < 144 || targetHeight > 4320 || targetHeight.isOdd) {
        throw const BackendException('Unsupported output resolution.');
      }
      vf.add('scale=-2:$targetHeight');
    } else {
      vf.add('scale=trunc(iw/2)*2:trunc(ih/2)*2');
    }
  }
  if (audio) {
    af.add('volume=${_number(o, 'volume', 1, 0, 5)}');
    final levels = (o['audioEffectLevels'] as Map? ?? {});
    for (final name in (o['audioEffects'] as List? ?? [])) {
      if (!['reverb', 'echo', 'bass', 'treble', 'warmth'].contains(name)) {
        throw const BackendException('Unknown audio effect.');
      }
      final level =
          _number(Map<String, dynamic>.from(levels), '$name', 100, 0, 100) /
              100;
      if (level == 0) continue;
      af.add(switch (name) {
        'reverb' =>
          'aecho=${1 - .2 * level}:${1 - .12 * level}:40|70|100:${.25 * level}|${.18 * level}|${.12 * level}',
        'echo' => 'aecho=${1 - .2 * level}:${1 - .1 * level}:180:${.3 * level}',
        'bass' => 'bass=g=${6 * level}:f=200',
        'treble' => 'treble=g=${5 * level}:f=3000',
        _ => 'lowpass=f=${20000 - 15000 * level}',
      });
    }
    af.add('atrim=duration=$effective');
    final fi = _number(o, 'fadeInDuration', 0, 0, 86400).clamp(0, effective),
        fo = _number(o, 'fadeOutDuration', 0, 0, 86400).clamp(0, effective);
    if (fi > 0) af.add('afade=t=in:st=0:d=$fi:curve=qsin');
    if (fo > 0) af.add('afade=t=out:st=${effective - fo}:d=$fo:curve=qsin');
  }
  final args = <String>['-i', input];
  if (!image) {
    final graph = <String>[];
    for (var i = 0; i < segments.length; i++) {
      final s = segments[i];
      if (video) {
        graph.add(
            '[0:v:0]trim=start=${s[0]}:end=${s[1]},setpts=PTS-STARTPTS[v$i]');
      }
      if (audio) {
        graph.add(
            '[0:a:0]atrim=start=${s[0]}:end=${s[1]},asetpts=PTS-STARTPTS[a$i]');
      }
    }
    final inputs = List.generate(segments.length,
        (i) => '${video ? '[v$i]' : ''}${audio ? '[a$i]' : ''}').join();
    graph.add(
        '${inputs}concat=n=${segments.length}:v=${video ? 1 : 0}:a=${audio ? 1 : 0}${video ? '[vc]' : ''}${audio ? '[ac]' : ''}');
    if (video) graph.add('[vc]${vf.join(',')}[vo]');
    if (audio) graph.add('[ac]${af.join(',')}[ao]');
    args.addAll(['-filter_complex', graph.join(';')]);
    if (video) args.addAll(['-map', '[vo]']);
    if (audio) args.addAll(['-map', '[ao]']);
  } else {
    args.addAll(['-map', '0:v:0', '-vf', vf.join(','), '-frames:v', '1']);
  }
  if (!audio) args.add('-an');
  if (!image && !video) args.add('-vn');
  if (video) {
    args.addAll(switch (format) {
      'webm' => ['-c:v', 'libvpx-vp9', '-deadline', 'good', '-cpu-used', '4'],
      'avi' => ['-c:v', 'mpeg4', '-q:v', '4'],
      'flv' => ['-c:v', 'flv'],
      _ => [
          '-c:v',
          'libx264',
          '-preset',
          'fast',
          '-crf',
          '${_number(o, 'crf', 20, 0, 51).round()}'
        ],
    });
    args.addAll(['-pix_fmt', 'yuv420p']);
    if (o['videoBitrate'] != null && o['videoBitrate'] != 'auto') {
      final bit = '${o['videoBitrate']}';
      if (!RegExp(r'^\d{1,6}[kM]$').hasMatch(bit)) {
        throw const BackendException('Invalid video bitrate.');
      }
      args.addAll(['-b:v', bit]);
    }
  }
  if (audio) {
    final codec = video
        ? (format == 'webm'
            ? 'libopus'
            : format == 'avi'
                ? 'libmp3lame'
                : 'aac')
        : {
            'mp3': 'libmp3lame',
            'm4a': 'aac',
            'aac': 'aac',
            'wav': 'pcm_s16le',
            'flac': 'flac',
            'ogg': 'libvorbis'
          }[format]!;
    args.addAll(['-c:a', codec]);
    if (!['wav', 'flac'].contains(format)) {
      args.addAll(
          ['-b:a', '${_number(o, 'audioBitrate', 192, 32, 512).round()}k']);
    }
    args.addAll([
      '-ar',
      '${_number(o, 'sampleRate', 48000, 8000, 192000).round()}',
      '-ac',
      '${_number(o, 'audioChannels', 2, 1, 2).round()}'
    ]);
  }
  if (image) {
    final q = _number(o, 'imageQuality', 85, 1, 100).round();
    args.addAll(switch (format) {
      'webp' => ['-c:v', 'libwebp', '-quality', '$q'],
      'avif' => [
          '-c:v',
          'libaom-av1',
          '-still-picture',
          '1',
          '-cpu-used',
          '6',
          '-crf',
          '${((100 - q) * .5).round()}'
        ],
      'jpg' => [
          '-c:v',
          'mjpeg',
          '-q:v',
          '${2 + ((100 - q) * .29).round()}',
          '-pix_fmt',
          'yuvj420p'
        ],
      _ => [
          '-c:v',
          'png',
          '-compression_level',
          '${((100 - q) * .09).round()}'
        ],
    });
  }
  if (['mp4', 'mov', 'm4a'].contains(format)) {
    args.addAll(['-movflags', '+faststart']);
  }
  args.addAll(['-map_metadata', '-1', '-threads', '2', output]);
  return MediaPlan(args, output, format, effective,
      video: video, audio: audio, image: image, height: targetHeight);
}

Future<void> validateOutput(MediaPlan plan, Json probe) async {
  final streams = (probe['streams'] as List).cast<Map>();
  final v = streams.where((s) => s['codec_type'] == 'video').firstOrNull;
  final a = streams.any((s) => s['codec_type'] == 'audio');
  if (await File(plan.output).length() == 0 ||
      ((plan.video || plan.image) &&
          (v == null ||
              (v['width'] as num? ?? 0) <= 0 ||
              (v['height'] as num? ?? 0) <= 0)) ||
      (plan.audio && !a) ||
      (!plan.video && !plan.image && v != null)) {
    throw const BackendException('Output failed media stream verification.');
  }
  if (plan.height != null && v?['height'] != plan.height) {
    throw const BackendException(
        'Output does not have the requested resolution.');
  }
  final container = '${(probe['format'] as Map?)?['format_name']}';
  final required = {
    'mp4': 'mp4',
    'mov': 'mov',
    'm4a': 'm4a',
    'webm': 'webm',
    'mkv': 'matroska',
    'avi': 'avi',
    'flv': 'flv',
    'mp3': 'mp3',
    'wav': 'wav',
    'flac': 'flac',
    'ogg': 'ogg',
    'aac': 'aac',
    'webp': 'webp',
    'avif': 'avif',
    'jpg': 'jpeg',
    'png': 'png'
  }[plan.format]!;
  if (!container.contains(required) &&
      !(plan.image &&
          '${v?['codec_name']}'.contains(
              {'jpg': 'mjpeg', 'avif': 'av1'}[plan.format] ?? plan.format))) {
    throw const BackendException('Output has the wrong media container.');
  }
  if (!plan.image) {
    final duration =
        double.tryParse('${(probe['format'] as Map?)?['duration']}') ?? 0;
    if (!duration.isFinite ||
        duration <= 0 ||
        (duration - plan.duration).abs() > math.max(.5, plan.duration * .02)) {
      throw const BackendException('Output duration failed verification.');
    }
  }
}
