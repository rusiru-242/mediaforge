import 'dart:convert';
import 'dart:io';
import 'package:mediaforge_desktop/core/services/backend_api.dart';

/// Pass only a URL you own or are authorized to download.
Future<void> main(List<String> args) async {
  if (args.length != 1) {
    stderr.writeln(
        'Usage: dart run tool/verify_backend_source.dart <authorized-url>');
    exitCode = 2;
    return;
  }
  final api = BackendApi();
  final report = <String, dynamic>{'url': args.single, 'success': false};
  final directory = Directory('build/qa')..createSync(recursive: true);
  try {
    final metadata = await api.request('/downloads/metadata',
        body: {'url': args.single}, method: 'POST');
    report['metadata'] = metadata;
    if (metadata['success'] != true) {
      throw BackendException('${metadata['message']}');
    }
    final formats = (metadata['availableFormats'] as List).cast<Map>();
    final option = formats
        .firstWhere((value) => '${value['format']}'.toLowerCase() == 'mp4');
    final quality = '${option['quality']}';
    final job = await api.createJob('/downloads', {
      'url': args.single,
      'selectedFormat': 'mp4',
      'selectedQuality': quality,
      'mediaType': 'video'
    });
    final completed =
        await api.watch(job.id, limit: const Duration(minutes: 5)).last;
    if (!completed.completed || completed.outputFileId == null) {
      throw BackendException(completed.error ?? completed.status);
    }
    final file = await api.request('/files/${completed.outputFileId}/metadata');
    report['outputMetadata'] = file;
    final path = '${directory.path}/authorized-source.mp4';
    await api.save('/files/${completed.outputFileId}/download', path);
    final probe = await Process.run('ffprobe',
        ['-v', 'error', '-show_streams', '-show_format', '-of', 'json', path]);
    if (probe.exitCode != 0) {
      throw const BackendException('Saved file failed FFprobe.');
    }
    final media = jsonDecode(probe.stdout.toString()) as Map;
    final streams = (media['streams'] as List).cast<Map>();
    if (!streams.any((stream) => stream['codec_type'] == 'video')) {
      throw const BackendException('MP4 output has no video stream.');
    }
    report.addAll({
      'success': true,
      'quality': quality,
      'video': true,
      'audio': streams.any((s) => s['codec_type'] == 'audio'),
      'bytes': await File(path).length(),
      'duration': media['format']['duration']
    });
  } catch (e) {
    report['error'] = e.toString();
    exitCode = 1;
  } finally {
    api.close();
  }
  final text = const JsonEncoder.withIndent('  ').convert(report);
  await File('${directory.path}/authorized-source-result.json')
      .writeAsString(text);
  stdout.writeln(text);
}
