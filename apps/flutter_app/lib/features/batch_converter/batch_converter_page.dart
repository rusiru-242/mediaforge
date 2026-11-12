import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:file_picker/file_picker.dart';
import 'package:path/path.dart' as p;
import 'dart:async';
import '../../core/config/app_config.dart';
import '../../core/services/platform_service.dart';
import '../../shared/models/media_job.dart';
import '../../shared/models/media_info.dart';
import '../../shared/providers/app_providers.dart';

class BatchItem {
  final String path;
  final String name;
  final String? jobId;
  final String status;
  final double progress;

  const BatchItem({
    required this.path,
    required this.name,
    this.jobId,
    this.status = 'pending',
    this.progress = 0.0,
  });

  BatchItem copyWith({
    String? path,
    String? name,
    String? jobId,
    String? status,
    double? progress,
  }) {
    return BatchItem(
      path: path ?? this.path,
      name: name ?? this.name,
      jobId: jobId ?? this.jobId,
      status: status ?? this.status,
      progress: progress ?? this.progress,
    );
  }
}

class BatchConverterPage extends ConsumerStatefulWidget {
  const BatchConverterPage({super.key});

  @override
  ConsumerState<BatchConverterPage> createState() => _BatchConverterPageState();
}

class _BatchConverterPageState extends ConsumerState<BatchConverterPage> {
  final List<BatchItem> _items = [];
  String _outputFormat = 'mp4';
  String? _outputFolder;
  bool _isProcessing = false;
  int _completedCount = 0;

  Future<void> _addFiles() async {
    final allFormats = [
      ...AppConfig.videoInputFormats,
      ...AppConfig.audioInputFormats,
      ...AppConfig.imageInputFormats,
    ];
    final result = await FilePicker.platform.pickFiles(
      allowMultiple: true,
      type: FileType.custom,
      allowedExtensions: allFormats,
    );
    if (result != null) {
      setState(() {
        for (final file in result.files) {
          if (file.path != null) {
            _items.add(BatchItem(path: file.path!, name: file.name));
          }
        }
      });
    }
  }

  void _removeItem(int index) {
    if (!_isProcessing) {
      setState(() => _items.removeAt(index));
    }
  }

  void _clearItems() {
    if (!_isProcessing) {
      setState(() {
        _items.clear();
        _completedCount = 0;
      });
    }
  }

  Future<void> _openFolder(String path) async {
    await PlatformService.openFolder(path);
  }

  Future<void> _startBatch() async {
    if (_items.isEmpty) return;
    setState(() {
      _isProcessing = true;
      _completedCount = 0;
    });

    String outputDir = _outputFolder ?? p.dirname(_items.first.path);
    if (PlatformService.isMobile && _outputFolder == null) {
      outputDir = await PlatformService.getDefaultDownloadDirectory();
    }
    final conversionService = ref.read(conversionServiceProvider);
    final ffmpegService = ref.read(ffmpegServiceProvider);

    for (int i = 0; i < _items.length; i++) {
      if (!_isProcessing) break;

      final item = _items[i];
      final baseName = p.basenameWithoutExtension(item.path);
      final ext = p.extension(item.path).replaceFirst('.', '').toLowerCase();

      JobType type;
      if (AppConfig.videoInputFormats.contains(ext)) {
        type = JobType.videoConversion;
      } else if (AppConfig.audioInputFormats.contains(ext)) {
        type = JobType.audioConversion;
      } else {
        type = JobType.imageConversion;
      }

      final outputPath = p.join(outputDir, '${baseName}_batch.$_outputFormat');
      final job = MediaJob(
        type: type,
        inputPath: item.path,
        outputPath: outputPath,
        outputFormat: _outputFormat,
      );
      ref.read(jobListProvider.notifier).addJob(job);
      ref.read(jobListProvider.notifier).updateJob(job.id, status: JobStatus.processing, progress: 0.0);
      setState(() => _items[i] = item.copyWith(jobId: job.id, status: 'processing'));

      MediaInfo sourceInfo;
      try {
        sourceInfo = await ffmpegService.probeFile(item.path);
      } catch (_) {
        sourceInfo = MediaInfo(path: item.path, filename: item.name, format: ext, fileSizeBytes: 0);
      }

      final completer = Completer<void>();
      try {
        if (type == JobType.videoConversion) {
          await conversionService.convertVideo(
            job: job,
            sourceInfo: sourceInfo,
            targetFormat: _outputFormat,
            onProgress: (pr) {
              ref.read(jobListProvider.notifier).updateJob(job.id, progress: pr);
              if (mounted) {
                setState(() => _items[i] = _items[i].copyWith(progress: pr));
              }
            },
            onComplete: () {
              ref.read(jobListProvider.notifier).updateJob(job.id, status: JobStatus.completed, progress: 1.0);
              if (mounted) {
                setState(() {
                  _items[i] = _items[i].copyWith(status: 'completed', progress: 1.0);
                  _completedCount++;
                });
              }
              completer.complete();
            },
            onError: (e) {
              ref.read(jobListProvider.notifier).updateJob(job.id, status: JobStatus.failed, errorMessage: e);
              if (mounted) {
                setState(() => _items[i] = _items[i].copyWith(status: 'failed'));
              }
              completer.complete();
            },
          );
        } else if (type == JobType.audioConversion) {
          await conversionService.convertAudio(
            job: job,
            sourceInfo: sourceInfo,
            targetFormat: _outputFormat,
            onProgress: (pr) {
              ref.read(jobListProvider.notifier).updateJob(job.id, progress: pr);
              if (mounted) {
                setState(() => _items[i] = _items[i].copyWith(progress: pr));
              }
            },
            onComplete: () {
              ref.read(jobListProvider.notifier).updateJob(job.id, status: JobStatus.completed, progress: 1.0);
              if (mounted) {
                setState(() {
                  _items[i] = _items[i].copyWith(status: 'completed', progress: 1.0);
                  _completedCount++;
                });
              }
              completer.complete();
            },
            onError: (e) {
              ref.read(jobListProvider.notifier).updateJob(job.id, status: JobStatus.failed, errorMessage: e);
              if (mounted) {
                setState(() => _items[i] = _items[i].copyWith(status: 'failed'));
              }
              completer.complete();
            },
          );
        } else {
          await conversionService.convertImage(
            job: job,
            targetFormat: _outputFormat,
            onProgress: (pr) {
              ref.read(jobListProvider.notifier).updateJob(job.id, progress: pr);
              if (mounted) {
                setState(() => _items[i] = _items[i].copyWith(progress: pr));
              }
            },
            onComplete: () {
              ref.read(jobListProvider.notifier).updateJob(job.id, status: JobStatus.completed, progress: 1.0);
              if (mounted) {
                setState(() {
                  _items[i] = _items[i].copyWith(status: 'completed', progress: 1.0);
                  _completedCount++;
                });
              }
              completer.complete();
            },
            onError: (e) {
              ref.read(jobListProvider.notifier).updateJob(job.id, status: JobStatus.failed, errorMessage: e);
              if (mounted) {
                setState(() => _items[i] = _items[i].copyWith(status: 'failed'));
              }
              completer.complete();
            },
          );
        }
        await completer.future;
      } catch (e) {
        ref.read(jobListProvider.notifier).updateJob(job.id, status: JobStatus.failed, errorMessage: e.toString());
        if (mounted) {
          setState(() => _items[i] = _items[i].copyWith(status: 'failed'));
        }
      }
    }

    if (mounted) {
      setState(() => _isProcessing = false);
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Batch complete: $_completedCount of ${_items.length} files converted.'),
          action: SnackBarAction(
            label: 'Open Folder',
            onPressed: () => _openFolder(outputDir),
          ),
        ),
      );
    }
  }

  void _cancelBatch() {
    ref.read(conversionServiceProvider).cancelAll();
    setState(() => _isProcessing = false);
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final overallProgress = _items.isNotEmpty ? _completedCount / _items.length : 0.0;

    return Scaffold(
      body: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'Batch Media Converter',
                      style: theme.textTheme.headlineSmall?.copyWith(fontWeight: FontWeight.bold),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      'Convert multiple videos, audio files, or images in sequential order.',
                      style: theme.textTheme.bodyMedium?.copyWith(color: theme.colorScheme.onSurfaceVariant),
                    ),
                  ],
                ),
                Row(
                  children: [
                    OutlinedButton.icon(
                      onPressed: _isProcessing ? null : _addFiles,
                      icon: const Icon(Icons.add),
                      label: const Text('Add Files'),
                    ),
                    const SizedBox(width: 8),
                    if (_items.isNotEmpty && !_isProcessing)
                      TextButton.icon(
                        onPressed: _clearItems,
                        icon: const Icon(Icons.clear_all),
                        label: const Text('Clear All'),
                      ),
                  ],
                ),
              ],
            ),
            const SizedBox(height: 16),
            Card(
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: Row(
                  children: [
                    const Text('Target Output Format: ', style: TextStyle(fontWeight: FontWeight.w600)),
                    const SizedBox(width: 12),
                    DropdownButton<String>(
                      value: _outputFormat,
                      items: const [
                        DropdownMenuItem(value: 'mp4', child: Text('MP4 (Video)')),
                        DropdownMenuItem(value: 'mkv', child: Text('MKV (Video)')),
                        DropdownMenuItem(value: 'webm', child: Text('WEBM (Video)')),
                        DropdownMenuItem(value: 'mp3', child: Text('MP3 (Audio)')),
                        DropdownMenuItem(value: 'wav', child: Text('WAV (Audio)')),
                        DropdownMenuItem(value: 'flac', child: Text('FLAC (Audio)')),
                        DropdownMenuItem(value: 'jpg', child: Text('JPG (Image)')),
                        DropdownMenuItem(value: 'png', child: Text('PNG (Image)')),
                        DropdownMenuItem(value: 'webp', child: Text('WEBP (Image)')),
                      ],
                      onChanged: _isProcessing ? null : (v) => setState(() => _outputFormat = v!),
                    ),
                    const Spacer(),
                    if (_isProcessing)
                      OutlinedButton.icon(
                        onPressed: _cancelBatch,
                        icon: const Icon(Icons.stop, color: Colors.red),
                        label: const Text('Cancel Batch', style: TextStyle(color: Colors.red)),
                      )
                    else
                      ElevatedButton.icon(
                        onPressed: _items.isEmpty ? null : _startBatch,
                        icon: const Icon(Icons.play_arrow),
                        label: Text('Convert All (${_items.length})'),
                      ),
                  ],
                ),
              ),
            ),
            if (_isProcessing) ...[
              const SizedBox(height: 12),
              LinearProgressIndicator(value: overallProgress),
              const SizedBox(height: 4),
              Text(
                'Overall Progress: $_completedCount / ${_items.length} completed',
                style: theme.textTheme.bodySmall,
              ),
            ],
            const SizedBox(height: 16),
            Expanded(
              child: _items.isEmpty
                  ? Center(
                      child: Column(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Icon(
                            Icons.layers_outlined,
                            size: 64,
                            color: theme.colorScheme.onSurfaceVariant.withValues(alpha: 0.4),
                          ),
                          const SizedBox(height: 16),
                          Text('No files added to batch queue.', style: theme.textTheme.bodyLarge),
                          const SizedBox(height: 8),
                          ElevatedButton.icon(
                            onPressed: _addFiles,
                            icon: const Icon(Icons.add),
                            label: const Text('Select Files'),
                          ),
                        ],
                      ),
                    )
                  : ListView.separated(
                      itemCount: _items.length,
                      separatorBuilder: (_, __) => const SizedBox(height: 8),
                      itemBuilder: (context, index) {
                        final item = _items[index];
                        return Card(
                          margin: EdgeInsets.zero,
                          child: ListTile(
                            leading: Icon(
                              item.status == 'completed'
                                  ? Icons.check_circle
                                  : item.status == 'processing'
                                      ? Icons.hourglass_top
                                      : item.status == 'failed'
                                          ? Icons.error
                                          : Icons.insert_drive_file,
                              color: item.status == 'completed'
                                  ? Colors.green
                                  : item.status == 'processing'
                                      ? theme.colorScheme.primary
                                      : item.status == 'failed'
                                          ? Colors.red
                                          : null,
                            ),
                            title: Text(item.name, style: const TextStyle(fontWeight: FontWeight.w500)),
                            subtitle: item.status == 'processing'
                                ? Column(
                                    crossAxisAlignment: CrossAxisAlignment.start,
                                    children: [
                                      const SizedBox(height: 4),
                                      LinearProgressIndicator(value: item.progress),
                                      const SizedBox(height: 2),
                                      Text('${(item.progress * 100).toInt()}%', style: const TextStyle(fontSize: 11)),
                                    ],
                                  )
                                : Text('Status: ${item.status.toUpperCase()}', style: const TextStyle(fontSize: 12)),
                            trailing: _isProcessing
                                ? null
                                : IconButton(
                                    icon: const Icon(Icons.close, size: 18),
                                    onPressed: () => _removeItem(index),
                                  ),
                          ),
                        );
                      },
                    ),
            ),
          ],
        ),
      ),
    );
  }
}
