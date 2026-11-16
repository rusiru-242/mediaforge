import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import '../../core/services/media_api.dart';
import '../../core/services/local_media_api.dart';
import 'desktop_task.dart';
import 'desktop_widgets.dart';
import 'task_panel.dart';

String? detectPlatform(String value) {
  final uri = Uri.tryParse(value.trim());
  if (uri == null || !['https', 'http'].contains(uri.scheme)) return null;
  final host = uri.host.toLowerCase();
  bool belongs(String domain) => host == domain || host.endsWith('.$domain');
  if (belongs('youtube.com') || belongs('youtu.be')) return 'YouTube';
  if (belongs('facebook.com') || belongs('fb.watch')) return 'Facebook';
  if (belongs('instagram.com')) return 'Instagram';
  if (belongs('tiktok.com')) return 'TikTok';
  if (belongs('twitter.com') || belongs('x.com') || belongs('t.co')) {
    return 'X / Twitter';
  }
  return 'Direct Media URL';
}

class DesktopDownloader extends StatefulWidget {
  const DesktopDownloader({super.key});
  @override
  State<DesktopDownloader> createState() => DesktopDownloaderState();
}

class DesktopDownloaderState extends State<DesktopDownloader> {
  final url = TextEditingController();
  final task = DesktopTask();
  MediaApi? analysis;
  Json? metadata, estimate;
  bool analyzing = false;
  String platform = 'YouTube', format = 'mp4', quality = 'source', error = '';
  int generation = 0;
  bool get needsGuard =>
      analyzing ||
      task.busy ||
      task.job?.completed == true && task.savedPath == null;
  static const platforms = ['YouTube', 'Facebook', 'Instagram'];
  @override
  void initState() {
    super.initState();
    task.addListener(refresh);
  }

  void refresh() {
    if (mounted) setState(() {});
  }

  Future<void> pause() async {}
  @override
  void dispose() {
    analysis?.close();
    url.dispose();
    task.dispose();
    super.dispose();
  }

  void changeUrl(String value) {
    generation++;
    metadata = null;
    estimate = null;
    error = '';
    task.invalidate();
    final detected = detectPlatform(value);
    setState(() {
      if (platforms.contains(detected)) {
        platform = detected!;
      } else if (value.trim().isNotEmpty && detected != null) {
        error = 'Use a YouTube, Facebook or Instagram link.';
      }
    });
  }

  List<Json> get options => (metadata?['availableFormats'] as List? ?? [])
      .whereType<Map>()
      .map((e) => Map<String, dynamic>.from(e))
      .toList();
  List<String> get formats =>
      options.map((o) => o['format'].toString().toLowerCase()).toSet().toList();
  List<String> get qualities => options
      .where((o) => o['format'].toString().toLowerCase() == format)
      .map((o) => (o['quality'] ?? 'source').toString())
      .toSet()
      .toList();
  bool get audio =>
      ['mp3', 'm4a', 'wav', 'aac', 'flac', 'ogg'].contains(format);
  Future<void> analyze() async {
    if (needsGuard || url.text.trim().isEmpty) return;
    if (!platforms.contains(detectPlatform(url.text))) {
      setState(() => error = 'Use a YouTube, Facebook or Instagram link.');
      return;
    }
    final token = ++generation;
    setState(() {
      analyzing = true;
      error = '';
      metadata = null;
      estimate = null;
    });
    task.invalidate();
    analysis = LocalMediaApi();
    try {
      final data = await analysis!.request('/downloads/metadata',
          body: {'url': url.text.trim()}, method: 'POST');
      if (data['success'] != true) {
        throw BackendException(
            (data['message'] ?? 'This source did not expose usable media.')
                .toString());
      }
      if (!mounted || token != generation) return;
      setState(() {
        metadata = data;
        platform = detectPlatform(url.text) ?? platform;
        if (formats.isEmpty) {
          error = 'No supported output formats were returned by the source.';
          return;
        }
        format = formats.contains('mp4') ? 'mp4' : formats.first;
        quality = qualities.isNotEmpty ? qualities.first : 'source';
      });
      await updateEstimate();
    } catch (e) {
      if (mounted && token == generation) setState(() => error = e.toString());
    } finally {
      analysis?.close();
      analysis = null;
      if (mounted && token == generation) setState(() => analyzing = false);
    }
  }

  void select(String f, String? q) {
    setState(() {
      format = f;
      quality = q ?? (qualities.isEmpty ? 'source' : qualities.first);
      estimate = null;
    });
    task.invalidate();
    updateEstimate();
  }

  Future<void> updateEstimate() async {
    final snapshot = '$generation/$format/$quality';
    final api = LocalMediaApi();
    try {
      final data = await api.request('/conversions/estimate-size',
          body: {
            'estimationContext': 'download',
            'mediaType': audio ? 'audio' : 'video',
            'outputFormat': format,
            'sourceDuration': metadata?['duration'],
            'sourceFileSize': metadata?['fileSize'],
            if (!audio && RegExp(r'^\d+p').hasMatch(quality))
              'targetResolution': quality,
            if (audio && format == 'mp3')
              'audioBitrate':
                  int.tryParse(quality.replaceAll(RegExp(r'[^0-9]'), '')) ??
                      192,
          },
          method: 'POST');
      if (mounted && snapshot == '$generation/$format/$quality') {
        setState(() => estimate = data);
      }
    } catch (_) {
      /* An unavailable estimate must not prevent an actual download. */
    } finally {
      api.close();
    }
  }

  Future<void> download() => task.run((api) => api.createJob('/downloads', {
        'url': url.text.trim(),
        'selectedFormat': format,
        'selectedQuality': quality,
        'mediaType': audio ? 'audio' : 'video',
        if (!audio && RegExp(r'^\d+p').hasMatch(quality))
          'targetResolution': quality,
        if (audio && format == 'mp3')
          'audioBitrate':
              int.tryParse(quality.replaceAll(RegExp(r'[^0-9]'), '')) ?? 192,
      }));

  @override
  Widget build(BuildContext context) {
    final base = Theme.of(context);
    final accent = switch (platform) {
      'Facebook' => const Color(0xFF1865E6),
      'Instagram' => const Color(0xFFC13584),
      _ => const Color(0xFFDC2626),
    };
    final scheme = base.colorScheme.copyWith(
        primary: accent,
        onPrimary: Colors.white,
        primaryContainer: accent,
        onPrimaryContainer: Colors.white);
    final scoped = base.copyWith(
      colorScheme: scheme,
      filledButtonTheme: FilledButtonThemeData(
          style: base.filledButtonTheme.style?.copyWith(
              backgroundColor: WidgetStateProperty.resolveWith((states) =>
                  accent.withValues(
                      alpha: states.contains(WidgetState.disabled) ? .4 : 1)),
              foregroundColor: const WidgetStatePropertyAll(Colors.white))),
      outlinedButtonTheme: OutlinedButtonThemeData(
          style: base.outlinedButtonTheme.style?.copyWith(
              foregroundColor: WidgetStateProperty.resolveWith((states) =>
                  states.contains(WidgetState.disabled)
                      ? base.disabledColor
                      : accent))),
      textButtonTheme: TextButtonThemeData(
          style: base.textButtonTheme.style?.copyWith(
              foregroundColor: WidgetStateProperty.resolveWith((states) =>
                  states.contains(WidgetState.disabled)
                      ? base.disabledColor
                      : accent))),
      chipTheme: base.chipTheme.copyWith(
          selectedColor: accent,
          checkmarkColor: Colors.white,
          labelStyle: WidgetStateTextStyle.resolveWith((states) =>
              base.chipTheme.labelStyle!.copyWith(
                  color: states.contains(WidgetState.selected)
                      ? Colors.white
                      : base.colorScheme.onSurface))),
      progressIndicatorTheme:
          base.progressIndicatorTheme.copyWith(color: accent),
      inputDecorationTheme: base.inputDecorationTheme.copyWith(
          focusedBorder: base.inputDecorationTheme.focusedBorder
              ?.copyWith(borderSide: BorderSide(color: accent, width: 2))),
    );
    return Theme(data: scoped, child: Builder(builder: buildContent));
  }

  Widget buildContent(BuildContext context) {
    final theme = Theme.of(context);
    final detected =
        url.text.trim().isNotEmpty ? detectPlatform(url.text) : null;
    return Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
      Text('Online Media Downloader',
          textAlign: TextAlign.center, style: theme.textTheme.headlineLarge),
      const SizedBox(height: 12),
      const Text(
          'Download videos and audio from supported, accessible sources.',
          textAlign: TextAlign.center),
      const SizedBox(height: 26),
      Center(
          child: Wrap(
              spacing: 8,
              runSpacing: 8,
              children: platforms
                  .map((p) => ChoiceChip(
                      label: Text(p),
                      selected: platform == p,
                      onSelected:
                          needsGuard || (detected != null && detected != p)
                              ? null
                              : (_) => setState(() => platform = p)))
                  .toList())),
      const SizedBox(height: 24),
      StudioCard(
          child:
              Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
        TextField(
            controller: url,
            enabled: !needsGuard,
            onChanged: changeUrl,
            onSubmitted: (_) => analyze(),
            decoration: InputDecoration(
                hintText: 'Paste a $platform link…',
                labelText: 'Media URL',
                prefixIcon: const Icon(Icons.link))),
        const SizedBox(height: 12),
        Wrap(
            alignment: WrapAlignment.end,
            spacing: 10,
            runSpacing: 8,
            children: [
              TextButton.icon(
                  onPressed: needsGuard || url.text.isEmpty
                      ? null
                      : () {
                          url.clear();
                          changeUrl('');
                        },
                  icon: const Icon(Icons.close, size: 18),
                  label: const Text('Clear')),
              OutlinedButton.icon(
                  onPressed: needsGuard
                      ? null
                      : () async {
                          final text =
                              await Clipboard.getData(Clipboard.kTextPlain);
                          if (!mounted || needsGuard) return;
                          url.text = text?.text ?? '';
                          changeUrl(url.text);
                        },
                  icon: const Icon(Icons.content_paste, size: 18),
                  label: const Text('Paste')),
              FilledButton(
                  onPressed:
                      needsGuard || url.text.trim().isEmpty ? null : analyze,
                  child: Text(analyzing ? 'Analyzing…' : 'Analyze')),
            ]),
        if (analyzing)
          const Padding(
              padding: EdgeInsets.symmetric(vertical: 16),
              child: LinearProgressIndicator()),
        if (error.isNotEmpty) StudioNotice(error, error: true),
        if (metadata != null) ...[
          const SizedBox(height: 20),
          StudioCard(
              padding: const EdgeInsets.all(18),
              child: Row(children: [
                if ((metadata!['thumbnailUrl'] ?? metadata!['thumbnail'])
                    is String) ...[
                  ClipRRect(
                      borderRadius: BorderRadius.circular(16),
                      child: Image.network(
                          (metadata!['thumbnailUrl'] ?? metadata!['thumbnail'])
                              as String,
                          width: 120,
                          height: 80,
                          fit: BoxFit.cover,
                          errorBuilder: (_, __, ___) => const SizedBox(
                              width: 70, child: Icon(Icons.movie_outlined)))),
                  const SizedBox(width: 16),
                ],
                Expanded(
                    child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                      Text((metadata!['title'] ?? 'Media').toString(),
                          style: theme.textTheme.titleLarge),
                      const SizedBox(height: 8),
                      Text(
                          '$platform • ${timeLabel((metadata!['duration'] as num? ?? 0).toDouble())}')
                    ]))
              ])),
          const SizedBox(height: 22),
          Text('Choose Download Quality', style: theme.textTheme.titleLarge),
          const SizedBox(height: 18),
          Wrap(
              spacing: 8,
              runSpacing: 8,
              children: formats
                  .map((f) => ChoiceChip(
                      label: Text(f.toUpperCase()),
                      selected: format == f,
                      onSelected: task.busy ? null : (_) => select(f, null)))
                  .toList()),
          const SizedBox(height: 18),
          if (qualities.isNotEmpty)
            StudioSelect(
                label: audio ? 'Audio quality' : 'Video resolution',
                value: quality,
                values: qualities,
                onChanged: task.busy ? null : (q) => select(format, q)),
          if (estimate != null)
            Text(
                'Estimated size: ${estimate!['formattedRange'] ?? estimate!['formattedEstimate'] ?? 'Unavailable'}',
                style: theme.textTheme.bodySmall),
          const SizedBox(height: 18),
          TaskPanel(
              task: task,
              format: format,
              exportLabel: audio ? 'Download Audio' : 'Download Video',
              onExport: formats.isEmpty || task.busy ? null : download),
        ],
      ])),
      const SizedBox(height: 14),
      Text(
          'Availability depends on the source. Private, login-protected and restricted media cannot be bypassed.',
          style: theme.textTheme.labelSmall,
          textAlign: TextAlign.center),
    ]);
  }
}
