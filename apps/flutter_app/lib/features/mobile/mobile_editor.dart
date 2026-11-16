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
  final cuts = <MediaCut>[];
  QueueEntry? entry;
  int generation = 0;
  bool get locked => loading || entry != null && !entry!.snapshot.terminal;
  bool get hasWork => locked || path != null && !saved;
  @override
  void initState() {
    super.initState();
    format = widget.caps.formats[widget.kind]?.firstOrNull ?? '';
    widget.queue.addListener(refresh);
  }

  void refresh() {
    if (mounted) setState(() {});
  }

  void change(VoidCallback action) {
    if (locked) return;
    setState(() {
      action();
      entry = null;
      saved = false;
    });
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
    if (p.value.isPlaying && t >= range.end) p.pause();
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
    if (t < range.start || t >= range.end) {
      await p.seekTo(Duration(milliseconds: (range.start * 1000).round()));
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
      });
    }
  }

  MediaRequest request() => MediaRequest(
      input: path!,
      kind: widget.kind,
      format: format,
      start: range.start,
      end: widget.kind == MediaKind.image ? null : range.end,
      height: height,
      crop: cropEnabled
          ? MediaCrop(crop.left, crop.top, crop.width, crop.height)
          : null,
      rotation: rotation,
      quality: quality.round(),
      audioBitrate: bitrate,
      cuts: List.unmodifiable(cuts),
      mute: mute);
  void export() {
    unawaited(pause());
    try {
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

  @override
  Widget build(BuildContext context) {
    final image = widget.kind == MediaKind.image;
    final formats = widget.caps.formats[widget.kind] ?? [];
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
        Text(
            '${details!.width} x ${details!.height} | ${details!.duration.toStringAsFixed(2)}s'),
        const SizedBox(height: 12),
        if (image || widget.kind == MediaKind.video)
          ConstrainedBox(
              constraints: const BoxConstraints(maxHeight: 400),
              child: AspectRatio(
                  aspectRatio: details!.width > 0
                      ? details!.width / details!.height
                      : 16 / 9,
                  child: CropSurface(
                      aspect: details!.width / details!.height,
                      crop: crop,
                      onChanged: cropEnabled && !locked
                          ? (v) => change(() => crop = v)
                          : null,
                      child: image
                          ? RotatedBox(
                              quarterTurns: rotation ~/ 90,
                              child:
                                  Image.file(File(path!), fit: BoxFit.contain))
                          : player?.value.isInitialized == true
                              ? VideoPlayer(player!)
                              : const Center(
                                  child: Text(
                                      'Preview unavailable; export may still work.'))))),
        if (!image) ...[
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
          if (widget.caps.cut)
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
              subtitle: const Text('Drag corners or move the crop area.'),
              value: cropEnabled,
              onChanged: locked ? null : (v) => change(() => cropEnabled = v)),
        if (image && widget.caps.imageRotation)
          TextButton.icon(
              onPressed: locked
                  ? null
                  : () => change(() => rotation = (rotation + 90) % 360),
              icon: const Icon(Icons.rotate_right),
              label: const Text('Rotate 90 degrees')),
      ],
      const SizedBox(height: 16),
      StudioCard(
          child:
              Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
        Text('Export Settings', style: Theme.of(context).textTheme.titleLarge),
        const SizedBox(height: 16),
        if (formats.isEmpty)
          const Text('No compatible encoder detected.')
        else
          DropdownButtonFormField<String>(
              initialValue: format,
              decoration: const InputDecoration(labelText: 'Container format'),
              items: formats
                  .map((f) =>
                      DropdownMenuItem(value: f, child: Text(f.toUpperCase())))
                  .toList(),
              onChanged: locked ? null : (v) => change(() => format = v!)),
        const SizedBox(height: 16),
        if (widget.kind != MediaKind.audio)
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
                  : (v) => change(() => height = v == 0 ? null : v)),
        if (widget.kind == MediaKind.video)
          SwitchListTile(
              contentPadding: EdgeInsets.zero,
              title: const Text('Mute audio'),
              value: mute,
              onChanged: locked ? null : (v) => change(() => mute = v)),
        if (image) ...[
          Text('Quality ${quality.round()}%'),
          Slider(
              value: quality,
              min: 10,
              max: 100,
              onChanged: path == null || locked
                  ? null
                  : (v) => change(() => quality = v))
        ],
        if (widget.kind == MediaKind.audio && Platform.isAndroid)
          DropdownButtonFormField<int>(
              initialValue: bitrate,
              decoration: const InputDecoration(labelText: 'AAC bitrate'),
              items: [128, 192, 256, 320]
                  .map(
                      (b) => DropdownMenuItem(value: b, child: Text('$b kbps')))
                  .toList(),
              onChanged: locked ? null : (v) => change(() => bitrate = v!)),
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
