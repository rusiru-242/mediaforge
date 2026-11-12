import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:file_picker/file_picker.dart';
import 'package:path/path.dart' as p;
import '../../core/config/app_config.dart';
import '../../core/services/platform_service.dart';
import '../../shared/models/media_job.dart';
import '../../shared/models/media_info.dart';
import '../../shared/providers/app_providers.dart';
import '../../shared/widgets/common_widgets.dart';

class VideoConverterPage extends ConsumerStatefulWidget {
  const VideoConverterPage({super.key});

  @override
  ConsumerState<VideoConverterPage> createState() => _VideoConverterPageState();
}

class _VideoConverterPageState extends ConsumerState<VideoConverterPage> {
  String? _inputPath;
  MediaInfo? _mediaInfo;
  String _outputFormat = 'mp4';
  String _resolution = 'Original';
  String _videoBitrate = '';
  final String _audioBitrate = '128k';
  final String _frameRate = 'Original';
  String? _outputFolder;
  bool _isLoading = false;
  String? _error;
  String? _currentJobId;

  final _resolutions = const ['Original', '1920x1080', '1280x720', '854x480', '640x360'];

  Future<void> _pickFile() async {
    final result = await FilePicker.platform.pickFiles(
      type: FileType.custom,
      allowedExtensions: AppConfig.videoInputFormats,
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
    setState(() {
      _isLoading = true;
      _error = null;
    });
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
      type: JobType.videoConversion,
      inputPath: _inputPath!,
      outputPath: outputPath,
      outputFormat: _outputFormat,
      settings: {
        'resolution': _resolution,
        'videoBitrate': _videoBitrate,
        'audioBitrate': _audioBitrate,
        'frameRate': _frameRate,
      },
    );

    ref.read(jobListProvider.notifier).addJob(job);
    setState(() {
      _currentJobId = job.id;
    });
    ref.read(jobListProvider.notifier).updateJob(job.id, status: JobStatus.processing, progress: 0.0);

    final conversionService = ref.read(conversionServiceProvider);
    try {
      await conversionService.convertVideo(
        job: job,
        sourceInfo: _mediaInfo ??
            MediaInfo(
              path: _inputPath!,
              filename: p.basename(_inputPath!),
              format: _outputFormat,
              fileSizeBytes: 0,
            ),
        targetFormat: _outputFormat,
        resolution: _resolution == 'Original' ? null : _resolution,
        videoBitrate: _videoBitrate.isEmpty ? null : _videoBitrate,
        audiobitrate: _audioBitrate.isEmpty ? null : _audioBitrate,
        frameRate: _frameRate == 'Original' ? null : _frameRate,
        onProgress: (progress) {
          ref.read(jobListProvider.notifier).updateJob(job.id, progress: progress);
        },
        onComplete: () {
          ref.read(jobListProvider.notifier).updateJob(job.id, status: JobStatus.completed, progress: 1.0);
          if (mounted) {
            ScaffoldMessenger.of(context).showSnackBar(
              SnackBar(
                content: Text('Video conversion completed: $outputPath'),
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
        onError: (error) {
          ref.read(jobListProvider.notifier).updateJob(job.id, status: JobStatus.failed, errorMessage: error);
          if (mounted) {
            setState(() => _error = error);
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
              'Offline Video Converter',
              style: theme.textTheme.headlineSmall?.copyWith(fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 4),
            Text(
              'Convert videos offline using local FFmpeg. No internet or backend required.',
              style: theme.textTheme.bodyMedium?.copyWith(color: theme.colorScheme.onSurfaceVariant),
            ),
            const SizedBox(height: 24),
            FilePickerCard(
              inputPath: _inputPath,
              mediaInfo: _mediaInfo,
              isLoading: _isLoading,
              onPickFile: _pickFile,
              acceptedFormats: AppConfig.videoInputFormats,
              title: 'Select Video File for Conversion',
            ),
            if (_mediaInfo != null) MediaInfoPanel(mediaInfo: _mediaInfo!),
            const SizedBox(height: 16),
            Card(
              child: Padding(
                padding: const EdgeInsets.all(20),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'Video Conversion Settings',
                      style: theme.textTheme.titleSmall?.copyWith(fontWeight: FontWeight.w600),
                    ),
                    const SizedBox(height: 16),
                    SettingRow(
                      label: 'Output Format',
                      helpText: 'Container format',
                      child: DropdownButton<String>(
                        value: _outputFormat,
                        isExpanded: true,
                        items: AppConfig.supportedVideoFormats
                            .map((f) => DropdownMenuItem(value: f, child: Text(f.toUpperCase())))
                            .toList(),
                        onChanged: (v) => setState(() => _outputFormat = v!),
                      ),
                    ),
                    SettingRow(
                      label: 'Target Resolution',
                      helpText: 'Preserves aspect ratio',
                      child: DropdownButton<String>(
                        value: _resolution,
                        isExpanded: true,
                        items: _resolutions
                            .map((r) => DropdownMenuItem(value: r, child: Text(r)))
                            .toList(),
                        onChanged: (v) => setState(() => _resolution = v!),
                      ),
                    ),
                    SettingRow(
                      label: 'Video Bitrate',
                      helpText: 'e.g. 2M, 5M (optional)',
                      child: TextField(
                        decoration: const InputDecoration(hintText: 'Auto / Default'),
                        onChanged: (v) => setState(() => _videoBitrate = v.trim()),
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
                  icon: const Icon(Icons.play_arrow),
                  label: const Text('Start Conversion'),
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
              const SizedBox(height: 6),
              Text(
                '${(currentJob.progress * 100).toInt()}% transcode progress',
                style: theme.textTheme.bodySmall,
              ),
            ],
          ],
        ),
      ),
    );
  }
}
