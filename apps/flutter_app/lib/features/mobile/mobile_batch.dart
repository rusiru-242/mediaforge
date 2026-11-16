import 'package:flutter/material.dart';
import '../../core/processing/media_processing_engine.dart';
import '../../core/processing/native_media_engine.dart';
import '../../core/processing/media_queue.dart';
import '../../core/processing/media_file_store.dart';
import '../desktop/desktop_widgets.dart' show StudioCard;
import 'mobile_editor.dart';

class _Item {
  final String path;
  final MediaKind kind;
  String format;
  int? height;
  int quality = 85;
  QueueEntry? entry;
  _Item(this.path, this.kind, this.format);
}

class MobileBatch extends StatefulWidget {
  final NativeMediaEngine engine;
  final MediaQueue queue;
  final EngineCapabilities caps;
  const MobileBatch(
      {super.key,
      required this.engine,
      required this.queue,
      required this.caps});
  @override
  State<MobileBatch> createState() => _MobileBatchState();
}

class _MobileBatchState extends State<MobileBatch> {
  final items = <_Item>[];
  bool loading = false;
  String error = '';
  @override
  void initState() {
    super.initState();
    widget.queue.addListener(refresh);
  }

  void refresh() {
    if (mounted) setState(() {});
  }

  @override
  void dispose() {
    widget.queue.removeListener(refresh);
    super.dispose();
  }

  Future<void> pick() async {
    if (loading) return;
    try {
      final files = await DeviceMediaFileStore(native: widget.engine)
          .importFiles(multiple: true);
      if (files.isEmpty) return;
      if (items.length + files.length > 50) {
        throw StateError('Import up to 50 files.');
      }
      setState(() {
        loading = true;
        error = '';
      });
      for (final path in files) {
        final d = await widget.engine.probeMedia(path);
        if (!mounted) return;
        final kind = d.video
            ? MediaKind.video
            : d.audio
                ? MediaKind.audio
                : MediaKind.image;
        final formats = widget.caps.formats[kind] ?? [];
        if (formats.isEmpty) throw StateError('No encoder for ${kind.name}.');
        items.add(_Item(path, kind, formats.first));
      }
    } catch (e) {
      if (mounted) setState(() => error = e.toString());
    } finally {
      if (mounted) setState(() => loading = false);
    }
  }

  void convert() {
    try {
      for (final item in items.where((i) =>
          i.entry == null ||
          [ProcessingState.failed, ProcessingState.cancelled]
              .contains(i.entry!.snapshot.state))) {
        item.entry = widget.queue.add(MediaRequest(
            input: item.path,
            kind: item.kind,
            format: item.format,
            height: item.height,
            quality: item.quality));
      }
      setState(() => error = '');
    } catch (e) {
      setState(() => error = e.toString());
    }
  }

  @override
  Widget build(BuildContext context) =>
      ListView(padding: const EdgeInsets.all(16), children: [
        const Text('Batch Converter',
            style: TextStyle(fontSize: 26, fontWeight: FontWeight.bold)),
        const SizedBox(height: 12),
        const Text(
            'One native encoder runs at a time to limit memory and thermal load.'),
        const SizedBox(height: 12),
        Wrap(spacing: 8, runSpacing: 8, children: [
          FilledButton.icon(
              onPressed: loading || widget.queue.busy ? null : pick,
              icon: const Icon(Icons.add),
              label: const Text('Add files')),
          OutlinedButton(
              onPressed: loading || items.isEmpty ? null : convert,
              child: const Text('Convert pending files')),
          TextButton(
              onPressed:
                  widget.queue.busy ? () => widget.queue.cancelAll() : null,
              child: const Text('Cancel all'))
        ]),
        if (loading) const LinearProgressIndicator(),
        if (error.isNotEmpty) Text(error),
        if (items.isEmpty)
          const Padding(
              padding: EdgeInsets.all(32),
              child: Text('Add videos, audio or images to begin.')),
        for (final item in items) ...[
          const SizedBox(height: 16),
          StudioCard(
              child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                Row(children: [
                  Expanded(
                      child: Text(item.path.split(RegExp(r'[/\\]')).last,
                          maxLines: 2)),
                  IconButton(
                      tooltip: 'Remove',
                      onPressed:
                          item.entry != null && !item.entry!.snapshot.terminal
                              ? null
                              : () => setState(() => items.remove(item)),
                      icon: const Icon(Icons.delete_outline))
                ]),
                DropdownButtonFormField<String>(
                    initialValue: item.format,
                    decoration:
                        const InputDecoration(labelText: 'Output format'),
                    items: (widget.caps.formats[item.kind] ?? [])
                        .map((f) => DropdownMenuItem(
                            value: f, child: Text(f.toUpperCase())))
                        .toList(),
                    onChanged:
                        item.entry != null && !item.entry!.snapshot.terminal
                            ? null
                            : (v) => setState(() {
                                  item.format = v!;
                                  item.entry = null;
                                })),
                const SizedBox(height: 12),
                if (item.kind != MediaKind.audio)
                  DropdownButtonFormField<int>(
                      initialValue: item.height ?? 0,
                      decoration:
                          const InputDecoration(labelText: 'Output height'),
                      items: [
                        const DropdownMenuItem(
                            value: 0, child: Text('Original')),
                        for (final h in [
                          144,
                          240,
                          360,
                          480,
                          720,
                          1080,
                          1440,
                          2160
                        ])
                          if (h <= widget.caps.maxHeight)
                            DropdownMenuItem(value: h, child: Text('${h}p'))
                      ],
                      onChanged:
                          item.entry != null && !item.entry!.snapshot.terminal
                              ? null
                              : (v) => setState(() {
                                    item.height = v == 0 ? null : v;
                                    item.entry = null;
                                  })),
                if (item.kind == MediaKind.image)
                  DropdownButtonFormField<int>(
                      initialValue: item.quality,
                      decoration: const InputDecoration(labelText: 'Quality'),
                      items: [50, 75, 85, 95]
                          .map((q) =>
                              DropdownMenuItem(value: q, child: Text('$q%')))
                          .toList(),
                      onChanged:
                          item.entry != null && !item.entry!.snapshot.terminal
                              ? null
                              : (v) => setState(() {
                                    item.quality = v!;
                                    item.entry = null;
                                  }))
              ])),
          if (item.entry != null)
            MobileJobPanel(
                entry: item.entry!, engine: widget.engine, queue: widget.queue)
        ]
      ]);
}
