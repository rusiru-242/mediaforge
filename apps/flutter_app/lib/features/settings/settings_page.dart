import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:file_picker/file_picker.dart';
import '../../shared/providers/app_providers.dart';

class SettingsPage extends ConsumerStatefulWidget {
  const SettingsPage({super.key});

  @override
  ConsumerState<SettingsPage> createState() => _SettingsPageState();
}

class _SettingsPageState extends ConsumerState<SettingsPage> {
  late TextEditingController _ffmpegController;
  late TextEditingController _ffprobeController;
  bool _ffmpegChecked = false;
  bool? _ffmpegAvailable;

  @override
  void initState() {
    super.initState();
    final settings = ref.read(settingsServiceProvider);
    _ffmpegController = TextEditingController(text: settings.ffmpegPath);
    _ffprobeController = TextEditingController(text: settings.ffprobePath);
  }

  @override
  void dispose() {
    _ffmpegController.dispose();
    _ffprobeController.dispose();
    super.dispose();
  }

  Future<void> _checkFfmpeg() async {
    final ffmpeg = ref.read(ffmpegServiceProvider);
    final available = await ffmpeg.isAvailable();
    setState(() {
      _ffmpegChecked = true;
      _ffmpegAvailable = available;
    });
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final settings = ref.watch(settingsServiceProvider);
    final themeMode = ref.watch(themeModeProvider);

    return Scaffold(
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(24),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Application Settings',
              style: theme.textTheme.headlineSmall?.copyWith(fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 4),
            Text(
              'Configure offline media processing, defaults, themes, and execution paths.',
              style: theme.textTheme.bodyMedium?.copyWith(color: theme.colorScheme.onSurfaceVariant),
            ),
            const SizedBox(height: 24),

            // Appearance
            Card(
              child: Padding(
                padding: const EdgeInsets.all(20),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text('Appearance', style: theme.textTheme.titleSmall?.copyWith(fontWeight: FontWeight.w600)),
                    const SizedBox(height: 16),
                    Row(
                      children: [
                        const SizedBox(width: 140, child: Text('Theme Mode')),
                        DropdownButton<String>(
                          value: themeMode,
                          items: const [
                            DropdownMenuItem(value: 'system', child: Text('System Default')),
                            DropdownMenuItem(value: 'light', child: Text('Light Mode')),
                            DropdownMenuItem(value: 'dark', child: Text('Dark Mode')),
                          ],
                          onChanged: (v) {
                            if (v != null) {
                              ref.read(themeModeProvider.notifier).state = v;
                              settings.setThemeMode(v);
                            }
                          },
                        ),
                      ],
                    ),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 16),

            // FFmpeg Configuration
            Card(
              child: Padding(
                padding: const EdgeInsets.all(20),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text('FFmpeg & FFprobe Engine', style: theme.textTheme.titleSmall?.copyWith(fontWeight: FontWeight.w600)),
                    const SizedBox(height: 6),
                    Text(
                      'Used for native offline conversion and metadata extraction. Must be in PATH or configured below.',
                      style: theme.textTheme.bodySmall?.copyWith(color: theme.colorScheme.onSurfaceVariant),
                    ),
                    const SizedBox(height: 16),
                    TextField(
                      controller: _ffmpegController,
                      decoration: const InputDecoration(
                        labelText: 'FFmpeg Executable Path',
                        hintText: 'ffmpeg or C:\\ffmpeg\\bin\\ffmpeg.exe',
                        prefixIcon: Icon(Icons.terminal),
                      ),
                      onChanged: (v) => settings.setFfmpegPath(v),
                    ),
                    const SizedBox(height: 12),
                    TextField(
                      controller: _ffprobeController,
                      decoration: const InputDecoration(
                        labelText: 'FFprobe Executable Path',
                        hintText: 'ffprobe or C:\\ffmpeg\\bin\\ffprobe.exe',
                        prefixIcon: Icon(Icons.terminal),
                      ),
                      onChanged: (v) => settings.setFfprobePath(v),
                    ),
                    const SizedBox(height: 16),
                    Row(
                      children: [
                        ElevatedButton.icon(
                          onPressed: _checkFfmpeg,
                          icon: const Icon(Icons.check_circle_outline, size: 18),
                          label: const Text('Test Executable Paths'),
                        ),
                        const SizedBox(width: 12),
                        if (_ffmpegChecked) ...[
                          Icon(
                            _ffmpegAvailable == true ? Icons.check_circle : Icons.error,
                            color: _ffmpegAvailable == true ? Colors.green : Colors.red,
                            size: 20,
                          ),
                          const SizedBox(width: 6),
                          Text(
                            _ffmpegAvailable == true ? 'FFmpeg is verified and ready' : 'FFmpeg binary not reachable',
                            style: TextStyle(
                              color: _ffmpegAvailable == true ? Colors.green : Colors.red,
                              fontWeight: FontWeight.w600,
                              fontSize: 13,
                            ),
                          ),
                        ],
                      ],
                    ),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 16),

            // Output Folder Configuration
            Card(
              child: Padding(
                padding: const EdgeInsets.all(20),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text('Output Storage', style: theme.textTheme.titleSmall?.copyWith(fontWeight: FontWeight.w600)),
                    const SizedBox(height: 6),
                    Text(
                      settings.outputFolder.isEmpty ? 'Same folder as source file (Default)' : settings.outputFolder,
                      style: theme.textTheme.bodySmall?.copyWith(color: theme.colorScheme.onSurfaceVariant),
                    ),
                    const SizedBox(height: 12),
                    Row(
                      children: [
                        ElevatedButton.icon(
                          onPressed: () async {
                            final folder = await FilePicker.platform.getDirectoryPath();
                            if (folder != null) {
                              await settings.setOutputFolder(folder);
                              setState(() {});
                            }
                          },
                          icon: const Icon(Icons.folder_open, size: 18),
                          label: const Text('Browse Output Folder'),
                        ),
                        if (settings.outputFolder.isNotEmpty) ...[
                          const SizedBox(width: 12),
                          TextButton(
                            onPressed: () async {
                              await settings.setOutputFolder('');
                              setState(() {});
                            },
                            child: const Text('Reset to Default'),
                          ),
                        ],
                      ],
                    ),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 16),

            // Default Format & Quality Settings
            Card(
              child: Padding(
                padding: const EdgeInsets.all(20),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text('Default Format & Presets', style: theme.textTheme.titleSmall?.copyWith(fontWeight: FontWeight.w600)),
                    const SizedBox(height: 16),
                    Row(
                      children: [
                        const SizedBox(width: 140, child: Text('Default Video Format')),
                        DropdownButton<String>(
                          value: settings.defaultVideoFormat,
                          items: const ['mp4', 'mkv', 'webm', 'mov', 'avi']
                              .map((f) => DropdownMenuItem(value: f, child: Text(f.toUpperCase())))
                              .toList(),
                          onChanged: (v) {
                            if (v != null) {
                              settings.setDefaultVideoFormat(v);
                              setState(() {});
                            }
                          },
                        ),
                      ],
                    ),
                    const SizedBox(height: 10),
                    Row(
                      children: [
                        const SizedBox(width: 140, child: Text('Default Audio Format')),
                        DropdownButton<String>(
                          value: settings.defaultAudioFormat,
                          items: const ['mp3', 'wav', 'aac', 'flac', 'm4a', 'ogg']
                              .map((f) => DropdownMenuItem(value: f, child: Text(f.toUpperCase())))
                              .toList(),
                          onChanged: (v) {
                            if (v != null) {
                              settings.setDefaultAudioFormat(v);
                              setState(() {});
                            }
                          },
                        ),
                      ],
                    ),
                    const SizedBox(height: 10),
                    Row(
                      children: [
                        const SizedBox(width: 140, child: Text('Default Image Format')),
                        DropdownButton<String>(
                          value: settings.defaultImageFormat,
                          items: const ['jpg', 'png', 'webp']
                              .map((f) => DropdownMenuItem(value: f, child: Text(f.toUpperCase())))
                              .toList(),
                          onChanged: (v) {
                            if (v != null) {
                              settings.setDefaultImageFormat(v);
                              setState(() {});
                            }
                          },
                        ),
                      ],
                    ),
                    const SizedBox(height: 10),
                    Row(
                      children: [
                        const SizedBox(width: 140, child: Text('Default Quality Preset')),
                        DropdownButton<String>(
                          value: settings.defaultQuality,
                          items: const ['High', 'Medium', 'Low']
                              .map((q) => DropdownMenuItem(value: q, child: Text(q)))
                              .toList(),
                          onChanged: (v) {
                            if (v != null) {
                              settings.setDefaultQuality(v);
                              setState(() {});
                            }
                          },
                        ),
                      ],
                    ),
                    const SizedBox(height: 10),
                    Row(
                      children: [
                        const SizedBox(width: 140, child: Text('Max Concurrent Jobs')),
                        DropdownButton<int>(
                          value: settings.maxConcurrentJobs,
                          items: const [1, 2, 3, 4, 8]
                              .map((n) => DropdownMenuItem(value: n, child: Text('$n workers')))
                              .toList(),
                          onChanged: (v) {
                            if (v != null) {
                              settings.setMaxConcurrentJobs(v);
                              setState(() {});
                            }
                          },
                        ),
                      ],
                    ),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 24),
            Center(
              child: Text(
                'MediaForge Desktop v0.1.0 • 100% Database-Free & Privacy-First Architecture',
                style: theme.textTheme.bodySmall?.copyWith(color: theme.colorScheme.onSurfaceVariant),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
