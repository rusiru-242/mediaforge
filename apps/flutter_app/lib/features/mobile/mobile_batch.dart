import 'dart:async';
import 'package:flutter/material.dart';
import 'package:path/path.dart' as p;
import '../../core/processing/media_processing_engine.dart';
import '../../core/processing/native_media_engine.dart';
import '../../core/processing/media_queue.dart';
import '../../core/processing/media_file_store.dart';
import '../../core/processing/batch_archive.dart';
import '../desktop/desktop_widgets.dart' show StudioCard;
import 'mobile_editor.dart';

class MobileBatchItem {
  final String path;
  final MediaKind kind;
  final int bytes;
  String format;
  int? height;
  int quality = 85, audioBitrate = 192;
  QueueEntry? entry;
  MobileBatchItem(this.path, this.kind, this.format, this.bytes);
  bool get active => entry != null && !entry!.snapshot.terminal;
  bool get completed => entry?.snapshot.state == ProcessingState.completed;
  bool get pending =>
      entry == null ||
      [ProcessingState.failed, ProcessingState.cancelled]
          .contains(entry!.snapshot.state);
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
  State<MobileBatch> createState() => MobileBatchState();
}

class MobileBatchState extends State<MobileBatch> with WidgetsBindingObserver {
  final items = <MobileBatchItem>[];
  final archive = BatchArchive();
  bool loading = false, packaging = false, saving = false, packageZip = true;
  String error = '', filter = 'all', zipPath = '';
  double zipProgress = 0;
  bool get busy => items.any((i) => i.active) || packaging || loading || saving;
  bool get hasWork => busy || items.isNotEmpty;
  bool get allCompleted => items.isNotEmpty && items.every((i) => i.completed);
  List<String> formats(MobileBatchItem i) => {
        ...?widget.caps.formats[i.kind],
        if (i.kind == MediaKind.video) ...?widget.caps.formats[MediaKind.audio]
      }.toList();
  bool audioOutput(MobileBatchItem i) =>
      i.kind == MediaKind.audio ||
      i.kind == MediaKind.video &&
          (widget.caps.formats[MediaKind.audio] ?? []).contains(i.format);
  @override
  void initState() {
    super.initState();
    widget.queue.addListener(refresh);
    WidgetsBinding.instance.addObserver(this);
  }

  void refresh() {
    if (mounted) setState(() {});
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    if (state == AppLifecycleState.paused) archive.cancel();
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    widget.queue.removeListener(refresh);
    archive.cancel();
    super.dispose();
  }

  Future<void> pick() async {
    if (busy || widget.queue.busy) return;
    setState(() {
      loading = true;
      error = '';
    });
    try {
      final files = await DeviceMediaFileStore(native: widget.engine)
          .importFiles(multiple: true);
      await importPaths(files);
    } catch (e) {
      if (mounted) setState(() => error = e.toString());
    } finally {
      if (mounted) setState(() => loading = false);
    }
  }

  Future<void> importPaths(List<String> files) async {
    if (items.length + files.length > 50) {
      throw StateError('Import up to 50 files.');
    }
    for (final path in files) {
      try {
        final d = await widget.engine.probeMedia(path);
        if (!mounted) return;
        final kind = d.video
            ? MediaKind.video
            : d.audio
                ? MediaKind.audio
                : MediaKind.image;
        final available = widget.caps.formats[kind] ?? [];
        if (available.isEmpty) {
          throw StateError('No local output format for ${kind.name}.');
        }
        items.add(MobileBatchItem(
            path,
            kind,
            kind == MediaKind.image && available.contains('webp')
                ? 'webp'
                : available.first,
            d.bytes));
      } catch (e) {
        if (mounted) {
          setState(() => error = 'Could not import ${p.basename(path)}: $e');
        }
      }
    }
    if (mounted) setState(() => zipPath = '');
  }

  void update(MobileBatchItem item, void Function() apply) {
    setState(() {
      apply();
      if (item.entry?.snapshot.terminal == true) {
        widget.queue.entries.remove(item.entry);
      }
      item.entry = null;
      zipPath = '';
    });
  }

  void convert() {
    if (busy || widget.queue.busy) return;
    try {
      final pending = items.where((i) => i.pending).toList();
      final requests = pending
          .map((i) => MediaRequest(
              input: i.path,
              kind: audioOutput(i) ? MediaKind.audio : i.kind,
              format: i.format,
              height: i.kind == MediaKind.video && !audioOutput(i)
                  ? i.height
                  : null,
              quality: i.quality,
              audioBitrate: i.audioBitrate,
              videoBitrate: i.kind == MediaKind.video &&
                      !audioOutput(i) &&
                      i.height != null &&
                      widget.caps.encoderTuning
                  ? const {
                      144: 200,
                      240: 400,
                      360: 800,
                      480: 1500,
                      720: 4000,
                      1080: 8000,
                      1440: 16000,
                      2160: 32000
                    }[i.height]
                  : null))
          .toList();
      for (final request in requests) {
        request.validate();
      }
      if (widget.queue.entries.where((e) => !e.snapshot.terminal).length +
              requests.length >
          50) {
        throw StateError('Queue is full.');
      }
      for (var i = 0; i < pending.length; i++) {
        pending[i].entry = widget.queue.add(requests[i]);
      }
      setState(() {
        error = '';
        zipPath = '';
      });
    } catch (e) {
      setState(() => error = e.toString());
    }
  }

  Future<void> cancel() async {
    archive.cancel();
    for (final item in items.where((i) => i.active).toList()) {
      await widget.queue.cancel(item.entry!);
    }
  }

  void clear() {
    if (busy) return;
    final owned = items.map((i) => i.entry).whereType<QueueEntry>().toSet();
    widget.queue.entries
        .removeWhere((e) => owned.contains(e) && e.snapshot.terminal);
    setState(() {
      items.clear();
      zipPath = '';
      error = '';
      filter = 'all';
    });
  }

  Future<void> package() async {
    if (!allCompleted || busy) return;
    setState(() {
      packaging = true;
      error = '';
      zipProgress = 0;
    });
    try {
      final directory = await widget.engine.outputDirectory();
      final path = await archive.create(directory, [
        for (final item in items)
          (
            item.entry!.snapshot.output!,
            '${p.basenameWithoutExtension(item.path)}_converted.${item.format}'
          )
      ], onProgress: (v) {
        if (mounted) setState(() => zipProgress = v);
      });
      if (mounted) setState(() => zipPath = path);
    } catch (e) {
      if (mounted) setState(() => error = e.toString());
    } finally {
      if (mounted) setState(() => packaging = false);
    }
  }

  Future<void> saveZip({bool share = false}) async {
    if (busy) return;
    setState(() => saving = true);
    try {
      final store = DeviceMediaFileStore(native: widget.engine);
      if (share) {
        await store.shareOutput(zipPath);
      } else {
        await store.saveOutput(zipPath);
      }
    } catch (e) {
      if (mounted) setState(() => error = e.toString());
    } finally {
      if (mounted) setState(() => saving = false);
    }
  }

  String size(int bytes) => bytes < 1024 * 1024
      ? '${(bytes / 1024).toStringAsFixed(1)} KB'
      : '${(bytes / (1024 * 1024)).toStringAsFixed(1)} MB';
  @override
  Widget build(BuildContext context) =>
      ListView(padding: const EdgeInsets.all(16), children: [
        Text('Batch Converter',
            style: Theme.of(context).textTheme.headlineMedium),
        const SizedBox(height: 12),
        Text(
            '${items.length} files in queue ? ${items.where((i) => i.completed).length} converted'),
        const SizedBox(height: 12),
        Wrap(spacing: 8, runSpacing: 8, children: [
          FilledButton.icon(
              onPressed: busy || widget.queue.busy ? null : pick,
              icon: const Icon(Icons.add),
              label: const Text('Add Files')),
          OutlinedButton.icon(
              onPressed: busy || items.isEmpty ? null : clear,
              icon: const Icon(Icons.delete_outline),
              label: const Text('Clear Queue')),
          if (busy)
            TextButton(onPressed: cancel, child: const Text('Cancel all')),
        ]),
        const SizedBox(height: 16),
        if (loading) const LinearProgressIndicator(),
        if (error.isNotEmpty)
          Text(error,
              style: TextStyle(color: Theme.of(context).colorScheme.error)),
        StudioCard(
            child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
              Text('Batch Settings',
                  style: Theme.of(context).textTheme.titleLarge),
              CheckboxListTile(
                  contentPadding: EdgeInsets.zero,
                  title: const Text('Package output into single ZIP'),
                  value: packageZip,
                  onChanged:
                      busy ? null : (v) => setState(() => packageZip = v!)),
              if (packaging) ...[
                LinearProgressIndicator(value: zipProgress),
                const Text('Packaging completed files?')
              ],
              if (allCompleted && packageZip && zipPath.isEmpty)
                FilledButton.icon(
                    onPressed: busy ? null : package,
                    icon: const Icon(Icons.folder_zip_outlined),
                    label: const Text('Create ZIP'))
              else if (!allCompleted)
                FilledButton(
                    onPressed: busy ||
                            widget.queue.busy ||
                            !items.any((i) => i.pending)
                        ? null
                        : convert,
                    child: Text(
                        'Convert All (${items.where((i) => i.pending).length} Files)')),
              if (allCompleted)
                const Padding(
                    padding: EdgeInsets.symmetric(vertical: 8),
                    child: Text(
                        'Batch complete! All files processed successfully.')),
              if (zipPath.isNotEmpty && packageZip)
                Wrap(spacing: 8, runSpacing: 8, children: [
                  FilledButton.icon(
                      onPressed: busy ? null : () => saveZip(),
                      icon: const Icon(Icons.save_alt),
                      label: const Text('Save All as ZIP')),
                  OutlinedButton.icon(
                      onPressed: busy ? null : () => saveZip(share: true),
                      icon: const Icon(Icons.share),
                      label: const Text('Share ZIP')),
                ]),
            ])),
        const SizedBox(height: 16),
        Wrap(spacing: 6, children: [
          for (final name in ['all', 'video', 'audio', 'image'])
            ChoiceChip(
                label: Text('${name[0].toUpperCase()}${name.substring(1)}'),
                selected: filter == name,
                onSelected: (_) => setState(() => filter = name))
        ]),
        if (items.isEmpty)
          const StudioCard(
              child: Column(children: [
            Icon(Icons.layers_outlined, size: 48),
            SizedBox(height: 12),
            Text('Batch Queue is Empty'),
            Text('Add videos, audio or images to convert on your device.')
          ])),
        if (items.isNotEmpty &&
            !items.any((i) => filter == 'all' || i.kind.name == filter))
          const Padding(
              padding: EdgeInsets.all(24),
              child: Text('No files match this filter.')),
        for (final item in items
            .where((i) => filter == 'all' || i.kind.name == filter)) ...[
          const SizedBox(height: 12),
          StudioCard(
              key: ObjectKey(item),
              child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    Row(children: [
                      Icon(switch (item.kind) {
                        MediaKind.video => Icons.movie_outlined,
                        MediaKind.audio => Icons.music_note,
                        MediaKind.image => Icons.image_outlined
                      }),
                      const SizedBox(width: 8),
                      Expanded(
                          child: Text(p.basename(item.path),
                              maxLines: 2, overflow: TextOverflow.ellipsis)),
                      IconButton(
                          tooltip: 'Remove',
                          onPressed: busy
                              ? null
                              : () => setState(() {
                                    if (item.entry?.snapshot.terminal == true) {
                                      widget.queue.entries.remove(item.entry);
                                    }
                                    items.remove(item);
                                    zipPath = '';
                                  }),
                          icon: const Icon(Icons.delete_outline))
                    ]),
                    Text(
                        '${item.kind.name.toUpperCase()} ? ${size(item.bytes)}'),
                    const SizedBox(height: 12),
                    DropdownButtonFormField<String>(
                        isExpanded: true,
                        key: ValueKey('${item.format}-${item.height}'),
                        initialValue: item.format,
                        decoration:
                            const InputDecoration(labelText: 'Output format'),
                        items: formats(item)
                            .map((f) => DropdownMenuItem(
                                value: f, child: Text(f.toUpperCase())))
                            .toList(),
                        onChanged: busy
                            ? null
                            : (v) => update(item, () => item.format = v!)),
                    const SizedBox(height: 12),
                    if (item.kind == MediaKind.video && !audioOutput(item))
                      DropdownButtonFormField<int>(
                          isExpanded: true,
                          initialValue: item.height ?? 0,
                          decoration: const InputDecoration(
                              labelText: 'Output resolution'),
                          items: [
                            const DropdownMenuItem(
                                value: 0, child: Text('Original resolution')),
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
                                DropdownMenuItem(
                                    value: h,
                                    child: Text(
                                        h == 2160 ? '4K (2160p)' : '${h}p'))
                          ],
                          onChanged: busy
                              ? null
                              : (v) => update(
                                  item, () => item.height = v == 0 ? null : v)),
                    if (item.kind == MediaKind.image)
                      DropdownButtonFormField<int>(
                          isExpanded: true,
                          initialValue: item.quality,
                          decoration:
                              const InputDecoration(labelText: 'Image quality'),
                          items: const [
                            DropdownMenuItem(value: 50, child: Text('Low')),
                            DropdownMenuItem(value: 75, child: Text('Medium')),
                            DropdownMenuItem(value: 85, child: Text('High')),
                            DropdownMenuItem(value: 95, child: Text('Maximum'))
                          ],
                          onChanged: busy || item.format == 'png'
                              ? null
                              : (v) => update(item, () => item.quality = v!)),
                    if (audioOutput(item) && item.format != 'wav')
                      DropdownButtonFormField<int>(
                          isExpanded: true,
                          initialValue: item.audioBitrate,
                          decoration:
                              const InputDecoration(labelText: 'Audio bitrate'),
                          items: [
                            for (final b in [128, 192, 256, 320])
                              DropdownMenuItem(value: b, child: Text('$b kbps'))
                          ],
                          onChanged: busy
                              ? null
                              : (v) =>
                                  update(item, () => item.audioBitrate = v!)),
                    const SizedBox(height: 8),
                    Text(item.entry == null
                        ? 'Ready'
                        : switch (item.entry!.snapshot.state) {
                            ProcessingState.completed => 'Done',
                            ProcessingState.failed => 'Failed',
                            ProcessingState.cancelled => 'Cancelled',
                            ProcessingState.queued => 'Queued',
                            ProcessingState.processing => 'Processing'
                          }),
                  ])),
          if (item.entry != null)
            MobileJobPanel(
                entry: item.entry!, engine: widget.engine, queue: widget.queue),
        ],
      ]);
}
