import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:file_picker/file_picker.dart';
import 'package:path/path.dart' as p;
import 'dart:io';
import '../../core/config/app_config.dart';
import '../../core/services/platform_service.dart';
import '../../shared/models/media_job.dart';
import '../../shared/models/media_info.dart';
import '../../shared/providers/app_providers.dart';
import '../../shared/widgets/common_widgets.dart';

class ImageConverterPage extends ConsumerStatefulWidget {
  const ImageConverterPage({super.key});

  @override
  ConsumerState<ImageConverterPage> createState() => _ImageConverterPageState();
}

class _ImageConverterPageState extends ConsumerState<ImageConverterPage> {
  String? _inputPath;
  MediaInfo? _mediaInfo;
  String _outputFormat = 'jpg';
  int _quality = 85;
  String? _outputFolder;
  bool _isLoading = false;
  String? _error;
  String? _currentJobId;

  Future<void> _pickFile() async {
    final result = await FilePicker.platform.pickFiles(
      type: FileType.custom,
      allowedExtensions: AppConfig.imageInputFormats,
    );
    if (result != null && result.files.single.path != null) {
      setState(() {
        _inputPath = result.files.single.path;
        _mediaInfo = null;
        _error = null;
      });
      await _probeFile();
    }
  }

  Future<void> _pickOutputFolder() async {
    final folder = await FilePicker.platform.getDirectoryPath();
    if (folder != null) {
      setState(() => _outputFolder = folder);
    }
  }

  Future<void> _probeFile() async {
    if (_inputPath == null) return;
    setState(() => _isLoading = true);
    try {
      final ffmpeg = ref.read(ffmpegServiceProvider);
      final info = await ffmpeg.probeFile(_inputPath!);
      setState(() {
        _mediaInfo = info;
        _isLoading = false;
      });
    } catch (e) {
      setState(() {
        _error = e.toString();
        _isLoading = false;
      });
    }
  }

  Future<void> _openFolder(String path) async {
    await PlatformService.openFolder(path);
  }

  Future<void> _startConversion() async {
    if (_inputPath == null) return;
    String outputDir = _outputFolder ?? p.dirname(_inputPath!);
    if (PlatformService.isMobile && _outputFolder == null) {
      outputDir = await PlatformService.getDefaultDownloadDirectory();
    }
    final baseName = p.basenameWithoutExtension(_inputPath!);
    final outputPath = p.join(outputDir, '${baseName}_converted.$_outputFormat');

    final job = MediaJob(
      type: JobType.imageConversion,
      inputPath: _inputPath!,
      outputPath: outputPath,
      outputFormat: _outputFormat,
    );
    ref.read(jobListProvider.notifier).addJob(job);
    ref.read(jobListProvider.notifier).updateJob(job.id, status: JobStatus.processing, progress: 0.0);
    setState(() {
      _currentJobId = job.id;
    });

    final conversionService = ref.read(conversionServiceProvider);
    try {
      await conversionService.convertImage(
        job: job,
        targetFormat: _outputFormat,
        quality: _quality,
        onProgress: (p) => ref.read(jobListProvider.notifier).updateJob(job.id, progress: p),
        onComplete: () {
          ref.read(jobListProvider.notifier).updateJob(job.id, status: JobStatus.completed, progress: 1.0);
          if (mounted) {
            ScaffoldMessenger.of(context).showSnackBar(
              SnackBar(
                content: Text('Image converted: $outputPath'),
                action: SnackBarAction(
                  label: PlatformService.isMobile ? 'Share' : 'Open Folder',
                  onPressed: () {
                    if (PlatformService.isMobile) {
                      PlatformService.shareFile(outputPath);
                    } else {
                      _openFolder(outputDir);
                    }
                  },
                ),
              ),
            );
          }
        },
        onError: (err) {
          ref.read(jobListProvider.notifier).updateJob(job.id, status: JobStatus.failed, errorMessage: err);
          if (mounted) {
            setState(() => _error = err);
          }
        },
      );
    } catch (e) {
      ref.read(jobListProvider.notifier).updateJob(job.id, status: JobStatus.failed, errorMessage: e.toString());
      if (mounted) {
        setState(() => _error = e.toString());
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final jobs = ref.watch(jobListProvider);
    final currentJob = _currentJobId != null
        ? jobs.where((j) => j.id == _currentJobId).firstOrNull
        : null;
    final isProcessing = currentJob?.status == JobStatus.processing;

    return Scaffold(
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(24),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Offline Image Converter',
              style: theme.textTheme.headlineSmall?.copyWith(fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 4),
            Text(
              'Convert images between JPG, PNG, WEBP, and AVIF formats with quality and compression control.',
              style: theme.textTheme.bodyMedium?.copyWith(color: theme.colorScheme.onSurfaceVariant),
            ),
            const SizedBox(height: 24),
            FilePickerCard(
              inputPath: _inputPath,
              mediaInfo: _mediaInfo,
              isLoading: _isLoading,
              onPickFile: _pickFile,
              acceptedFormats: AppConfig.imageInputFormats,
              title: 'Select Image File for Conversion',
            ),
            if (_inputPath != null && !_isLoading) ...[
              const SizedBox(height: 8),
              if (_inputPath!.toLowerCase().endsWith('.png') ||
                  _inputPath!.toLowerCase().endsWith('.jpg') ||
                  _inputPath!.toLowerCase().endsWith('.jpeg') ||
                  _inputPath!.toLowerCase().endsWith('.webp'))
                Card(
                  child: Padding(
                    padding: const EdgeInsets.all(16),
                    child: Center(
                      child: ClipRRect(
                        borderRadius: BorderRadius.circular(8),
                        child: Image.file(
                          File(_inputPath!),
                          height: 180,
                          fit: BoxFit.contain,
                          errorBuilder: (_, __, ___) => const Icon(Icons.broken_image, size: 60),
                        ),
                      ),
                    ),
                  ),
                ),
            ],
            const SizedBox(height: 16),
            Card(
              child: Padding(
                padding: const EdgeInsets.all(20),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'Image Conversion Settings',
                      style: theme.textTheme.titleSmall?.copyWith(fontWeight: FontWeight.w600),
                    ),
                    const SizedBox(height: 16),
                    SettingRow(
                      label: 'Output Format',
                      helpText: 'Target image extension',
                      child: DropdownButton<String>(
                        value: _outputFormat,
                        isExpanded: true,
                        items: AppConfig.supportedImageFormats
                            .map((f) => DropdownMenuItem(value: f, child: Text(f.toUpperCase())))
                            .toList(),
                        onChanged: (v) => setState(() => _outputFormat = v!),
                      ),
                    ),
                    if (_outputFormat != 'png')
                      SettingRow(
                        label: 'Quality / Compression',
                        helpText: '$_quality%',
                        child: Slider(
                          value: _quality.toDouble(),
                          min: 10,
                          max: 100,
                          divisions: 18,
                          label: '$_quality%',
                          onChanged: (v) => setState(() => _quality = v.round()),
                        ),
                      ),
                    SettingRow(
                      label: 'Output Folder',
                      helpText: 'Where to save the result',
                      child: Row(
                        children: [
                          Expanded(
                            child: Text(
                              _outputFolder ?? 'Same folder as source file',
                              style: theme.textTheme.bodySmall,
                              overflow: TextOverflow.ellipsis,
                            ),
                          ),
                          TextButton.icon(
                            onPressed: _pickOutputFolder,
                            icon: const Icon(Icons.folder_open, size: 16),
                            label: const Text('Change'),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
            ),
            if (_error != null) ...[
              const SizedBox(height: 16),
              Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: Colors.red.withValues(alpha: 0.1),
                  borderRadius: BorderRadius.circular(8),
                  border: Border.all(color: Colors.red.withValues(alpha: 0.3)),
                ),
                child: Row(
                  children: [
                    const Icon(Icons.error_outline, color: Colors.red, size: 20),
                    const SizedBox(width: 8),
                    Expanded(child: Text(_error!, style: const TextStyle(color: Colors.red))),
                  ],
                ),
              ),
            ],
            const SizedBox(height: 20),
            Row(
              children: [
                ElevatedButton.icon(
                  onPressed: (_inputPath == null || isProcessing) ? null : _startConversion,
                  icon: const Icon(Icons.image),
                  label: const Text('Convert Image'),
                ),
                if (isProcessing) ...[
                  const SizedBox(width: 12),
                  OutlinedButton.icon(
                    onPressed: () async {
                      if (_currentJobId != null) {
                        await ref.read(conversionServiceProvider).cancelJob(_currentJobId!);
                        ref
                            .read(jobListProvider.notifier)
                            .updateJob(_currentJobId!, status: JobStatus.cancelled);
                        setState(() => _currentJobId = null);
                      }
                    },
                    icon: const Icon(Icons.stop),
                    label: const Text('Cancel'),
                  ),
                ],
              ],
            ),
            if (currentJob != null && isProcessing) ...[
              const SizedBox(height: 20),
              LinearProgressIndicator(value: currentJob.progress),
            ],
          ],
        ),
      ),
    );
  }
}
