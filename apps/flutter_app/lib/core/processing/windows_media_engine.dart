import '../services/local_media_api.dart';
import '../services/local_media_engine.dart';
import 'media_processing_engine.dart';

class WindowsMediaEngine extends MediaProcessingEngine {
  final LocalMediaApi api;
  WindowsMediaEngine({LocalMediaEngine? engine})
      : api = LocalMediaApi(engine: engine);
  @override
  Future<EngineCapabilities> capabilities() async => const EngineCapabilities({
        MediaKind.video: LocalMediaEngine.videoFormats,
        MediaKind.audio: LocalMediaEngine.audioFormats,
        MediaKind.image: LocalMediaEngine.imageFormats
      }, maxHeight: 2160);
  @override
  Future<MediaDetails> probeMedia(String path) async {
    final d = await api.engine.probe(path);
    final tracks = (d['streams'] as List).cast<Map>();
    final v = tracks.where((s) => s['codec_type'] == 'video').firstOrNull;
    return MediaDetails(
        path: path,
        duration: double.tryParse('${d['format']?['duration']}') ?? 0,
        width: v?['width'] as int? ?? 0,
        height: v?['height'] as int? ?? 0,
        video: v != null,
        audio: tracks.any((s) => s['codec_type'] == 'audio'));
  }

  @override
  Future<String> submit(MediaRequest r) async {
    r.validate();
    if (!(await capabilities()).formats[r.kind]!.contains(r.format)) {
      throw UnsupportedError('Unsupported output format for this media type.');
    }
    final f = await api.upload(r.input);
    final d = await probeMedia(r.input);
    final c = r.crop;
    final job = await api.createJob('/conversions', {
      'inputFileId': f['id'],
      'outputFormat': r.format,
      'startTime': r.start,
      if (r.end != null) 'endTime': r.end,
      if (r.height != null && r.kind == MediaKind.video)
        'targetResolution': '${r.height}p',
      'imageQuality': r.quality,
      'audioBitrate': r.audioBitrate,
      'removeAudio': r.mute,
      'imageRotation': r.rotation,
      'removeSegments': r.cuts.map((c) => c.toMap()).toList(),
      if (c != null) ...{
        'cropX': (c.x * d.width).round(),
        'cropY': (c.y * d.height).round(),
        'cropWidth': (c.width * d.width).round(),
        'cropHeight': (c.height * d.height).round()
      },
      if (r.height != null && r.kind == MediaKind.image) 'imageHeight': r.height
    });
    return job.id;
  }

  @override
  Future<ProcessingJob> status(String id) async {
    final j = await api.job(id);
    final state = switch (j.status) {
      'COMPLETED' => ProcessingState.completed,
      'FAILED' => ProcessingState.failed,
      'CANCELLED' => ProcessingState.cancelled,
      'QUEUED' => ProcessingState.queued,
      _ => ProcessingState.processing
    };
    final f = j.outputFileId == null
        ? null
        : await api.request('/files/${j.outputFileId}/metadata');
    return ProcessingJob(id, state,
        progress: j.progress / 100,
        error: j.error,
        output: f?['path'] as String?,
        operation: api.engine.jobs[id]?.stage ?? '');
  }

  @override
  Future<void> cancelJob(String id) async {
    await api.cancel(id);
  }

  @override
  Future<void> cleanup() => api.engine.cleanupExpired();
  @override
  Future<void> dispose() async {
    api.close();
  }
}
