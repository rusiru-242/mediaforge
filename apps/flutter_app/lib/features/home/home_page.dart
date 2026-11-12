import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:file_picker/file_picker.dart';
import 'package:path/path.dart' as p;
import '../../core/config/app_config.dart';
import '../../core/services/platform_service.dart';
import '../../shared/models/media_job.dart';
import '../../shared/providers/app_providers.dart';
import '../shell/app_shell.dart';

class HomePage extends ConsumerStatefulWidget {
  const HomePage({super.key});

  @override
  ConsumerState<HomePage> createState() => _HomePageState();
}

class _HomePageState extends ConsumerState<HomePage> {
  final _quickUrlController = TextEditingController();

  @override
  void dispose() {
    _quickUrlController.dispose();
    super.dispose();
  }

  Future<void> _openOutputFolder() async {
    final settings = ref.read(settingsServiceProvider);
    String target = settings.outputFolder;
    if (target.isEmpty) {
      target = await PlatformService.getDefaultDownloadDirectory();
    }
    await PlatformService.openFolder(target);
  }

  Future<void> _handleFileDrop() async {
    final result = await FilePicker.platform.pickFiles(
      type: FileType.custom,
      allowedExtensions: [
        ...AppConfig.videoInputFormats,
        ...AppConfig.audioInputFormats,
        ...AppConfig.imageInputFormats,
      ],
    );
    if (result != null && result.files.single.path != null) {
      final ext = p.extension(result.files.single.path!).replaceFirst('.', '').toLowerCase();
      if (AppConfig.videoInputFormats.contains(ext)) {
        ref.read(navigationIndexProvider.notifier).state = 2; // Video Converter
      } else if (AppConfig.audioInputFormats.contains(ext)) {
        ref.read(navigationIndexProvider.notifier).state = 3; // Audio Converter
      } else {
        ref.read(navigationIndexProvider.notifier).state = 4; // Image Converter
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final jobs = ref.watch(jobListProvider);
    final activeJobs = jobs.where((j) => j.status == JobStatus.queued || j.status == JobStatus.processing).toList();
    final recentJobs = jobs.where((j) => j.status == JobStatus.completed || j.status == JobStatus.failed || j.status == JobStatus.cancelled).toList();

    final screenWidth = MediaQuery.of(context).size.width;
    final isMobile = screenWidth < 720;
    final pagePadding = isMobile ? const EdgeInsets.all(16) : const EdgeInsets.all(28);
    final suiteCardWidth = isMobile ? (screenWidth - 48) / 2 : 170.0;

    return Scaffold(
      body: SingleChildScrollView(
        padding: pagePadding,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Header Branding
            if (isMobile) ...[
              Row(
                children: [
                  Container(
                    width: 44,
                    height: 44,
                    decoration: BoxDecoration(
                      gradient: LinearGradient(
                        colors: [theme.colorScheme.primary, theme.colorScheme.secondary],
                        begin: Alignment.topLeft,
                        end: Alignment.bottomRight,
                      ),
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: const Icon(Icons.movie_filter_rounded, color: Colors.white, size: 24),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          'MediaForge Desktop',
                          style: theme.textTheme.titleMedium?.copyWith(fontWeight: FontWeight.bold),
                        ),
                        Text(
                          'Offline converter & downloader',
                          style: theme.textTheme.bodySmall?.copyWith(color: theme.colorScheme.onSurfaceVariant),
                          overflow: TextOverflow.ellipsis,
                        ),
                      ],
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 12),
              OutlinedButton.icon(
                onPressed: _openOutputFolder,
                icon: const Icon(Icons.folder_open, size: 16),
                label: const Text('Open Output Folder'),
              ),
            ] else ...[
              Row(
                children: [
                  Expanded(
                    child: Row(
                      children: [
                        Container(
                          width: 48,
                          height: 48,
                          decoration: BoxDecoration(
                            gradient: LinearGradient(
                              colors: [theme.colorScheme.primary, theme.colorScheme.secondary],
                              begin: Alignment.topLeft,
                              end: Alignment.bottomRight,
                            ),
                            borderRadius: BorderRadius.circular(12),
                          ),
                          child: const Icon(Icons.movie_filter_rounded, color: Colors.white, size: 28),
                        ),
                        const SizedBox(width: 16),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                'MediaForge Desktop',
                                style: theme.textTheme.headlineSmall?.copyWith(fontWeight: FontWeight.bold),
                              ),
                              Text(
                                'All-in-one offline media converter & URL downloader (Database-free)',
                                style: theme.textTheme.bodyMedium?.copyWith(color: theme.colorScheme.onSurfaceVariant),
                                overflow: TextOverflow.ellipsis,
                              ),
                            ],
                          ),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(width: 16),
                  OutlinedButton.icon(
                    onPressed: _openOutputFolder,
                    icon: const Icon(Icons.folder_open, size: 18),
                    label: const Text('Open Output Folder'),
                  ),
                ],
              ),
            ],
            const SizedBox(height: 28),

            // Quick Media Downloader Input
            Card(
              child: Padding(
                padding: const EdgeInsets.all(20),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'Quick Media Downloader',
                      style: theme.textTheme.titleSmall?.copyWith(fontWeight: FontWeight.w600),
                    ),
                    const SizedBox(height: 8),
                    if (isMobile) ...[
                      TextField(
                        controller: _quickUrlController,
                        decoration: const InputDecoration(
                          hintText: 'Paste media stream URL (https://...)',
                          prefixIcon: Icon(Icons.link),
                        ),
                        onSubmitted: (_) {
                          ref.read(navigationIndexProvider.notifier).state = 1;
                        },
                      ),
                      const SizedBox(height: 10),
                      ElevatedButton.icon(
                        onPressed: () {
                          ref.read(navigationIndexProvider.notifier).state = 1;
                        },
                        icon: const Icon(Icons.download),
                        label: const Text('Go to Downloader'),
                      ),
                    ] else ...[
                      Row(
                        children: [
                          Expanded(
                            child: TextField(
                              controller: _quickUrlController,
                              decoration: const InputDecoration(
                                hintText: 'Paste video or audio stream URL (https://...)',
                                prefixIcon: Icon(Icons.link),
                              ),
                              onSubmitted: (_) {
                                ref.read(navigationIndexProvider.notifier).state = 1;
                              },
                            ),
                          ),
                          const SizedBox(width: 12),
                          ElevatedButton.icon(
                            onPressed: () {
                              ref.read(navigationIndexProvider.notifier).state = 1;
                            },
                            icon: const Icon(Icons.download),
                            label: const Text('Go to Downloader'),
                          ),
                        ],
                      ),
                    ],
                  ],
                ),
              ),
            ),
            const SizedBox(height: 20),

            // Drag-and-drop / Browse Quick Area
            Card(
              child: InkWell(
                onTap: _handleFileDrop,
                borderRadius: BorderRadius.circular(12),
                child: Padding(
                  padding: const EdgeInsets.symmetric(vertical: 24, horizontal: 20),
                  child: Row(
                    children: [
                      Container(
                        width: 52,
                        height: 52,
                        decoration: BoxDecoration(
                          color: theme.colorScheme.primary.withValues(alpha: 0.1),
                          borderRadius: BorderRadius.circular(12),
                        ),
                        child: Icon(Icons.upload_file_rounded, color: theme.colorScheme.primary, size: 28),
                      ),
                      const SizedBox(width: 16),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              'Drop any media file here or click to browse',
                              style: theme.textTheme.titleSmall?.copyWith(fontWeight: FontWeight.w600),
                            ),
                            Text(
                              'Automatically detects video, audio, or image files and routes to the right converter.',
                              style: theme.textTheme.bodySmall?.copyWith(color: theme.colorScheme.onSurfaceVariant),
                            ),
                          ],
                        ),
                      ),
                      const Icon(Icons.arrow_forward_ios, size: 16),
                    ],
                  ),
                ),
              ),
            ),
            const SizedBox(height: 28),

            // Conversion Suite Quick Shortcuts
            Text('Conversion Suites', style: theme.textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w600)),
            const SizedBox(height: 12),
            Wrap(
              spacing: 16,
              runSpacing: 16,
              children: [
                _SuiteCard(
                  icon: Icons.video_file_outlined,
                  label: 'Video Converter',
                  desc: 'MP4, MKV, WEBM, MOV, AVI',
                  color: Colors.blue,
                  width: suiteCardWidth,
                  onTap: () => ref.read(navigationIndexProvider.notifier).state = 2,
                ),
                _SuiteCard(
                  icon: Icons.audio_file_outlined,
                  label: 'Audio & Extraction',
                  desc: 'MP3, WAV, AAC, FLAC, M4A',
                  color: Colors.green,
                  width: suiteCardWidth,
                  onTap: () => ref.read(navigationIndexProvider.notifier).state = 3,
                ),
                _SuiteCard(
                  icon: Icons.image_outlined,
                  label: 'Image Converter',
                  desc: 'JPG, PNG, WEBP, AVIF',
                  color: Colors.orange,
                  width: suiteCardWidth,
                  onTap: () => ref.read(navigationIndexProvider.notifier).state = 4,
                ),
                _SuiteCard(
                  icon: Icons.layers_outlined,
                  label: 'Batch Converter',
                  desc: 'Multiple files queue',
                  color: Colors.purple,
                  width: suiteCardWidth,
                  onTap: () => ref.read(navigationIndexProvider.notifier).state = 5,
                ),
              ],
            ),

            // Active processing jobs
            if (activeJobs.isNotEmpty) ...[
              const SizedBox(height: 32),
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text('Active Processing Jobs (${activeJobs.length})', style: theme.textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w600)),
                  TextButton.icon(
                    onPressed: () => ref.read(conversionServiceProvider).cancelAll(),
                    icon: const Icon(Icons.stop_circle_outlined, color: Colors.red, size: 18),
                    label: const Text('Cancel All', style: TextStyle(color: Colors.red)),
                  ),
                ],
              ),
              const SizedBox(height: 12),
              ...activeJobs.map((job) => _ActiveJobCard(job: job)),
            ],

            // Recent session results (In memory only)
            if (recentJobs.isNotEmpty) ...[
              const SizedBox(height: 32),
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text('Session Results (In-Memory)', style: theme.textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w600)),
                  Text(
                    'Temporary • Zero Database',
                    style: theme.textTheme.bodySmall?.copyWith(color: theme.colorScheme.primary),
                  ),
                ],
              ),
              const SizedBox(height: 12),
              ...recentJobs.map((job) => _RecentJobCard(job: job)),
            ],

            if (jobs.isEmpty) ...[
              const SizedBox(height: 48),
              Center(
                child: Column(
                  children: [
                    Icon(Icons.inbox_outlined, size: 64, color: theme.colorScheme.onSurfaceVariant.withValues(alpha: 0.3)),
                    const SizedBox(height: 12),
                    Text(
                      'No jobs in this session yet.',
                      style: theme.textTheme.bodyLarge?.copyWith(color: theme.colorScheme.onSurfaceVariant),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      'Select a conversion suite above to begin converting offline.',
                      style: theme.textTheme.bodySmall?.copyWith(color: theme.colorScheme.onSurfaceVariant),
                    ),
                  ],
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }
}

class _SuiteCard extends StatelessWidget {
  final IconData icon;
  final String label;
  final String desc;
  final Color color;
  final VoidCallback onTap;
  final double? width;

  const _SuiteCard({
    required this.icon,
    required this.label,
    required this.desc,
    required this.color,
    required this.onTap,
    this.width,
  });

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(12),
      child: Container(
        width: width ?? 170,
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
        decoration: BoxDecoration(
          borderRadius: BorderRadius.circular(12),
          color: color.withValues(alpha: 0.08),
          border: Border.all(color: color.withValues(alpha: 0.25)),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(icon, color: color, size: 24),
            const SizedBox(height: 6),
            Text(label, style: TextStyle(color: color, fontWeight: FontWeight.bold, fontSize: 13)),
            const SizedBox(height: 2),
            Text(desc, style: const TextStyle(fontSize: 10, color: Colors.grey), maxLines: 1, overflow: TextOverflow.ellipsis),
          ],
        ),
      ),
    );
  }
}

class _ActiveJobCard extends ConsumerWidget {
  final MediaJob job;

  const _ActiveJobCard({required this.job});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return Card(
      margin: const EdgeInsets.only(bottom: 8),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                const SizedBox(width: 16, height: 16, child: CircularProgressIndicator(strokeWidth: 2)),
                const SizedBox(width: 12),
                Expanded(
                  child: Text(
                    job.inputFilename,
                    style: const TextStyle(fontWeight: FontWeight.w600),
                    overflow: TextOverflow.ellipsis,
                  ),
                ),
                Text(
                  '-> ${job.outputFormat.toUpperCase()}',
                  style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 12),
                ),
                const SizedBox(width: 12),
                OutlinedButton(
                  onPressed: () async {
                    await ref.read(conversionServiceProvider).cancelJob(job.id);
                    ref.read(jobListProvider.notifier).updateJob(job.id, status: JobStatus.cancelled);
                  },
                  child: const Text('Cancel', style: TextStyle(fontSize: 12)),
                ),
              ],
            ),
            const SizedBox(height: 10),
            LinearProgressIndicator(value: job.progress > 0 ? job.progress : null),
            const SizedBox(height: 4),
            Text(
              '${(job.progress * 100).toInt()}% progress',
              style: const TextStyle(fontSize: 11, color: Colors.grey),
            ),
          ],
        ),
      ),
    );
  }
}

class _RecentJobCard extends StatelessWidget {
  final MediaJob job;

  const _RecentJobCard({required this.job});

  @override
  Widget build(BuildContext context) {
    final isCompleted = job.status == JobStatus.completed;
    final isFailed = job.status == JobStatus.failed;

    return Card(
      margin: const EdgeInsets.only(bottom: 8),
      child: ListTile(
        leading: Icon(
          isCompleted
              ? Icons.check_circle
              : isFailed
                  ? Icons.error
                  : Icons.cancel,
          color: isCompleted
              ? Colors.green
              : isFailed
                  ? Colors.red
                  : Colors.orange,
        ),
        title: Text(job.outputFilename, style: const TextStyle(fontWeight: FontWeight.w500)),
        subtitle: Text(
          isCompleted
              ? 'Saved to: ${p.dirname(job.outputPath)}'
              : job.errorMessage ?? 'Cancelled',
          style: TextStyle(
            fontSize: 11,
            color: isFailed ? Colors.red : null,
          ),
          overflow: TextOverflow.ellipsis,
        ),
        trailing: isCompleted
            ? Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  IconButton(
                    icon: const Icon(Icons.share, size: 20),
                    tooltip: 'Share Converted File',
                    onPressed: () => PlatformService.shareFile(job.outputPath),
                  ),
                  IconButton(
                    icon: const Icon(Icons.folder_open, size: 20),
                    tooltip: 'Open Output Directory',
                    onPressed: () {
                      final dir = p.dirname(job.outputPath);
                      PlatformService.openFolder(dir);
                    },
                  ),
                ],
              )
            : null,
      ),
    );
  }
}
