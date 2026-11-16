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
      },
          maxHeight: 2160,
          videoFilters: true,
          audioEffects: true,
          encoderTuning: true,
          audioFades: true);
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
    if (r.imageScale != 1 ||
        r.flipHorizontal ||
        r.flipVertical ||
        r.imageAdjustments.isNotEmpty) {
      throw UnsupportedError(
          'Image adjustments are not connected in this engine adapter.');
    }
    if (!(await capabilities()).formats[r.kind]!.contains(r.format)) {
      throw UnsupportedError('Unsupported output format for this media type.');
    }
    final f = await api.upload(r.input);
    final d = await probeMedia(r.input);
    final c = r.crop;
    final look = switch (r.videoFilter) {
      'vivid' => [.03, 1.12, 1.45, 0.0],
      'vivid-warm' => [.03, 1.1, 1.3, .3],
      'vivid-cool' => [.02, 1.1, 1.3, -.3],
      'dramatic' => [-.04, 1.4, .8, 0.0],
      'mono' => [0.0, 1.15, 0.0, 0.0],
      _ => [0.0, 1.0, 1.0, 0.0],
    };
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
      'brightness': look[0],
      'contrast': look[1],
      'saturation': look[2],
      'warmth': look[3],
      'volume': r.volume,
      'fadeInDuration': r.fadeIn,
      'fadeOutDuration': r.fadeOut,
      'audioEffects': r.audioEffects.keys.toList(),
      'audioEffectLevels': r.audioEffects,
      if (r.videoBitrate != null) 'videoBitrate': '${r.videoBitrate}k',
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
