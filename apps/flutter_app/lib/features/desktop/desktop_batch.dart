import 'dart:io';
import 'package:file_picker/file_picker.dart';
import 'package:flutter/material.dart';
import 'package:path/path.dart' as p;
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../shared/providers/app_providers.dart';
import '../../core/services/platform_service.dart';
import '../../core/config/app_config.dart';
import '../../core/services/media_api.dart';
import '../../core/services/local_media_api.dart';
import 'desktop_task.dart';
import 'desktop_widgets.dart';
import 'task_panel.dart';

class BatchItem {
  final String path, kind;
  final DesktopTask task = DesktopTask();
  String format, quality = 'High';
  BatchItem(this.path, this.kind)
      : format = kind == 'image'
            ? 'webp'
            : kind == 'audio'
                ? 'mp3'
                : 'mp4';
  List<String> get formats => kind == 'image'
      ? ['webp', 'avif', 'jpg', 'png']
      : kind == 'audio'
          ? ['mp3', 'm4a', 'wav', 'aac', 'flac', 'ogg']
          : ['mp4', 'webm', 'mov', 'mkv', 'avi'];
  Json payload(String fileId) => {
        'inputFileId': fileId,
        'inputFormat': p.extension(path).substring(1),
        'outputFormat': format,
        'mediaType': kind,
        if (kind == 'image')
          'imageQuality': {'Low': 50, 'Medium': 75, 'High': 90}[quality],
        if (kind == 'video') ...{
          'targetResolution': {
            'Low': '480p',
            'Medium': '720p',
            'High': '1080p'
          }[quality],
          'videoBitrate': {
            'Low': '600k',
            'Medium': '1200k',
            'High': '2500k'
          }[quality]
        },
        if (kind == 'audio')
          'audioBitrate': {'Low': 128, 'Medium': 192, 'High': 320}[quality]
      };
}

class DesktopBatch extends StatefulWidget {
  const DesktopBatch({super.key});
  @override
  State<DesktopBatch> createState() => DesktopBatchState();
}

class DesktopBatchState extends State<DesktopBatch> {
  final items = <BatchItem>[];
  final zipTask = DesktopTask();
  String filter = 'All', error = '';
  bool busy = false, zip = true, cancelled = false;
  MediaApi? active;
  String? batchId;
  bool get needsGuard => busy || zipTask.busy;
  Future<void> pause() async {}
  @override
  void initState() {
    super.initState();
    zipTask.addListener(refresh);
  }

  void refresh() {
    if (mounted) setState(() {});
  }

  @override
  void dispose() {
    active?.close();
    zipTask.dispose();
    for (final item in items) {
      item.task.dispose();
    }
    super.dispose();
  }

  Future<void> pick() async {
    final result = await FilePicker.platform.pickFiles(
        allowMultiple: true,
        type: FileType.custom,
        allowedExtensions: [
          ...AppConfig.videoInputFormats,
          ...AppConfig.audioInputFormats,
          ...AppConfig.imageInputFormats
        ]);
    if (result != null) await add(result.paths.whereType<String>().toList());
  }

  Future<void> add(List<String> paths) async {
    if (busy) return;
    final expanded = <String>[];
    for (final path in paths) {
      if (await FileSystemEntity.isDirectory(path)) {
        await for (final entry in Directory(path).list(followLinks: false)) {
          if (entry is File) expanded.add(entry.path);
        }
      } else {
        expanded.add(path);
      }
    }
    var rejected = 0;
    for (final path in expanded) {
      final ext = p.extension(path).replaceFirst('.', '').toLowerCase();
      final kind = AppConfig.videoInputFormats.contains(ext)
          ? 'video'
          : AppConfig.audioInputFormats.contains(ext)
              ? 'audio'
              : AppConfig.imageInputFormats.contains(ext)
                  ? 'image'
                  : null;
      if (kind == null || await File(path).length() > 2 * 1024 * 1024 * 1024) {
        rejected++;
        continue;
      }
      if (!items.any((i) => i.path == path)) {
        final item = BatchItem(path, kind);
        item.task.addListener(refresh);
        items.add(item);
      }
    }
    if (mounted) {
      setState(() {
        batchId = null;
        error = rejected > 0
            ? '$rejected unsupported or oversized files were excluded.'
            : '';
      });
    }
  }

  Future<void> convert() async {
    if (busy || items.isEmpty) return;
    setState(() {
      busy = true;
      cancelled = false;
      error = '';
      batchId = null;
    });
    active = LocalMediaApi();
    try {
      final requests = <Json>[];
      for (final item in items) {
        if (cancelled) break;
        final upload = await active!.upload(item.path);
        requests
            .add(item.payload((upload['fileId'] ?? upload['id']).toString()));
      }
      if (cancelled) return;
      final result = await active!.request('/conversions/batch',
          body: {'items': requests}, method: 'POST');
      batchId = result['batchId'] as String?;
      final jobs = (result['jobs'] as List)
          .map((j) => BackendJob.fromJson(Map<String, dynamic>.from(j as Map)))
          .toList();
      if (jobs.length != items.length) {
        throw const BackendException(
            'The batch response did not contain a job for every file.');
      }
      for (var i = 0; i < jobs.length; i++) {
        items[i].task.job = jobs[i];
      }
      refresh();
      final elapsed = Stopwatch()..start();
      while (!cancelled && items.any((i) => !i.task.job!.terminal)) {
        if (elapsed.elapsed > const Duration(hours: 2)) {
          await cancel();
          throw const BackendException(
              'Batch exceeded the processing time limit.');
        }
        for (final item in items) {
          if (item.task.job!.terminal) continue;
          item.task.job = await active!.job(item.task.job!.id);
          if (item.task.job!.completed) {
            item.task.output = await active!
                .request('/files/${item.task.job!.outputFileId}/metadata');
          }
        }
        refresh();
        await Future<void>.delayed(const Duration(milliseconds: 800));
      }
    } catch (e) {
      if (!cancelled && mounted) setState(() => error = e.toString());
    } finally {
      active?.close();
      active = null;
      if (mounted) setState(() => busy = false);
    }
  }

  Future<void> cancel() async {
    cancelled = true;
    final control = LocalMediaApi();
    try {
      for (final item in items) {
        if (item.task.job != null && !item.task.job!.terminal) {
          item.task.job = await control.cancel(item.task.job!.id);
        }
      }
    } catch (e) {
      if (mounted) {
        setState(() => error = 'Cancellation could not be confirmed: $e');
      }
    } finally {
      control.close();
      active?.close();
      refresh();
    }
  }

  @override
  Widget build(BuildContext context) {
    final complete =
        items.isNotEmpty && items.every((i) => i.task.job?.completed == true);
    return Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
      Row(children: [
        Expanded(
            child: Text('Batch Converter',
                style: Theme.of(context).textTheme.headlineMedium)),
        TextButton(
            onPressed: busy
                ? null
                : () {
                    for (final item in items) {
                      item.task.dispose();
                    }
                    setState(() {
                      items.clear();
                      batchId = null;
                    });
                  },
            child: const Text('Clear Queue'))
      ]),
      const SizedBox(height: 12),
      Text(
          '${items.length} files in queue • ${items.where((i) => i.task.job?.completed == true).length} converted'),
      const SizedBox(height: 22),
      StudioPanels(
          main:
              Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
            StudioDropZone(
                title: 'Drag & drop files or folders here',
                description:
                    'Video, audio and image files • up to 2 GB per file',
                onPick: pick,
                onDrop: add,
                enabled: !busy),
            const SizedBox(height: 20),
            Wrap(
                spacing: 8,
                children: ['All', 'Video', 'Audio', 'Image']
                    .map((v) => ChoiceChip(
                        label: Text(v),
                        selected: filter == v,
                        onSelected: (_) => setState(() => filter = v)))
                    .toList()),
            const SizedBox(height: 18),
            if (items.isEmpty)
              const StudioCard(
                  child: Padding(
                      padding: EdgeInsets.all(30),
                      child: Column(children: [
                        Icon(Icons.layers_outlined, size: 48),
                        SizedBox(height: 18),
                        Text('Batch Queue is Empty'),
                        SizedBox(height: 8),
                        Text('Add media files to begin conversion.')
                      ]))),
            for (final item in items.where(
                (i) => filter == 'All' || i.kind == filter.toLowerCase()))
              Padding(
                  padding: const EdgeInsets.only(bottom: 14),
                  child: StudioCard(
                      child: Column(
                          crossAxisAlignment: CrossAxisAlignment.stretch,
                          children: [
                        Row(children: [
                          Icon(item.kind == 'image'
                              ? Icons.image_outlined
                              : item.kind == 'audio'
                                  ? Icons.music_note
                                  : Icons.movie_outlined),
                          const SizedBox(width: 12),
                          Expanded(
                              child: Text(p.basename(item.path),
                                  style:
                                      Theme.of(context).textTheme.titleSmall)),
                          IconButton(
                              tooltip: 'Remove from queue',
                              onPressed: busy
                                  ? null
                                  : () {
                                      item.task.dispose();
                                      setState(() {
                                        items.remove(item);
                                        batchId = null;
                                      });
                                    },
                              icon: const Icon(Icons.delete_outline))
                        ]),
                        const SizedBox(height: 12),
                        Row(children: [
                          Expanded(
                              child: StudioSelect(
                                  label: 'Output format',
                                  value: item.format,
                                  values: item.formats,
                                  onChanged: busy
                                      ? null
                                      : (v) => setState(() {
                                            item.format = v;
                                            item.task.invalidate();
                                            batchId = null;
                                          }))),
                          const SizedBox(width: 12),
                          Expanded(
                              child: StudioSelect(
                                  label: 'Quality',
                                  value: item.quality,
                                  values: const ['Low', 'Medium', 'High'],
                                  onChanged: busy
                                      ? null
                                      : (v) => setState(() {
                                            item.quality = v;
                                            item.task.invalidate();
                                            batchId = null;
                                          })))
                        ]),
                        if (busy && item.task.job != null) ...[
                          LinearProgressIndicator(
                              value: item.task.job!.progress / 100),
                          Text(item.task.job!.status)
                        ] else if (item.task.job?.status == 'FAILED')
                          StudioNotice(
                              item.task.job!.error ?? 'Conversion failed.',
                              error: true)
                        else if (item.task.job?.completed == true)
                          TaskPanel(
                              task: item.task,
                              format: item.format,
                              exportLabel: 'Convert',
                              onExport: null)
                        else
                          Text('Ready',
                              style: TextStyle(
                                  color: Theme.of(context)
                                      .colorScheme
                                      .onSurfaceVariant)),
                      ]))),
          ]),
          settings: StudioCard(
              child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                Text('Batch Settings',
                    style: Theme.of(context).textTheme.titleLarge),
                const SizedBox(height: 20),
                CheckboxListTile(
                    contentPadding: EdgeInsets.zero,
                    title: const Text('Package output into single ZIP'),
                    value: zip,
                    onChanged:
                        busy ? null : (v) => setState(() => zip = v ?? true)),
                if (error.isNotEmpty) StudioNotice(error, error: true),
                const SizedBox(height: 16),
                if (busy) ...[
                  const LinearProgressIndicator(),
                  const SizedBox(height: 10),
                  const Text('Processing files locally…'),
                  TextButton(
                      onPressed: cancel, child: const Text('Cancel batch'))
                ] else if (complete && zip && batchId != null)
                  FilledButton.icon(
                      onPressed: zipTask.busy
                          ? null
                          : () async {
                              final selectedFolder=ProviderScope.containerOf(context).read(settingsServiceProvider).outputFolder;
                              final defaultFolder=selectedFolder.isEmpty?await PlatformService.getDefaultDownloadDirectory():selectedFolder;
                              if(!mounted)return;
                              final destination = await FilePicker.platform
                                  .saveFile(
                                      initialDirectory:defaultFolder,
                                      dialogTitle: 'Save converted batch',
                                      fileName: 'MediaForge.zip',
                                      type: FileType.custom,
                                      allowedExtensions: ['zip']);
                              if (destination != null) {
                                await zipTask.save(
                                    '/conversions/batch/$batchId/zip',
                                    destination);
                              }
                            },
                      icon: const Icon(Icons.folder_zip_outlined),
                      label: const Text('Download All as ZIP'))
                else
                  FilledButton(
                      onPressed: items.isEmpty ? null : convert,
                      child: Text('Convert All (${items.length} Files)')),
                if (zipTask.busy) ...[
                  const SizedBox(height: 12),
                  LinearProgressIndicator(value: zipTask.transferProgress),
                  TextButton(
                      onPressed: zipTask.cancel,
                      child: const Text('Cancel save'))
                ],
                if (zipTask.error.isNotEmpty)
                  StudioNotice(zipTask.error, error: true),
                if (zipTask.savedPath != null)
                  StudioNotice('ZIP saved to ${zipTask.savedPath}'),
              ]))),
    ]);
  }
}
