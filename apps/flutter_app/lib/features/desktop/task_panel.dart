import 'dart:io';
import 'package:file_picker/file_picker.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:path/path.dart' as p;
import 'package:url_launcher/url_launcher.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../shared/providers/app_providers.dart';
import '../../core/services/platform_service.dart';
import 'desktop_task.dart';
import 'desktop_widgets.dart';

class TaskPanel extends StatelessWidget {
  final DesktopTask task;
  final String exportLabel, format;
  final VoidCallback? onExport;
  const TaskPanel(
      {super.key,
      required this.task,
      required this.exportLabel,
      required this.format,
      this.onExport});
  @override
  Widget build(BuildContext context) => ListenableBuilder(
      listenable: task,
      builder: (context, _) {
        final fileId = task.job?.outputFileId;
        return Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              if (task.error.isNotEmpty) StudioNotice(task.error, error: true),
              if (task.busy) ...[
                const SizedBox(height: 14),
                Text(task.stage),
                const SizedBox(height: 10),
                LinearProgressIndicator(
                    value: task.stage == 'PROCESSING' ||
                            task.stage == 'QUEUED' ||
                            task.stage == 'PENDING'
                        ? (task.job?.progress ?? 0) / 100
                        : task.transferProgress),
                TextButton.icon(
                    onPressed: task.cancel,
                    icon: const Icon(Icons.close),
                    label: const Text('Cancel')),
              ] else if (task.job?.completed == true &&
                  fileId != null &&
                  task.output != null) ...[
                StudioNotice(
                    'Ready • ${bytesLabel(task.output?['fileSize'] as num?)}'),
                FilledButton.icon(
                    onPressed: () async {
                      final name = (task.output?['originalFilename'] ??
                              'MediaForge.$format')
                          .toString();
                      final selectedFolder = ProviderScope.containerOf(context).read(settingsServiceProvider).outputFolder;
                      final defaultFolder = selectedFolder.isEmpty ? await PlatformService.getDefaultDownloadDirectory() : selectedFolder;
                      if (!context.mounted) return;
                      final destination = await FilePicker.platform.saveFile(
                          initialDirectory: defaultFolder,
                          dialogTitle: 'Save media as',
                          fileName: name,
                          type: FileType.custom,
                          allowedExtensions: [
                            p.extension(name).replaceFirst('.', '').isEmpty
                                ? format
                                : p.extension(name).substring(1)
                          ]);
                      if (destination != null) {
                        await task.save('/files/$fileId/download', destination);
                      }
                    },
                    icon: const Icon(Icons.save_alt),
                    label: const Text('Save to Disk')),
              ] else
                FilledButton.icon(
                    onPressed: task.busy ? null : onExport,
                    icon: const Icon(Icons.download_outlined),
                    label: Text(exportLabel)),
              if (task.savedPath != null) ...[
                const SizedBox(height: 12),
                SelectableText(task.savedPath!,
                    style: Theme.of(context).textTheme.labelSmall),
                Wrap(spacing: 8, children: [
                  TextButton.icon(
                      onPressed: () => launchUrl(File(task.savedPath!).uri),
                      icon: const Icon(Icons.open_in_new, size: 17),
                      label: const Text('Open file')),
                  TextButton.icon(
                      onPressed: () => PlatformService.openFolder(
                          p.dirname(task.savedPath!)),
                      icon: const Icon(Icons.folder_open, size: 17),
                      label: const Text('Open folder')),
                  TextButton.icon(
                      onPressed: () => Clipboard.setData(
                          ClipboardData(text: task.savedPath!)),
                      icon: const Icon(Icons.copy, size: 17),
                      label: const Text('Copy path')),
                ]),
              ],
            ]);
      });
}
