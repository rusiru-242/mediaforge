import 'dart:io';
import 'package:file_picker/file_picker.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:path/path.dart' as p;
import 'package:uuid/uuid.dart';
import '../../core/services/bundled_tools.dart';
import '../../shared/providers/app_providers.dart';
import 'desktop_widgets.dart';

class LocalSettings extends ConsumerStatefulWidget {
  const LocalSettings({super.key});
  @override
  ConsumerState<LocalSettings> createState() => _LocalSettingsState();
}

class _LocalSettingsState extends ConsumerState<LocalSettings> {
  Map<String, String>? versions;
  String error = '';
  bool checking = false;
  @override
  void initState() {
    super.initState();
    check();
  }

  Future<void> check() async {
    setState(() => checking = true);
    try {
      final value = await BundledTools().verify();
      if (mounted) setState(() => versions = value);
    } catch (e) {
      if (mounted) setState(() => error = e.toString());
    } finally {
      if (mounted) setState(() => checking = false);
    }
  }

  Future<void> pickFolder() async {
    final path = await FilePicker.platform
        .getDirectoryPath(dialogTitle: 'Default export folder');
    if (path == null) return;
    final install = p.dirname(BundledTools().directory);
    if (p.equals(path.toLowerCase(), install.toLowerCase()) ||
        p.isWithin(install.toLowerCase(), path.toLowerCase())) {
      setState(() => error =
          'Choose a personal folder outside the application installation.');
      return;
    }
    final test =
        File(p.join(path, '.mediaforge-write-test-${const Uuid().v4()}'));
    try {
      await test.writeAsString('');
      await test.delete();
      await ref.read(settingsServiceProvider).setOutputFolder(path);
      if (mounted) setState(() => error = '');
    } catch (_) {
      if (mounted) {
        setState(() => error =
            'This folder is not writable. Choose a folder in your user profile.');
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final settings = ref.watch(settingsServiceProvider);
    return SingleChildScrollView(
        padding: const EdgeInsets.all(24),
        child:
            Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
          Text('Application Settings',
              style: Theme.of(context).textTheme.headlineMedium),
          const SizedBox(height: 20),
          StudioCard(
              child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                Text('Appearance',
                    style: Theme.of(context).textTheme.titleLarge),
                const SizedBox(height: 16),
                StudioSelect(
                    label: 'Theme Mode',
                    value: ref.watch(themeModeProvider),
                    values: const ['system', 'light', 'dark'],
                    onChanged: (value) async {
                      ref.read(themeModeProvider.notifier).state = value;
                      await settings.setThemeMode(value);
                    }),
                Text('Default Export Folder',
                    style: Theme.of(context).textTheme.titleMedium),
                const SizedBox(height: 8),
                SelectableText(settings.outputFolder.isEmpty
                    ? 'Windows Downloads folder'
                    : settings.outputFolder),
                const SizedBox(height: 12),
                OutlinedButton.icon(
                    onPressed: pickFolder,
                    icon: const Icon(Icons.folder_open),
                    label: const Text('Choose export folder')),
              ])),
          const SizedBox(height: 20),
          StudioCard(
              child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                Text('Local Media Engine',
                    style: Theme.of(context).textTheme.titleLarge),
                const SizedBox(height: 12),
                const Text(
                    'Video, audio, image and batch conversion work on this PC without Java, a server or an internet connection.'),
                if (checking)
                  const Padding(
                      padding: EdgeInsets.all(16),
                      child: LinearProgressIndicator()),
                if (versions != null)
                  for (final entry in versions!.entries)
                    Padding(
                        padding: const EdgeInsets.symmetric(vertical: 8),
                        child: SelectableText('${entry.key}: ${entry.value}')),
                if (error.isNotEmpty) StudioNotice(error, error: true),
                OutlinedButton(
                    onPressed: checking ? null : check,
                    child: const Text('Verify bundled tools')),
                TextButton(
                    onPressed: () async {
                      final file = File(p.join(
                          BundledTools().directory, 'SOURCE-NOTICE.txt'));
                      final text = await file.exists()
                          ? await file.readAsString()
                          : 'Third-party notices are installed in the tools folder.';
                      if (!context.mounted) return;
                      await showDialog<void>(
                          context: context,
                          builder: (context) => AlertDialog(
                                  title: const Text('Processing tool licenses'),
                                  content: SizedBox(
                                      width: 600,
                                      child: SingleChildScrollView(
                                          child: SelectableText(text))),
                                  actions: [
                                    TextButton(
                                        onPressed: () => Navigator.pop(context),
                                        child: const Text('Close'))
                                  ]));
                    },
                    child: const Text('Processing tool licenses')),
              ])),
        ]));
  }
}
