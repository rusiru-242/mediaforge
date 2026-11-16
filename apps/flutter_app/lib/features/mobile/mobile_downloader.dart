import 'dart:io';
import 'package:flutter/material.dart';
import 'package:path_provider/path_provider.dart';
import 'package:share_plus/share_plus.dart';
import 'package:uuid/uuid.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../../core/services/backend_api.dart';
import '../../core/processing/native_media_engine.dart';

class MobileDownloader extends StatefulWidget {
  final NativeMediaEngine engine;
  const MobileDownloader({super.key, required this.engine});
  @override
  State<MobileDownloader> createState() => _MobileDownloaderState();
}

class _MobileDownloaderState extends State<MobileDownloader> {
  final server = TextEditingController(), url = TextEditingController();
  BackendApi? api;
  Json? metadata;
  List<Json> options = [];
  int selection = 0;
  String error = '', status = '', output = '', platform = 'YouTube';
  bool busy = false;
  String? job;
  @override
  void initState() {
    super.initState();
    SharedPreferences.getInstance().then((p) {
      if (mounted) server.text = p.getString('mobileOnlineService') ?? '';
    });
  }

  String? detect(String value) {
    final host = Uri.tryParse(value.trim())?.host.toLowerCase() ?? '';
    bool belongs(String domain) => host == domain || host.endsWith('.$domain');
    if (belongs('youtube.com') || belongs('youtu.be')) return 'YouTube';
    if (belongs('facebook.com') || belongs('fb.watch')) return 'Facebook';
    if (belongs('instagram.com')) return 'Instagram';
    return null;
  }

  Uri validated(String value) {
    final u = Uri.parse(value.trim());
    if (u.scheme != 'https' || u.host.isEmpty || u.userInfo.isNotEmpty) {
      throw StateError('Use a public HTTPS URL without credentials.');
    }
    return u;
  }

  Future<void> analyze() async {
    setState(() {
      busy = true;
      error = '';
      metadata = null;
      options = [];
      output = '';
    });
    try {
      if (detect(url.text) == null) {
        throw StateError('Choose a YouTube, Facebook or Instagram URL.');
      }
      final service = validated(server.text);
      validated(url.text);
      await SharedPreferences.getInstance().then((p) => p.setString(
          'mobileOnlineService',
          service.toString().replaceAll(RegExp(r'/$'), '')));
      api =
          BackendApi(baseUrl: service.toString().replaceAll(RegExp(r'/$'), ''));
      final r = await api!.request('/downloads/metadata',
          body: {'url': url.text.trim()}, method: 'POST');
      if (r['success'] != true) {
        throw StateError('${r['message'] ?? 'No usable public media.'}');
      }
      final f = (r['availableFormats'] as List? ?? [])
          .whereType<Map>()
          .map((e) => Map<String, dynamic>.from(e))
          .toList();
      if (f.isEmpty) throw StateError('No output options returned.');
      if (mounted) {
        setState(() {
          metadata = r;
          options = f;
          selection = 0;
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() => error =
            'Internet and an available extraction service are required. $e');
      }
    } finally {
      api?.close();
      api = null;
      if (mounted) setState(() => busy = false);
    }
  }

  Future<void> download() async {
    setState(() {
      busy = true;
      error = '';
      output = '';
      status = 'Creating download';
    });
    try {
      api = BackendApi(
          baseUrl:
              validated(server.text).toString().replaceAll(RegExp(r'/$'), ''));
      final o = options[selection];
      final format = '${o['format']}'.toLowerCase();
      if (!RegExp(r'^[a-z0-9]{2,5}$').hasMatch(format)) {
        throw StateError('Invalid format.');
      }
      final j = await api!.createJob('/downloads', {
        'url': validated(url.text).toString(),
        'selectedFormat': format,
        'selectedQuality': o['quality']
      });
      job = j.id;
      await for (final state in api!.watch(j.id)) {
        if (mounted) {
          setState(() =>
              status = '${state.status} ${state.progress.toStringAsFixed(0)}%');
        }
      }
      final done = await api!.job(j.id);
      if (!done.completed || done.outputFileId == null) {
        throw StateError(done.error ?? 'Download failed.');
      }
      final folder = await getApplicationDocumentsDirectory();
      final path = '${folder.path}/MediaForge_${const Uuid().v4()}.$format';
      await api!.save('/files/${done.outputFileId}/download', path);
      try {
        final media = await widget.engine.probeMedia(path);
        if (['mp4', 'webm', 'mkv', 'mov', 'avi', 'flv'].contains(format) &&
            !media.video) {
          throw StateError('Audio was returned instead of video.');
        }
        if (['m4a', 'mp3', 'wav', 'aac', 'flac', 'ogg'].contains(format) &&
            (!media.audio || media.video)) {
          throw StateError('Invalid audio output.');
        }
      } catch (e) {
        await File(path).delete();
        rethrow;
      }
      if (mounted) setState(() => output = path);
    } catch (e) {
      if (mounted) setState(() => error = e.toString());
    } finally {
      job = null;
      api?.close();
      api = null;
      if (mounted) setState(() => busy = false);
    }
  }

  Future<void> cancel() async {
    if (job != null) {
      try {
        await api?.cancel(job!);
      } catch (_) {}
    }
    api?.close();
  }

  @override
  void dispose() {
    api?.close();
    server.dispose();
    url.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) =>
      ListView(padding: const EdgeInsets.all(16), children: [
        Text('Online Media Downloader',
            style: Theme.of(context).textTheme.headlineMedium),
        const SizedBox(height: 12),
        const Text(
            'Internet required. Mobile extraction uses an optional HTTPS MediaForge-compatible service. Offline editors remain available without it. No private API keys are stored in the app.'),
        const SizedBox(height: 16),
        Wrap(
            spacing: 8,
            runSpacing: 8,
            children: ['YouTube', 'Facebook', 'Instagram']
                .map((name) => ChoiceChip(
                    label: Text(name),
                    selected: platform == name,
                    selectedColor: {
                      'YouTube': const Color(0xFFDC2626),
                      'Facebook': const Color(0xFF1865E6),
                      'Instagram': const Color(0xFFC13584)
                    }[name],
                    labelStyle: TextStyle(
                        color: platform == name
                            ? Colors.white
                            : Theme.of(context).colorScheme.onSurface),
                    onSelected: busy ||
                            detect(url.text) != null && detect(url.text) != name
                        ? null
                        : (_) => setState(() => platform = name)))
                .toList()),
        const SizedBox(height: 16),
        TextField(
            controller: server,
            enabled: !busy,
            decoration: const InputDecoration(
                labelText: 'Optional HTTPS API base',
                hintText: 'https://your-service.example/api/v1')),
        const SizedBox(height: 12),
        TextField(
            controller: url,
            onChanged: (value) => setState(() {
                  platform = detect(value) ?? platform;
                  metadata = null;
                  options = [];
                  output = '';
                }),
            enabled: !busy,
            decoration: const InputDecoration(
                labelText: 'Authorized public media URL')),
        const SizedBox(height: 12),
        FilledButton(
            onPressed: busy ? null : analyze, child: const Text('Analyze')),
        if (busy) ...[
          const LinearProgressIndicator(),
          Text(status),
          TextButton(onPressed: cancel, child: const Text('Cancel'))
        ],
        if (error.isNotEmpty)
          Text(error,
              style: TextStyle(color: Theme.of(context).colorScheme.error)),
        if (metadata != null) ...[
          Text('${metadata!['title'] ?? ''}'),
          DropdownButtonFormField<int>(
              initialValue: selection,
              items: [
                for (var i = 0; i < options.length; i++)
                  DropdownMenuItem(
                      value: i,
                      child: Text(
                          '${options[i]['format']} - ${options[i]['quality']}'))
              ],
              onChanged: busy ? null : (v) => setState(() => selection = v!)),
          FilledButton(
              onPressed: busy ? null : download, child: const Text('Download'))
        ],
        if (output.isNotEmpty)
          OutlinedButton(
              onPressed: () => Share.shareXFiles([XFile(output)]),
              child: const Text('Share / Save downloaded media'))
      ]);
}
