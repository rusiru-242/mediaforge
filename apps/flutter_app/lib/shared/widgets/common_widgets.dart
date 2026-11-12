import 'package:flutter/material.dart';
import '../../shared/models/media_info.dart';

class FilePickerCard extends StatelessWidget {
  final String? inputPath;
  final MediaInfo? mediaInfo;
  final bool isLoading;
  final VoidCallback onPickFile;
  final List<String> acceptedFormats;
  final String? title;

  const FilePickerCard({
    super.key,
    required this.inputPath,
    this.mediaInfo,
    required this.isLoading,
    required this.onPickFile,
    required this.acceptedFormats,
    this.title,
  });

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Card(
      child: InkWell(
        onTap: isLoading ? null : onPickFile,
        borderRadius: BorderRadius.circular(12),
        child: Padding(
          padding: const EdgeInsets.symmetric(vertical: 28, horizontal: 24),
          child: Center(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                if (isLoading) ...[
                  const CircularProgressIndicator(),
                  const SizedBox(height: 16),
                  Text('Probing media file with FFprobe...', style: theme.textTheme.bodyMedium),
                ] else if (inputPath == null) ...[
                  Container(
                    width: 64,
                    height: 64,
                    decoration: BoxDecoration(
                      color: theme.colorScheme.primary.withValues(alpha: 0.1),
                      shape: BoxShape.circle,
                    ),
                    child: Icon(
                      Icons.cloud_upload_outlined,
                      size: 36,
                      color: theme.colorScheme.primary,
                    ),
                  ),
                  const SizedBox(height: 16),
                  Text(
                    title ?? 'Click to select media file',
                    style: theme.textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w600),
                  ),
                  const SizedBox(height: 6),
                  Text(
                    'Supported: ${acceptedFormats.join(', ').toUpperCase()}',
                    style: theme.textTheme.bodySmall?.copyWith(color: theme.colorScheme.onSurfaceVariant),
                    textAlign: TextAlign.center,
                  ),
                  const SizedBox(height: 12),
                  ElevatedButton.icon(
                    onPressed: onPickFile,
                    icon: const Icon(Icons.folder_open, size: 18),
                    label: const Text('Browse Files'),
                  ),
                ] else ...[
                  Container(
                    width: 56,
                    height: 56,
                    decoration: BoxDecoration(
                      color: Colors.green.withValues(alpha: 0.1),
                      shape: BoxShape.circle,
                    ),
                    child: const Icon(Icons.check_circle_outline, size: 36, color: Colors.green),
                  ),
                  const SizedBox(height: 12),
                  Text(
                    inputPath!.split(RegExp(r'[/\\]')).last,
                    style: theme.textTheme.titleSmall?.copyWith(fontWeight: FontWeight.w600),
                    textAlign: TextAlign.center,
                  ),
                  const SizedBox(height: 4),
                  Text(
                    inputPath!,
                    style: theme.textTheme.bodySmall?.copyWith(color: theme.colorScheme.onSurfaceVariant),
                    textAlign: TextAlign.center,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
                  const SizedBox(height: 12),
                  OutlinedButton.icon(
                    onPressed: onPickFile,
                    icon: const Icon(Icons.sync, size: 16),
                    label: const Text('Choose Different File'),
                  ),
                ],
              ],
            ),
          ),
        ),
      ),
    );
  }
}

class SettingRow extends StatelessWidget {
  final String label;
  final Widget child;
  final String? helpText;

  const SettingRow({
    super.key,
    required this.label,
    required this.child,
    this.helpText,
  });

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 8),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.center,
        children: [
          SizedBox(
            width: 140,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              mainAxisSize: MainAxisSize.min,
              children: [
                Text(label, style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w500)),
                if (helpText != null)
                  Text(
                    helpText!,
                    style: TextStyle(fontSize: 11, color: Theme.of(context).colorScheme.onSurfaceVariant),
                  ),
              ],
            ),
          ),
          const SizedBox(width: 16),
          Expanded(child: child),
        ],
      ),
    );
  }
}

class MediaInfoPanel extends StatelessWidget {
  final MediaInfo mediaInfo;

  const MediaInfoPanel({super.key, required this.mediaInfo});

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Container(
      padding: const EdgeInsets.all(16),
      margin: const EdgeInsets.only(top: 16),
      decoration: BoxDecoration(
        color: theme.colorScheme.surfaceContainerHighest.withValues(alpha: 0.5),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: theme.colorScheme.outlineVariant),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(Icons.info_outline, size: 18, color: theme.colorScheme.primary),
              const SizedBox(width: 8),
              Text(
                'Source Media Information',
                style: theme.textTheme.titleSmall?.copyWith(fontWeight: FontWeight.w600),
              ),
            ],
          ),
          const Divider(height: 20),
          InfoRow('Filename', mediaInfo.filename),
          InfoRow('Format', mediaInfo.format.toUpperCase()),
          InfoRow('File Size', mediaInfo.fileSizeMb),
          if (mediaInfo.isVideo) ...[
            InfoRow('Resolution', mediaInfo.resolution),
            InfoRow('Duration', mediaInfo.duration),
            if (mediaInfo.codec != null) InfoRow('Video Codec', mediaInfo.codec!),
            if (mediaInfo.bitrate != null) InfoRow('Bitrate', '${mediaInfo.bitrate} kbps'),
          ],
          if (mediaInfo.isAudio) ...[
            InfoRow('Duration', mediaInfo.duration),
            if (mediaInfo.codec != null) InfoRow('Audio Codec', mediaInfo.codec!),
            if (mediaInfo.sampleRate != null) InfoRow('Sample Rate', '${mediaInfo.sampleRate} Hz'),
            if (mediaInfo.channels != null)
              InfoRow('Channels', mediaInfo.channels == 1 ? 'Mono (1 ch)' : 'Stereo (2 ch)'),
          ],
        ],
      ),
    );
  }
}

class InfoRow extends StatelessWidget {
  final String label;
  final String value;

  const InfoRow(this.label, this.value, {super.key});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 3),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SizedBox(
            width: 100,
            child: Text(
              label,
              style: TextStyle(
                fontSize: 12,
                fontWeight: FontWeight.w500,
                color: Theme.of(context).colorScheme.onSurfaceVariant,
              ),
            ),
          ),
          Expanded(
            child: Text(
              value,
              style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600),
            ),
          ),
        ],
      ),
    );
  }
}

