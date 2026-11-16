import 'dart:async';

enum MediaKind { video, audio, image }

enum ProcessingState { queued, processing, completed, failed, cancelled }

class MediaDetails {
  final String path;
  final double duration;
  final int width, height, bytes;
  final bool video, audio;
  const MediaDetails(
      {required this.path,
      this.duration = 0,
      this.width = 0,
      this.height = 0,
      this.bytes = 0,
      this.video = false,
      this.audio = false});
  factory MediaDetails.fromMap(Map<Object?, Object?> d) => MediaDetails(
      path: d['path'] as String,
      duration: (d['duration'] as num? ?? 0).toDouble(),
      width: (d['width'] as num? ?? 0).toInt(),
      height: (d['height'] as num? ?? 0).toInt(),
      bytes: (d['bytes'] as num? ?? 0).toInt(),
      video: d['video'] == true,
      audio: d['audio'] == true);
}

class EngineCapabilities {
  final Map<MediaKind, List<String>> formats;
  final bool cropVideo, cut, imageRotation;
  final int maxHeight;
  final bool videoFilters,
      audioEffects,
      encoderTuning,
      audioFades,
      imageEditing;
  const EngineCapabilities(this.formats,
      {this.cropVideo = true,
      this.cut = true,
      this.imageRotation = true,
      this.videoFilters = false,
      this.audioEffects = false,
      this.encoderTuning = false,
      this.audioFades = false,
      this.imageEditing = false,
      this.maxHeight = 1080});
  factory EngineCapabilities.fromMap(Map<Object?, Object?> d) =>
      EngineCapabilities({
        for (final kind in MediaKind.values)
          kind: (d[kind.name] as List? ?? []).cast<String>()
      },
          cropVideo: d['cropVideo'] == true,
          cut: d['cut'] == true,
          imageRotation: d['imageRotation'] == true,
          videoFilters: d['videoFilters'] == true,
          audioEffects: d['audioEffects'] == true,
          encoderTuning: d['encoderTuning'] == true,
          audioFades: d['audioFades'] == true,
          imageEditing: d['imageEditing'] == true,
          maxHeight: (d['maxHeight'] as num? ?? 1080).toInt());
}

class MediaCrop {
  final double x, y, width, height;
  const MediaCrop(this.x, this.y, this.width, this.height);
  Map<String, double> toMap() =>
      {'x': x, 'y': y, 'width': width, 'height': height};
  bool get valid =>
      [x, y, width, height].every((n) => n.isFinite) &&
      x >= 0 &&
      y >= 0 &&
      width > 0 &&
      height > 0 &&
      x + width <= 1.00001 &&
      y + height <= 1.00001;
}

class MediaCut {
  final double start, end;
  const MediaCut(this.start, this.end);
  Map<String, double> toMap() => {'start': start, 'end': end};
}

class MediaRequest {
  final String input, format;
  final MediaKind kind;
  final double start;
  final double? end;
  final int? height;
  final int quality, audioBitrate, rotation;
  final MediaCrop? crop;
  final List<MediaCut> cuts;
  final bool mute, flipHorizontal, flipVertical;
  final double imageScale;
  final Map<String, double> imageAdjustments;
  final String videoFilter;
  final int? videoBitrate;
  final double volume, fadeIn, fadeOut;
  final Map<String, double> audioEffects;
  const MediaRequest(
      {required this.input,
      required this.kind,
      required this.format,
      this.start = 0,
      this.end,
      this.height,
      this.quality = 85,
      this.audioBitrate = 192,
      this.rotation = 0,
      this.crop,
      this.cuts = const [],
      this.videoFilter = 'original',
      this.videoBitrate,
      this.volume = 1,
      this.fadeIn = 0,
      this.fadeOut = 0,
      this.audioEffects = const {},
      this.mute = false,
      this.flipHorizontal = false,
      this.flipVertical = false,
      this.imageScale = 1,
      this.imageAdjustments = const {}});
  void validate() {
    if (!imageScale.isFinite ||
        imageScale < .1 ||
        imageScale > 1 ||
        kind != MediaKind.image &&
            (imageScale != 1 ||
                flipHorizontal ||
                flipVertical ||
                imageAdjustments.isNotEmpty) ||
        imageAdjustments.entries.any((e) =>
            !['brightness', 'contrast', 'saturation', 'warmth']
                .contains(e.key) ||
            !e.value.isFinite ||
            (['contrast', 'saturation'].contains(e.key)
                ? e.value < 0 || e.value > 2
                : e.value < -1 || e.value > 1))) {
      throw ArgumentError('Invalid image adjustments.');
    }
    if (kind != MediaKind.video &&
            (videoFilter != 'original' || videoBitrate != null) ||
        kind == MediaKind.image &&
            (volume != 1 ||
                audioEffects.isNotEmpty ||
                fadeIn != 0 ||
                fadeOut != 0)) {
      throw ArgumentError('Effects do not match the selected media type.');
    }
    if (kind != MediaKind.image && rotation != 0 ||
        kind == MediaKind.audio && (crop != null || height != null || mute)) {
      throw ArgumentError(
          'This transform is not supported for the selected media type.');
    }
    if (!fadeIn.isFinite ||
        !fadeOut.isFinite ||
        fadeIn < 0 ||
        fadeOut < 0 ||
        fadeIn > 3600 ||
        fadeOut > 3600 ||
        input.isEmpty ||
        !['original', 'vivid', 'vivid-warm', 'vivid-cool', 'dramatic', 'mono']
            .contains(videoFilter) ||
        !volume.isFinite ||
        volume < 0 ||
        volume > 2 ||
        videoBitrate != null &&
            (videoBitrate! < 100 || videoBitrate! > 50000) ||
        audioEffects.entries.any((e) =>
            !['reverb', 'echo', 'bass', 'treble', 'warmth'].contains(e.key) ||
            !e.value.isFinite ||
            e.value < 0 ||
            e.value > 100) ||
        !RegExp(r'^[a-z0-9]{2,5}$').hasMatch(format) ||
        !start.isFinite ||
        start < 0 ||
        end != null && (!end!.isFinite || end! <= start) ||
        height != null && (height! < 144 || height! > 2160 || height!.isOdd) ||
        quality < 1 ||
        quality > 100 ||
        audioBitrate < 32 ||
        audioBitrate > 320 ||
        ![0, 90, 180, 270].contains(rotation) ||
        crop != null && !crop!.valid ||
        cuts.length > 20 ||
        cuts.any((c) =>
            !c.start.isFinite ||
            !c.end.isFinite ||
            c.start < start ||
            c.end <= c.start ||
            end != null && c.end > end!)) {
      throw ArgumentError(
          'Invalid media settings. Check range, dimensions and format.');
    }
  }

  Map<String, Object?> toMap() => {
        'input': input,
        'kind': kind.name,
        'format': format,
        'start': start,
        'end': end,
        'height': height,
        'quality': quality,
        'audioBitrate': audioBitrate,
        'rotation': rotation,
        'crop': crop?.toMap(),
        'cuts': cuts.map((c) => c.toMap()).toList(),
        'mute': mute,
        'flipHorizontal': flipHorizontal,
        'flipVertical': flipVertical,
        'imageScale': imageScale,
        'imageAdjustments': imageAdjustments,
        'videoFilter': videoFilter,
        'videoBitrate': videoBitrate,
        'volume': volume,
        'fadeIn': fadeIn,
        'fadeOut': fadeOut,
        'audioEffects': audioEffects
      };
}

class ProcessingJob {
  final String id;
  final ProcessingState state;
  final double? progress;
  final String operation;
  final String? output, error;
  final DateTime? started, completed;
  const ProcessingJob(this.id, this.state,
      {this.progress,
      this.operation = '',
      this.output,
      this.error,
      this.started,
      this.completed});
  bool get terminal => [
        ProcessingState.completed,
        ProcessingState.failed,
        ProcessingState.cancelled
      ].contains(state);
  factory ProcessingJob.fromMap(Map<Object?, Object?> d) => ProcessingJob(
      d['id'] as String,
      ProcessingState.values.firstWhere((s) => s.name == d['state']),
      progress: (d['progress'] as num?)?.toDouble(),
      operation: d['operation'] as String? ?? '',
      output: d['output'] as String?,
      error: d['error'] as String?,
      started: DateTime.tryParse(d['started']?.toString() ?? ''),
      completed: DateTime.tryParse(d['completed']?.toString() ?? ''));
}

abstract class MediaProcessingEngine {
  Future<EngineCapabilities> capabilities();
  Future<MediaDetails> probeMedia(String path);
  Future<String> submit(MediaRequest request);
  Future<ProcessingJob> status(String id);
  Future<void> cancelJob(String id);
  Future<void> cleanup();
  Future<void> dispose();
  Future<String> convertVideo(MediaRequest r) => submit(r);
  Future<String> trimVideo(MediaRequest r) => submit(r);
  Future<String> cropVideo(MediaRequest r) => submit(r);
  Future<String> resizeVideo(MediaRequest r) => submit(r);
  Future<String> convertAudio(MediaRequest r) => submit(r);
  Future<String> trimAudio(MediaRequest r) => submit(r);
  Future<String> convertImage(MediaRequest r) => submit(r);
  Future<String> resizeImage(MediaRequest r) => submit(r);
  Stream<ProcessingJob> watch(String id,
      {Duration limit = const Duration(minutes: 30)}) async* {
    final clock = Stopwatch()..start();
    while (clock.elapsed < limit) {
      final job = await status(id);
      yield job;
      if (job.terminal) return;
      await Future<void>.delayed(const Duration(milliseconds: 300));
    }
    await cancelJob(id);
    throw TimeoutException('Processing timed out and was cancelled.');
  }
}
