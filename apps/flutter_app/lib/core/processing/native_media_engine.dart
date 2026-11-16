import 'package:flutter/services.dart';
import 'media_processing_engine.dart';

class NativeMediaEngine extends MediaProcessingEngine {
  final MethodChannel channel;
  NativeMediaEngine({this.channel = const MethodChannel('mediaforge/media')});
  Future<Map<Object?, Object?>> _map(String method, [Object? args]) async =>
      await channel
          .invokeMapMethod<Object?, Object?>(method, args)
          .timeout(const Duration(seconds: 60)) ??
      (throw StateError('Empty native engine response.'));
  @override
  Future<EngineCapabilities> capabilities() async =>
      EngineCapabilities.fromMap(await _map('capabilities'));
  @override
  Future<MediaDetails> probeMedia(String path) async =>
      MediaDetails.fromMap(await _map('probe', {'path': path}));
  @override
  Future<String> submit(MediaRequest r) async {
    r.validate();
    final caps = await capabilities();
    if ((r.imageScale != 1 ||
                r.flipHorizontal ||
                r.flipVertical ||
                r.imageAdjustments.isNotEmpty) &&
            !caps.imageEditing ||
        (r.fadeIn > 0 || r.fadeOut > 0) && !caps.audioFades ||
        r.videoFilter != 'original' && !caps.videoFilters ||
        (r.audioEffects.isNotEmpty || r.volume != 1) && !caps.audioEffects ||
        r.videoBitrate != null && !caps.encoderTuning) {
      throw UnsupportedError(
          'This device engine does not support the selected effects or tuning.');
    }
    if (!(caps.formats[r.kind] ?? []).contains(r.format)) {
      throw UnsupportedError('This device cannot export ${r.format}.');
    }
    return (await _map('submit', r.toMap()))['id'] as String;
  }

  @override
  Future<ProcessingJob> status(String id) async =>
      ProcessingJob.fromMap(await _map('status', {'id': id}));
  @override
  Future<void> cancelJob(String id) async {
    await channel.invokeMethod<void>('cancel', {'id': id});
  }

  @override
  Future<void> cleanup() async {
    await channel.invokeMethod<void>('cleanup');
  }

  @override
  Future<void> dispose() async {
    await channel.invokeMethod<void>('cancelAll');
  }

  Future<String> outputDirectory() async =>
      (await channel.invokeMethod<String>('outputDirectory')) ??
      (throw StateError('No local output directory.'));

  Future<String?> save(String path, {bool gallery = false}) => channel
      .invokeMethod<String>(gallery ? 'saveGallery' : 'save', {'path': path});
}
