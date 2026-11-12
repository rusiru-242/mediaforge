import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:file_picker/file_picker.dart';
import 'package:path/path.dart' as p;
import 'dart:io';
import '../../core/config/app_config.dart';
import '../../shared/models/media_job.dart';
import '../../shared/models/media_info.dart';
import '../../shared/providers/app_providers.dart';
import '../../shared/widgets/common_widgets.dart';

class AudioConverterPage extends ConsumerStatefulWidget {
  const AudioConverterPage({super.key});

  @override
  ConsumerState<AudioConverterPage> createState() => _AudioConverterPageState();
}

class _AudioConverterPageState extends ConsumerState<AudioConverterPage> {
  String? _inputPath;
  MediaInfo? _mediaInfo;
  String _outputFormat = 'mp3';
  String _bitrate = '192k';
  String _sampleRate = 'Original';
  String _channels = 'Stereo';
  String? _outputFolder;
  bool _isLoading = false;
  String? _error;
  String? _currentJobId;

  final _sampleRates = const ['Original', '44100', '48000', '22050'];
  final _channelOptions = const ['Stereo', 'Mono'];

  Future<void> _pickFile() async {
    // Allow both audio and video files (for audio extraction)
    final allFormats = [...AppConfig.audioInputFormats, ...AppConfig.videoInputFormats];
    final result = await FilePicker.platform.pickFiles(
      type: FileType.custom,
      allowedExtensions: allFormats,
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
    if (Platform.isWindows) {
      await Process.run('explorer', [path]);
    } else if (Platform.isMacOS) {
      await Process.run('open', [path]);
    } else {
      await Process.run('xdg-open', [path]);
    }
  }

  Future<void> _startConversion() async {
    if (_inputPath == null) return;
    final outputDir = _outputFolder ?? p.dirname(_inputPath!);
    final baseName = p.basenameWithoutExtension(_inputPath!);
    final outputPath = p.join(outputDir, '${baseName}_converted.$_outputFormat');

    final job = MediaJob(
      type: JobType.audioConversion,
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
      await conversionService.convertAudio(
        job: job,
        sourceInfo: _mediaInfo ??
            MediaInfo(
              path: _inputPath!,
              filename: p.basename(_inputPath!),
              format: _outputFormat,
              fileSizeBytes: 0,
            ),
        targetFormat: _outputFormat,
        bitrate: _bitrate,
        sampleRate: _sampleRate == 'Original' ? null : _sampleRate,
        channels: _channels,
        onProgress: (p) => ref.read(jobListProvider.notifier).updateJob(job.id, progress: p),
        onComplete: () {
          ref.read(jobListProvider.notifier).updateJob(job.id, status: JobStatus.completed, progress: 1.0);
          if (mounted) {
            ScaffoldMessenger.of(context).showSnackBar(
              SnackBar(
                content: Text('Audio conversion complete: $outputPath'),
                action: SnackBarAction(
                  label: 'Open Folder',
                  onPressed: () => _openFolder(outputDir),
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
              'Offline Audio Converter & Extraction',
              style: theme.textTheme.headlineSmall?.copyWith(fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 4),
            Text(
              'Convert audio or extract MP3 audio directly from video files (MP4, MKV, MOV, WEBM).',
              style: theme.textTheme.bodyMedium?.copyWith(color: theme.colorScheme.onSurfaceVariant),
            ),
            const SizedBox(height: 24),
            FilePickerCard(
              inputPath: _inputPath,
              mediaInfo: _mediaInfo,
              isLoading: _isLoading,
              onPickFile: _pickFile,
              acceptedFormats: [...AppConfig.audioInputFormats, ...AppConfig.videoInputFormats],
              title: 'Select Audio File or Video for Audio Extraction',
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
                      'Audio Settings',
                      style: theme.textTheme.titleSmall?.copyWith(fontWeight: FontWeight.w600),
                    ),
                    const SizedBox(height: 16),
                    SettingRow(
                      label: 'Output Format',
                      helpText: 'Target audio codec',
                      child: DropdownButton<String>(
                        value: _outputFormat,
                        isExpanded: true,
                        items: AppConfig.supportedAudioFormats
                            .map((f) => DropdownMenuItem(value: f, child: Text(f.toUpperCase())))
                            .toList(),
                        onChanged: (v) => setState(() => _outputFormat = v!),
                      ),
                    ),
                    SettingRow(
                      label: 'Audio Bitrate',
                      helpText: 'e.g. 192k, 320k',
                      child: DropdownButton<String>(
                        value: _bitrate,
                        isExpanded: true,
                        items: const ['64k', '96k', '128k', '192k', '256k', '320k']
                            .map((b) => DropdownMenuItem(value: b, child: Text(b)))
                            .toList(),
                        onChanged: (v) => setState(() => _bitrate = v!),
                      ),
                    ),
                    SettingRow(
                      label: 'Sample Rate',
                      helpText: 'Frequency',
                      child: DropdownButton<String>(
                        value: _sampleRate,
                        isExpanded: true,
                        items: _sampleRates
                            .map((r) => DropdownMenuItem(value: r, child: Text(r == 'Original' ? 'Original' : '$r Hz')))
                            .toList(),
                        onChanged: (v) => setState(() => _sampleRate = v!),
                      ),
                    ),
                    SettingRow(
                      label: 'Channels',
                      helpText: 'Stereo / Mono',
                      child: DropdownButton<String>(
                        value: _channels,
                        isExpanded: true,
                        items: _channelOptions
                            .map((c) => DropdownMenuItem(value: c, child: Text(c)))
                            .toList(),
                        onChanged: (v) => setState(() => _channels = v!),
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
                  label: Text(_mediaInfo?.isVideo == true ? 'Extract Audio' : 'Start Conversion'),
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
                '${(currentJob.progress * 100).toInt()}% complete',
                style: theme.textTheme.bodySmall,
              ),
            ],
          ],
        ),
      ),
    );
  }
}
