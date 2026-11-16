import 'dart:async';
import 'dart:io';
import 'package:flutter/material.dart';
import 'package:video_player/video_player.dart';
import '../../core/processing/media_processing_engine.dart';
import '../../core/processing/native_media_engine.dart';
import '../../core/processing/media_queue.dart';
import '../../core/processing/media_file_store.dart';
import '../desktop/crop_surface.dart';
import '../desktop/desktop_widgets.dart' show StudioCard;
import 'video_look.dart';

class MobileEditor extends StatefulWidget {
  final MediaKind kind;
  final NativeMediaEngine engine;
  final MediaQueue queue;
  final EngineCapabilities caps;
  const MobileEditor(
      {super.key,
      required this.kind,
      required this.engine,
      required this.queue,
      required this.caps});
  @override
  State<MobileEditor> createState() => MobileEditorState();
}

class MobileEditorState extends State<MobileEditor> {
  MediaDetails? details;
  VideoPlayerController? player;
  String? path;
  String format = '', error = '';
  bool loading = false, cropEnabled = false, mute = false, saved = false;
  RangeValues range = const RangeValues(0, 0);
  Rect crop = const Rect.fromLTWH(0, 0, 1, 1);
  int? height;
  int rotation = 0, bitrate = 192;
  double quality = 85;
  String videoFilter = 'original', cropRatio = 'Original';
  bool exportAudio = false;
  int videoBitrate = 8000;
  double volume = 1, zoom = 1, fadeIn = 0, fadeOut = 0, playbackSpeed = 1;
  final audioEffects = <String, double>{};
  bool previewPending = false, processedPreview = false;
  String imageFilter = 'original';
  double brightness = 0,
      contrast = 1,
      saturation = 1,
      warmth = 0,
      imageScale = 1;
  bool flipHorizontal = false, flipVertical = false;
  final cuts = <MediaCut>[];
  QueueEntry? entry;
  int generation = 0;
  bool get locked => loading || entry != null && !entry!.snapshot.terminal;
  bool get hasWork => locked || path != null && !saved;
  @override
  void initState() {
    super.initState();
    format = widget.kind == MediaKind.image &&
            (widget.caps.formats[widget.kind]?.contains('webp') ?? false)
        ? 'webp'
        : widget.caps.formats[widget.kind]?.firstOrNull ?? '';
    widget.queue.addListener(refresh);
  }

  void refresh() {
    if (previewPending && entry?.snapshot.terminal == true) {
      previewPending = false;
      if (entry!.snapshot.output != null) {
        unawaited(openEffectPreview(entry!.snapshot.output!));
      }
    }
    if (mounted) setState(() {});
  }

  Future<void> openEffectPreview(String output) async {
    final token = generation;
    final next = VideoPlayerController.file(File(output));
    try {
      await next.initialize();
      if (!mounted || token != generation) {
        await next.dispose();
        return;
      }
      await player?.dispose();
      player = next;
      processedPreview = true;
      next.addListener(onPlayback);
      await next.setPlaybackSpeed(playbackSpeed);
      await next.play();
      if (mounted) setState(() {});
    } catch (e) {
      await next.dispose();
      if (mounted) setState(() => error = e.toString());
    }
  }

  void setRatio(String value) {
    change(() {
      cropRatio = value;
      cropEnabled = value != 'Original';
      zoom = 1;
      if (value == 'Custom' || value == 'Original') {
        crop = const Rect.fromLTWH(0, 0, 1, 1);
        return;
      }
      final parts = value.split(':').map(double.parse).toList();
      final source = details!.width / details!.height,
          wanted = parts[0] / parts[1];
      final w = wanted < source ? wanted / source : 1.0,
          h = wanted < source ? 1.0 : source / wanted;
      crop = Rect.fromLTWH((1 - w) / 2, (1 - h) / 2, w, h);
    });
  }

  void setZoom(double value) {
    change(() {
      final factor = zoom / value;
      final w = (crop.width * factor).clamp(.02, 1.0),
          h = (crop.height * factor).clamp(.02, 1.0);
      crop = Rect.fromLTWH((crop.center.dx - w / 2).clamp(0, 1 - w),
          (crop.center.dy - h / 2).clamp(0, 1 - h), w, h);
      zoom = value;
    });
  }

  void change(VoidCallback action) {
    if (locked) return;
    setState(() {
      action();
      if (processedPreview) {
        unawaited(player?.pause());
        processedPreview = false;
        unawaited(restoreSourcePreview());
      }
      entry = null;
      saved = false;
    });
  }

  Future<void> restoreSourcePreview() async {
    final source = path;
    if (source == null) return;
    final token = ++generation;
    final next = VideoPlayerController.file(File(source));
    try {
      await next.initialize();
      if (!mounted || token != generation) {
        await next.dispose();
        return;
      }
      await player?.dispose();
      player = next;
      next.addListener(onPlayback);
      await next.seekTo(Duration(milliseconds: (range.start * 1000).round()));
      if (mounted) setState(() {});
    } catch (e) {
      await next.dispose();
      if (mounted) setState(() => error = e.toString());
    }
  }

  Future<void> pause() async {
    await player?.pause();
  }

  Future<void> pick() async {
    if (locked) return;
    try {
      final files = await DeviceMediaFileStore(native: widget.engine)
          .importFiles(kind: widget.kind);
      if (files.isEmpty) return;
      await importPath(files.single);
    } catch (e) {
      if (mounted) setState(() => error = e.toString());
    }
  }

  Future<void> importPath(String source) async {
    final token = ++generation;
    setState(() {
      loading = true;
      error = '';
    });
    VideoPlayerController? next;
    try {
      final d = await widget.engine.probeMedia(source);
      if (widget.kind == MediaKind.video && !d.video ||
          widget.kind == MediaKind.audio && !d.audio ||
          widget.kind == MediaKind.image && (d.video || d.width == 0)) {
        throw StateError('This file has no requested media track.');
      }
      if (widget.kind != MediaKind.image) {
        next = VideoPlayerController.file(File(source));
        try {
          await next.initialize().timeout(const Duration(seconds: 30));
        } catch (_) {
          await next.dispose();
          next = null;
        }
      }
      if (!mounted || token != generation) {
        await next?.dispose();
        return;
      }
      await player?.dispose();
      player = next;
      player?.addListener(onPlayback);
      setState(() {
        path = source;
        details = d;
        range = RangeValues(0, d.duration);
        crop = const Rect.fromLTWH(0, 0, 1, 1);
        cropEnabled = false;
        rotation = 0;
        cuts.clear();
        entry = null;
        saved = false;
        processedPreview = false;
        previewPending = false;
        videoFilter = 'original';
        audioEffects.clear();
        volume = 1;
        fadeIn = 0;
        fadeOut = 0;
        playbackSpeed = 1;
        zoom = 1;
        cropRatio = 'Original';
        imageFilter = 'original';
        brightness = 0;
        contrast = 1;
        saturation = 1;
        warmth = 0;
        imageScale = 1;
        flipHorizontal = false;
        flipVertical = false;
      });
    } catch (e) {
      if (mounted && token == generation) setState(() => error = e.toString());
    } finally {
      if (mounted && token == generation) setState(() => loading = false);
    }
  }

  void onPlayback() {
    final p = player;
    if (p == null || !p.value.isInitialized) return;
    final t = p.value.position.inMilliseconds / 1000;
    if (p.value.isPlaying && !processedPreview && t < range.start) {
      unawaited(p.seekTo(Duration(milliseconds: (range.start * 1000).round())));
    }
    if (p.value.isPlaying &&
        t >=
            (processedPreview
                ? p.value.duration.inMilliseconds / 1000
                : range.end)) {
      p.pause();
    }
    if (mounted) setState(() {});
  }

  Future<void> togglePlay() async {
    final p = player;
    if (p == null) return;
    if (p.value.isPlaying) {
      await p.pause();
      return;
    }
    final t = p.value.position.inMilliseconds / 1000;
    final from = processedPreview ? 0.0 : range.start;
    final to =
        processedPreview ? p.value.duration.inMilliseconds / 1000 : range.end;
    if (t < from || t >= to) {
      await p.seekTo(Duration(milliseconds: (from * 1000).round()));
    }
    await p.play();
  }

  Future<void> clear() async {
    if (locked) return;
    generation++;
    await player?.dispose();
    player = null;
    if (mounted) {
      setState(() {
        path = null;
        details = null;
        entry = null;
        range = const RangeValues(0, 0);
        cuts.clear();
        error = '';
        processedPreview = false;
        previewPending = false;
      });
    }
  }

  double get effectiveDuration => (range.end -
          range.start -
          cuts.fold<double>(0, (sum, c) => sum + c.end - c.start))
      .clamp(0, double.infinity);

  MediaRequest request() => MediaRequest(
      input: path!,
      kind: exportAudio ? MediaKind.audio : widget.kind,
      format: format,
      start: range.start,
      end: widget.kind == MediaKind.image ? null : range.end,
      height: exportAudio ? null : height,
      crop: cropEnabled && !exportAudio
          ? MediaCrop(crop.left, crop.top, crop.width, crop.height)
          : null,
      rotation: rotation,
      flipHorizontal: widget.kind == MediaKind.image && flipHorizontal,
      flipVertical: widget.kind == MediaKind.image && flipVertical,
      imageScale: widget.kind == MediaKind.image ? imageScale : 1,
      imageAdjustments:
          widget.kind == MediaKind.image && widget.caps.imageEditing
              ? {
                  'brightness': brightness,
                  'contrast': contrast,
                  'saturation': saturation,
                  'warmth': warmth
                }
              : const {},
      quality: quality.round(),
      audioBitrate: bitrate,
      cuts: List.unmodifiable(cuts),
      mute: exportAudio ? false : mute,
      videoFilter: exportAudio ? 'original' : videoFilter,
      videoBitrate: widget.kind == MediaKind.video &&
              !exportAudio &&
              widget.caps.encoderTuning
          ? videoBitrate
          : null,
      volume: widget.caps.audioEffects ? volume : 1,
      fadeIn: widget.caps.audioFades ? fadeIn.clamp(0, effectiveDuration) : 0,
      fadeOut: widget.caps.audioFades ? fadeOut.clamp(0, effectiveDuration) : 0,
      audioEffects: widget.caps.audioEffects && (!mute || exportAudio)
          ? Map.unmodifiable(audioEffects)
          : const {});
  void export({bool preview = false}) {
    unawaited(pause());
    try {
      previewPending = preview;
      entry = widget.queue.add(request());
      setState(() => error = '');
    } catch (e) {
      setState(() => error = e.toString());
    }
  }

  Future<void> addCut() async {
    var from = range.start, to = range.end;
    final result = await showDialog<MediaCut>(
        context: context,
        builder: (context) => StatefulBuilder(
            builder: (context, update) => AlertDialog(
                    title: const Text('Remove interval'),
                    content: Column(mainAxisSize: MainAxisSize.min, children: [
                      Text(
                          '${from.toStringAsFixed(2)}s - ${to.toStringAsFixed(2)}s'),
                      RangeSlider(
                          values: RangeValues(from, to),
                          min: range.start,
                          max: range.end,
                          onChanged: (v) => update(() {
                                from = v.start;
                                to = v.end;
                              }))
                    ]),
                    actions: [
                      TextButton(
                          onPressed: () => Navigator.pop(context),
                          child: const Text('Cancel')),
                      FilledButton(
                          onPressed: () =>
                              Navigator.pop(context, MediaCut(from, to)),
                          child: const Text('Add cut'))
                    ])));
    if (result != null && mounted) change(() => cuts.add(result));
  }

  @override
  void dispose() {
    generation++;
    widget.queue.removeListener(refresh);
    player?.dispose();
    super.dispose();
  }

  Widget imagePreview() => RotatedBox(
      quarterTurns: rotation ~/ 90,
      child: Transform.flip(
          flipX: flipHorizontal,
          flipY: flipVertical,
          child: CropSurface(
              aspect: details!.width / details!.height,
              crop: crop,
              onChanged: cropEnabled && !locked
                  ? (v) => change(() {
                        crop = v;
                        cropRatio = 'Custom';
                      })
                  : null,
              child: ColorFiltered(
                  colorFilter: ColorFilter.matrix(imageAdjustmentMatrix(
                      brightness: brightness,
                      contrast: contrast,
                      saturation: saturation,
                      warmth: warmth)),
                  child: Image.file(File(path!), fit: BoxFit.fill)))));

  void resetImageColors() => change(() {
        imageFilter = 'original';
        brightness = 0;
        contrast = 1;
        saturation = 1;
        warmth = 0;
      });

  @override
  Widget build(BuildContext context) {
    final image = widget.kind == MediaKind.image;
    final formats =
        widget.caps.formats[exportAudio ? MediaKind.audio : widget.kind] ?? [];
    return ListView(padding: const EdgeInsets.all(16), children: [
      Wrap(spacing: 8, runSpacing: 8, children: [
        FilledButton.icon(
            onPressed: locked ? null : pick,
            icon: const Icon(Icons.add),
            label: Text(
                path == null ? 'Import ${widget.kind.name}' : 'Replace file')),
        OutlinedButton.icon(
            onPressed: path == null || locked ? null : clear,
            icon: const Icon(Icons.delete_outline),
            label: const Text('Clear workspace'))
      ]),
      const SizedBox(height: 16),
      if (loading) const LinearProgressIndicator(),
      if (error.isNotEmpty)
        Text(error,
            style: TextStyle(color: Theme.of(context).colorScheme.error)),
      if (path == null)
        StudioCard(
            child: Column(children: [
          const Icon(Icons.file_upload_outlined, size: 48),
          const SizedBox(height: 16),
          Text('Import ${widget.kind.name} to begin'),
          const Text(
              'Files stay on your device. Local processing works offline.')
        ])),
      if (details != null) ...[
        Text(path!.split(Platform.pathSeparator).last,
            maxLines: 2, overflow: TextOverflow.ellipsis),
        Text(image
            ? '${details!.width} ? ${details!.height}'
            : '${details!.width} x ${details!.height} | ${details!.duration.toStringAsFixed(2)}s'),
        const SizedBox(height: 12),
        if (image || widget.kind == MediaKind.video)
          ConstrainedBox(
              constraints: const BoxConstraints(maxHeight: 400),
              child: AspectRatio(
                  aspectRatio: details!.width > 0
                      ? (image && rotation % 180 != 0
                          ? details!.height / details!.width
                          : details!.width / details!.height)
                      : 16 / 9,
                  child: image
                      ? imagePreview()
                      : CropSurface(
                          aspect: details!.width / details!.height,
                          crop: crop,
                          onChanged: cropEnabled && !locked
                              ? (v) => change(() => crop = v)
                              : null,
                          child: player?.value.isInitialized == true
                              ? ColorFiltered(
                                  colorFilter: ColorFilter.matrix(
                                      videoLookMatrix(processedPreview
                                          ? 'original'
                                          : videoFilter)),
                                  child: VideoPlayer(player!))
                              : const Center(
                                  child: Text(
                                      'Preview unavailable; export may still work.'))))),
        if (!image) ...[
          if (player?.value.isInitialized == true)
            VideoProgressIndicator(player!,
                allowScrubbing: !locked,
                padding: const EdgeInsets.symmetric(vertical: 12)),
          Row(children: [
            IconButton(
                onPressed: locked || player == null ? null : togglePlay,
                icon: Icon(player?.value.isPlaying == true
                    ? Icons.pause
                    : Icons.play_arrow)),
            Expanded(
                child: Text(
                    '${range.start.toStringAsFixed(2)}s - ${range.end.toStringAsFixed(2)}s'))
          ]),
          if (widget.kind == MediaKind.audio) ...[
            const Text('Preview speed'),
            Wrap(spacing: 6, children: [
              for (final speed in [.75, 1.0, 1.25, 1.5])
                ChoiceChip(
                    label: Text('${speed}x'),
                    selected: playbackSpeed == speed,
                    onSelected: locked || player == null
                        ? null
                        : (_) {
                            setState(() => playbackSpeed = speed);
                            unawaited(player!.setPlaybackSpeed(speed));
                          })
            ]),
          ],
          if (!cropEnabled) ...[
            const Text('Trim range'),
            RangeSlider(
                values: range,
                min: 0,
                max: details!.duration > 0 ? details!.duration : 1,
                onChanged: locked
                    ? null
                    : (v) {
                        if (v.end - v.start >= .1) {
                          change(() {
                            range = v;
                            cuts.clear();
                          });
                        }
                      }),
          ],
          if (!cropEnabled && widget.caps.cut)
            Wrap(spacing: 8, children: [
              TextButton.icon(
                  onPressed: locked ? null : addCut,
                  icon: const Icon(Icons.content_cut),
                  label: const Text('Cut interval')),
              for (final cut in cuts)
                InputChip(
                    label: Text(
                        '${cut.start.toStringAsFixed(1)}-${cut.end.toStringAsFixed(1)}s'),
                    onDeleted:
                        locked ? null : () => change(() => cuts.remove(cut)))
            ])
        ],
        if (image || widget.kind == MediaKind.video && widget.caps.cropVideo)
          SwitchListTile(
              contentPadding: EdgeInsets.zero,
              title: const Text('Crop canvas'),
              subtitle: const Text(
                  'Drag corners or move the crop area. Switch off to trim.'),
              value: cropEnabled,
              onChanged: locked ? null : (v) => change(() => cropEnabled = v)),
        if (cropEnabled) ...[
          Wrap(spacing: 6, runSpacing: 6, children: [
            for (final ratio in [
              'Original',
              '16:9',
              '9:16',
              '1:1',
              '4:3',
              '3:4',
              '4:5',
              '3:2',
              '2:3',
              '21:9',
              'Custom'
            ])
              ChoiceChip(
                  label: Text(ratio),
                  selected: cropRatio == ratio,
                  onSelected: locked ? null : (_) => setRatio(ratio))
          ]),
          Text('Zoom ${(zoom * 100).round()}%'),
          Slider(
              value: zoom, min: 1, max: 4, onChanged: locked ? null : setZoom),
          const Text('Drag the crop area or its corners to set a custom crop.'),
        ],
        if (image && widget.caps.imageRotation)
          Wrap(spacing: 8, children: [
            TextButton.icon(
                onPressed: locked
                    ? null
                    : () => change(() => rotation = (rotation + 270) % 360),
                icon: const Icon(Icons.rotate_left),
                label: const Text('Rotate Left')),
            TextButton.icon(
                onPressed: locked
                    ? null
                    : () => change(() => rotation = (rotation + 90) % 360),
                icon: const Icon(Icons.rotate_right),
                label: const Text('Rotate Right')),
          ]),
      ],
      if (image && widget.caps.imageEditing) ...[
        const SizedBox(height: 16),
        StudioCard(
            child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
              Row(children: [
                const Expanded(child: Text('Light & Color')),
                TextButton(
                    onPressed: path == null || locked ? null : resetImageColors,
                    child: const Text('Reset sliders'))
              ]),
              const Text('Photo Filters'),
              Wrap(spacing: 6, runSpacing: 6, children: [
                for (final look in videoLooks.entries)
                  ChoiceChip(
                      label: Text(look.value),
                      selected: imageFilter == look.key,
                      onSelected: path == null || locked
                          ? null
                          : (_) => change(() {
                                imageFilter = look.key;
                                final values = imageLookSettings[look.key]!;
                                brightness = values[0];
                                contrast = values[1];
                                saturation = values[2];
                                warmth = values[3];
                              }))
              ]),
              for (final setting in [
                (
                  'Brightness',
                  brightness,
                  -1.0,
                  1.0,
                  (double v) => brightness = v
                ),
                ('Contrast', contrast, 0.0, 2.0, (double v) => contrast = v),
                (
                  'Saturation',
                  saturation,
                  0.0,
                  2.0,
                  (double v) => saturation = v
                ),
                ('Warmth', warmth, -1.0, 1.0, (double v) => warmth = v),
              ]) ...[
                Text('${setting.$1} ${(setting.$2 * 100).round()}%'),
                Slider(
                    value: setting.$2,
                    min: setting.$3,
                    max: setting.$4,
                    onChanged: path == null || locked
                        ? null
                        : (v) => change(() {
                              imageFilter = 'custom';
                              setting.$5(v);
                            })),
              ],
              Wrap(spacing: 8, runSpacing: 8, children: [
                FilterChip(
                    label: const Text('Flip Horizontal'),
                    selected: flipHorizontal,
                    onSelected: path == null || locked
                        ? null
                        : (v) => change(() => flipHorizontal = v)),
                FilterChip(
                    label: const Text('Flip Vertical'),
                    selected: flipVertical,
                    onSelected: path == null || locked
                        ? null
                        : (v) => change(() => flipVertical = v)),
              ]),
            ])),
      ],
      const SizedBox(height: 16),
      StudioCard(
          child:
              Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
        Text('Export Settings', style: Theme.of(context).textTheme.titleLarge),
        const SizedBox(height: 16),
        if (widget.kind == MediaKind.video &&
            (widget.caps.formats[MediaKind.audio]?.isNotEmpty ?? false)) ...[
          SegmentedButton<bool>(
              segments: const [
                ButtonSegment(value: false, label: Text('Export Video')),
                ButtonSegment(value: true, label: Text('Export Audio'))
              ],
              selected: {
                exportAudio
              },
              onSelectionChanged: locked
                  ? null
                  : (v) => change(() {
                        exportAudio = v.single;
                        format = widget
                            .caps
                            .formats[exportAudio
                                ? MediaKind.audio
                                : MediaKind.video]!
                            .first;
                      })),
          const SizedBox(height: 16),
        ],
        if (formats.isEmpty)
          const Text('No compatible encoder detected.')
        else ...[
          Text(
              image
                  ? 'Target Format'
                  : exportAudio || widget.kind == MediaKind.audio
                      ? 'Audio Container Format'
                      : 'Container Format',
              style: Theme.of(context).textTheme.labelLarge),
          const SizedBox(height: 8),
          Wrap(spacing: 8, runSpacing: 8, children: [
            for (final f in {
              ...(image
                  ? ['webp', 'avif', 'jpg', 'png']
                  : exportAudio || widget.kind == MediaKind.audio
                      ? (widget.kind == MediaKind.audio
                          ? ['mp3', 'wav', 'aac', 'flac', 'ogg', 'm4a']
                          : ['mp3', 'm4a', 'wav'])
                      : ['mp4', 'webm', 'mov', 'mkv', 'avi']),
              ...formats
            })
              Tooltip(
                  message: formats.contains(f)
                      ? 'Export ${f.toUpperCase()}'
                      : '${f.toUpperCase()} export is unavailable on this device',
                  child: ChoiceChip(
                      label: Text(f.toUpperCase()),
                      showCheckmark: false,
                      selected: format == f,
                      onSelected: locked || !formats.contains(f)
                          ? null
                          : (_) => change(() => format = f))),
          ]),
          const SizedBox(height: 8),
          Text(
              'Available on this device: ${formats.map((f) => f.toUpperCase()).join(', ')}.',
              style: Theme.of(context).textTheme.bodySmall),
        ],
        const SizedBox(height: 16),
        if (widget.kind == MediaKind.video && !exportAudio)
          DropdownButtonFormField<int>(
              initialValue: height ?? 0,
              decoration: InputDecoration(
                  labelText: image ? 'Output height' : 'Output resolution'),
              items: [
                const DropdownMenuItem(value: 0, child: Text('Original')),
                for (final h in [144, 240, 360, 480, 720, 1080, 1440, 2160])
                  if (h <= widget.caps.maxHeight)
                    DropdownMenuItem(
                        value: h,
                        child: Text(h == 2160 ? '4K (2160p)' : '${h}p'))
              ],
              onChanged: locked
                  ? null
                  : (v) => change(() {
                        height = v == 0 ? null : v;
                        videoBitrate = const {
                              144: 200,
                              240: 400,
                              360: 800,
                              480: 1500,
                              720: 4000,
                              1080: 8000,
                              1440: 16000,
                              2160: 32000
                            }[v] ??
                            8000;
                      })),
        if (widget.kind == MediaKind.video && !exportAudio)
          SwitchListTile(
              contentPadding: EdgeInsets.zero,
              title: const Text('Mute audio'),
              value: mute,
              onChanged: locked ? null : (v) => change(() => mute = v)),
        if (widget.kind == MediaKind.video &&
            !exportAudio &&
            widget.caps.videoFilters) ...[
          const Text('Video Filters'),
          Wrap(spacing: 6, runSpacing: 6, children: [
            for (final look in videoLooks.entries)
              ChoiceChip(
                  label: Text(look.value),
                  selected: videoFilter == look.key,
                  onSelected: path == null || locked
                      ? null
                      : (_) => change(() => videoFilter = look.key))
          ]),
        ],
        if (widget.kind == MediaKind.video && widget.caps.encoderTuning)
          ExpansionTile(
              title: const Text('Bitrate & Audio Tuning'),
              tilePadding: EdgeInsets.zero,
              children: [
                if (!exportAudio) ...[
                  Text('Video bitrate: $videoBitrate kbps'),
                  Slider(
                      value: videoBitrate.toDouble(),
                      min: 100,
                      max: 50000,
                      divisions: 499,
                      onChanged: path == null || locked
                          ? null
                          : (v) => change(() => videoBitrate = v.round()))
                ],
                DropdownButtonFormField<int>(
                    initialValue: bitrate,
                    decoration:
                        const InputDecoration(labelText: 'Audio bitrate'),
                    items: [128, 192, 256, 320]
                        .map((b) =>
                            DropdownMenuItem(value: b, child: Text('$b kbps')))
                        .toList(),
                    onChanged: path == null || locked
                        ? null
                        : (v) => change(() => bitrate = v!)),
              ]),
        if (widget.kind != MediaKind.image &&
            widget.caps.audioEffects &&
            (!mute || exportAudio)) ...[
          const SizedBox(height: 12),
          Text('Clip volume ${(volume * 100).round()}%'),
          Slider(
              value: volume,
              min: 0,
              max: 2,
              onChanged: path == null || locked
                  ? null
                  : (v) => change(() => volume = v)),
          Row(children: [
            const Expanded(child: Text('Audio Effects')),
            TextButton(
                onPressed: path == null || locked
                    ? null
                    : () => change(audioEffects.clear),
                child: const Text('Clear effects'))
          ]),
          Wrap(spacing: 6, runSpacing: 6, children: [
            for (final effect in clipEffects.entries)
              FilterChip(
                  label: Text(effect.value),
                  selected: audioEffects.containsKey(effect.key),
                  onSelected: path == null || locked
                      ? null
                      : (selected) => change(() => selected
                          ? audioEffects[effect.key] = 50
                          : audioEffects.remove(effect.key)))
          ]),
          for (final effect in audioEffects.entries) ...[
            Text('${clipEffects[effect.key]} level ${effect.value.round()}%'),
            Slider(
                value: effect.value,
                min: 0,
                max: 100,
                onChanged: locked
                    ? null
                    : (v) => change(() => audioEffects[effect.key] = v))
          ],
          const Text(
              'Use Preview effects to hear the processed audio. Effects also apply to export.'),
          OutlinedButton.icon(
              onPressed:
                  path == null || locked ? null : () => export(preview: true),
              icon: const Icon(Icons.play_circle_outline),
              label: const Text('Preview effects')),
        ],
        if (image && widget.caps.imageEditing) ...[
          const SizedBox(height: 16),
          const Text('Resolution Scaling'),
          Wrap(spacing: 8, runSpacing: 8, children: [
            for (final scale in [1.0, .67, .5])
              ChoiceChip(
                  label: Text(scale == 1
                      ? 'Original 100%'
                      : '${(scale * 100).round()}%'),
                  selected: imageScale == scale,
                  onSelected: path == null || locked
                      ? null
                      : (_) => change(() {
                            imageScale = scale;
                            height = null;
                          })),
          ]),
        ],
        if (image) ...[
          Text(format == 'png'
              ? 'Lossless PNG ? transparency preserved'
              : 'Quality ${quality.round()}%'),
          Slider(
              value: quality,
              min: 10,
              max: 100,
              onChanged: path == null || locked || format == 'png'
                  ? null
                  : (v) => change(() => quality = v))
        ],
        if (widget.kind == MediaKind.audio && format != 'wav') ...[
          const SizedBox(height: 12),
          const Text('Target bitrate'),
          Wrap(spacing: 8, runSpacing: 8, children: [
            for (final b in [320, 256, 192, 128])
              ChoiceChip(
                  label: Text('$b kbps'),
                  selected: bitrate == b,
                  onSelected: path == null || locked
                      ? null
                      : (_) => change(() => bitrate = b)),
          ]),
        ],
        if (widget.kind == MediaKind.audio && format == 'wav')
          const Text(
              'Lossless PCM WAV. Uses the source sample rate and channels.'),
        if (widget.kind == MediaKind.audio && widget.caps.audioFades) ...[
          const SizedBox(height: 16),
          const Text('Fade Transitions'),
          Text(
              'Fade In ${fadeIn.clamp(0, effectiveDuration).toStringAsFixed(1)}s'),
          Slider(
              value: fadeIn.clamp(0, effectiveDuration),
              min: 0,
              max: effectiveDuration > 0 ? effectiveDuration : 1,
              onChanged: path == null || locked
                  ? null
                  : (v) => change(() => fadeIn = v)),
          Text(
              'Fade Out ${fadeOut.clamp(0, effectiveDuration).toStringAsFixed(1)}s'),
          Slider(
              value: fadeOut.clamp(0, effectiveDuration),
              min: 0,
              max: effectiveDuration > 0 ? effectiveDuration : 1,
              onChanged: path == null || locked
                  ? null
                  : (v) => change(() => fadeOut = v)),
          Semantics(
              label: 'Audio fade envelope',
              child: SizedBox(
                  height: 64,
                  child: CustomPaint(
                      painter: _FadeEnvelopePainter(effectiveDuration, fadeIn,
                          fadeOut, Theme.of(context).colorScheme.primary)))),
          const Text(
              'Use Preview effects to listen to fades and effects before saving.'),
        ],
        const SizedBox(height: 16),
        FilledButton.icon(
            onPressed:
                path == null || locked || formats.isEmpty ? null : export,
            icon: const Icon(Icons.file_download_outlined),
            label: const Text('Export locally'))
      ])),
      if (entry != null) ...[
        const SizedBox(height: 16),
        MobileJobPanel(
            entry: entry!,
            engine: widget.engine,
            queue: widget.queue,
            onSaved: () => setState(() => saved = true))
      ],
      const SizedBox(height: 16),
      const Text(
          'Keep MediaForge in the foreground during export. Unsupported codecs and resolutions return an error, never a substitute file.')
    ]);
  }
}

class MobileJobPanel extends StatefulWidget {
  final QueueEntry entry;
  final NativeMediaEngine engine;
  final MediaQueue queue;
  final VoidCallback? onSaved;
  const MobileJobPanel(
      {super.key,
      required this.entry,
      required this.engine,
      required this.queue,
      this.onSaved});
  @override
  State<MobileJobPanel> createState() => _MobileJobPanelState();
}

class _MobileJobPanelState extends State<MobileJobPanel> {
  bool saving = false;
  String message = '';
  Future<void> save(bool gallery) async {
    setState(() => saving = true);
    try {
      final value = await DeviceMediaFileStore(native: widget.engine)
          .saveOutput(widget.entry.snapshot.output!, gallery: gallery);
      if (value != null) {
        widget.onSaved?.call();
        if (mounted) setState(() => message = 'Saved: $value');
      }
    } catch (e) {
      if (mounted) setState(() => message = e.toString());
    } finally {
      if (mounted) setState(() => saving = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final j = widget.entry.snapshot;
    return StudioCard(
        child:
            Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
      Text(j.state.name.toUpperCase(),
          style: Theme.of(context).textTheme.titleMedium),
      Text(j.error ?? j.operation),
      if (!j.terminal) ...[
        const SizedBox(height: 10),
        LinearProgressIndicator(value: j.progress),
        TextButton(
            onPressed: () => widget.queue.cancel(widget.entry),
            child: const Text('Cancel'))
      ],
      if (j.state == ProcessingState.completed && j.output != null)
        Wrap(spacing: 8, runSpacing: 8, children: [
          FilledButton(
              onPressed: saving ? null : () => save(false),
              child: const Text('Save to Files')),
          if (!Platform.isIOS || !j.output!.endsWith('.m4a'))
            OutlinedButton(
                onPressed: saving ? null : () => save(true),
                child: const Text('Save to Gallery')),
          OutlinedButton(
              onPressed: saving
                  ? null
                  : () async {
                      try {
                        await DeviceMediaFileStore(native: widget.engine)
                            .shareOutput(j.output!);
                        widget.onSaved?.call();
                      } catch (e) {
                        if (mounted) setState(() => message = e.toString());
                      }
                    },
              child: const Text('Share'))
        ]),
      if (saving) const LinearProgressIndicator(),
      if (message.isNotEmpty) Text(message)
    ]));
  }
}

class _FadeEnvelopePainter extends CustomPainter {
  final double duration, fadeIn, fadeOut;
  final Color color;
  const _FadeEnvelopePainter(
      this.duration, this.fadeIn, this.fadeOut, this.color);
  @override
  void paint(Canvas canvas, Size size) {
    final path = Path();
    for (var i = 0; i <= 120; i++) {
      final time = duration * i / 120;
      final gainIn = fadeIn > 0 ? (time / fadeIn).clamp(0.0, 1.0) : 1.0;
      final gainOut =
          fadeOut > 0 ? ((duration - time) / fadeOut).clamp(0.0, 1.0) : 1.0;
      final gain = duration > 0 ? (gainIn < gainOut ? gainIn : gainOut) : 0;
      final x = size.width * i / 120,
          y = size.height - 8 - gain * (size.height - 16);
      if (i == 0) {
        path.moveTo(x, y);
      } else {
        path.lineTo(x, y);
      }
    }
    canvas.drawPath(
        path,
        Paint()
          ..color = color
          ..style = PaintingStyle.stroke
          ..strokeWidth = 2);
  }

  @override
  bool shouldRepaint(covariant _FadeEnvelopePainter old) =>
      old.duration != duration ||
      old.fadeIn != fadeIn ||
      old.fadeOut != fadeOut ||
      old.color != color;
}
