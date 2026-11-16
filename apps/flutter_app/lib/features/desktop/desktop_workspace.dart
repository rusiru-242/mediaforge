import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:window_manager/window_manager.dart';
import '../../core/services/local_media_api.dart';
import '../../core/services/local_media_engine.dart';
import '../../shared/providers/app_providers.dart';
import 'local_settings.dart';
import '../video_converter/video_converter_page.dart';
import '../audio_converter/audio_converter_page.dart';
import '../image_converter/image_converter_page.dart';
import '../batch_converter/batch_converter_page.dart';
import 'desktop_batch.dart';
import 'desktop_downloader.dart';
import 'desktop_editor.dart';
import 'desktop_widgets.dart';

class DesktopWorkspace extends ConsumerStatefulWidget {
  final bool manageWindow;
  const DesktopWorkspace({super.key, this.manageWindow = false});
  @override
  ConsumerState<DesktopWorkspace> createState() => _DesktopWorkspaceState();
}

class _DesktopWorkspaceState extends ConsumerState<DesktopWorkspace>
    with WindowListener {
  int selected = 0;
  final downloader = GlobalKey<DesktopDownloaderState>();
  final video = GlobalKey<DesktopEditorState>();
  final audio = GlobalKey<DesktopEditorState>();
  final image = GlobalKey<DesktopEditorState>();
  final batch = GlobalKey<DesktopBatchState>();
  final visited = <int>{0};
  bool? online;
  bool checking = false, closing = false;
  static const titles = [
    'Overview',
    'Downloader',
    'Video Editor',
    'Audio Editor',
    'Image Editor',
    'Batch Converter',
    'Settings'
  ];
  static const icons = [
    Icons.space_dashboard_outlined,
    Icons.download_outlined,
    Icons.movie_outlined,
    Icons.music_note_outlined,
    Icons.image_outlined,
    Icons.layers_outlined,
    Icons.settings_outlined
  ];
  @override
  void initState() {
    super.initState();
    if (widget.manageWindow) {
      windowManager.addListener(this);
      windowManager.setPreventClose(true);
    }
    unawaited(checkHealth());
  }

  @override
  void dispose() {
    if (widget.manageWindow) windowManager.removeListener(this);
    super.dispose();
  }

  bool guarded(int index) => switch (index) {
        1 => downloader.currentState?.needsGuard ?? false,
        2 => video.currentState?.needsGuard ?? false,
        3 => audio.currentState?.needsGuard ?? false,
        4 => image.currentState?.needsGuard ?? false,
        5 => batch.currentState?.needsGuard ?? false,
        _ => false,
      };
  Future<bool> confirm(String title, String message) async =>
      await showDialog<bool>(
          context: context,
          builder: (context) =>
              AlertDialog(title: Text(title), content: Text(message), actions: [
                TextButton(
                    onPressed: () => Navigator.pop(context, false),
                    child: const Text('Stay here')),
                FilledButton(
                    onPressed: () => Navigator.pop(context, true),
                    child: const Text('Continue'))
              ])) ??
      false;
  Future<void> navigate(int index) async {
    if (index == selected) return;
    if (guarded(selected) &&
        !await confirm('Leave this tool?',
            'Your work stays here when switching tools. Playback will pause; local processing will continue.')) {
      return;
    }
    await video.currentState?.pause();
    await audio.currentState?.pause();
    if (mounted) {
      setState(() {
        selected = index;
        visited.add(index);
      });
    }
  }

  @override
  void onWindowClose() async {
    if (closing) return;
    final active = List.generate(titles.length, (i) => i).any(guarded);
    if (active &&
        !await confirm('Close MediaForge?',
            'There are edits or active operations. Active jobs will be cancelled before the window closes. Saved files are kept.')) {
      return;
    }
    closing = true;
    await downloader.currentState?.task.cancel();
    await video.currentState?.task.cancel();
    await audio.currentState?.task.cancel();
    await image.currentState?.task.cancel();
    await batch.currentState?.cancel();
    await LocalMediaEngine.shared.shutdown();
    await windowManager.destroy();
  }

  Future<void> checkHealth() async {
    if (checking) return;
    if (mounted) setState(() => checking = true);
    final api = LocalMediaApi();
    try {
      final value = await api.request('/health');
      if (mounted) {
        setState(() => online = '${value['status']}'.toUpperCase() == 'UP');
      }
    } catch (_) {
      if (mounted) setState(() => online = false);
    } finally {
      api.close();
      if (mounted) setState(() => checking = false);
    }
  }

  Future<void> toggleTheme() async {
    final value =
        Theme.of(context).brightness == Brightness.dark ? 'light' : 'dark';
    ref.read(themeModeProvider.notifier).state = value;
    await ref.read(settingsServiceProvider).setThemeMode(value);
  }

  Widget page(int index) => switch (index) {
        0 => dashboard(),
        1 => DesktopDownloader(key: downloader),
        2 => DesktopEditor(key: video, kind: 'video'),
        3 => DesktopEditor(key: audio, kind: 'audio'),
        4 => DesktopEditor(key: image, kind: 'image'),
        5 => DesktopBatch(key: batch),
        _ => Column(children: [
            Padding(
                padding: const EdgeInsets.all(16),
                child: OutlinedButton.icon(
                    onPressed: () => Navigator.of(context).push(
                        MaterialPageRoute<void>(
                            builder: (_) => const _OfflineTools())),
                    icon: const Icon(Icons.computer),
                    label:
                        const Text('Open existing offline conversion tools'))),
            const Expanded(child: LocalSettings()),
          ]),
      };
  Widget dashboard() {
    final theme = Theme.of(context);
    return Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
      const SizedBox(height: 20),
      Center(
          child: Text.rich(
              TextSpan(children: [
                const TextSpan(text: 'Your Media. '),
                TextSpan(
                    text: 'Your Way.',
                    style: TextStyle(color: theme.colorScheme.primary))
              ]),
              textAlign: TextAlign.center,
              style: theme.textTheme.headlineLarge?.copyWith(
                  fontSize: MediaQuery.sizeOf(context).width < 850 ? 36 : 52))),
      const SizedBox(height: 20),
      Center(
          child: ConstrainedBox(
              constraints: BoxConstraints(maxWidth: 720),
              child: Text(
                  'Download authorized stream media, edit tracks and timelines, and convert your media in one place.',
                  textAlign: TextAlign.center,
                  style: TextStyle(fontSize: 17, height: 1.7)))),
      const SizedBox(height: 26),
      Wrap(
          alignment: WrapAlignment.center,
          spacing: 14,
          runSpacing: 12,
          children: [
            FilledButton.icon(
                onPressed: () => navigate(2),
                icon: const Icon(Icons.content_cut, size: 19),
                label: const Text('Start Editing')),
            OutlinedButton.icon(
                onPressed: () => navigate(1),
                icon: const Icon(Icons.download_outlined, size: 19),
                label: const Text('Download Media'))
          ]),
      const SizedBox(height: 44),
      Text('INTEGRATED STUDIO SUITE',
          style: theme.textTheme.labelMedium
              ?.copyWith(color: theme.colorScheme.primary, letterSpacing: 1)),
      const SizedBox(height: 10),
      Text('Powerful Media Instruments', style: theme.textTheme.headlineMedium),
      const SizedBox(height: 22),
      LayoutBuilder(builder: (context, constraints) {
        final cardWidth = constraints.maxWidth >= 700
            ? (constraints.maxWidth - 20) / 2
            : constraints.maxWidth;
        return Wrap(spacing: 20, runSpacing: 20, children: [
          toolCard(
              2,
              'Trim, crop, resize and convert video. Export video or extract audio.',
              'MP4 · WebM · MOV · MKV',
              cardWidth),
          toolCard(
              3,
              'Precise trimming, fade transitions, volume and five adjustable audio effects.',
              'MP3 · WAV · AAC · FLAC',
              cardWidth),
          toolCard(
              4,
              'Freeform crop, aspect presets, rotation, flips and simple photo filters.',
              'WebP · AVIF · PNG · JPG',
              cardWidth),
          toolCard(
              1,
              'Analyze accessible media links and download verified video and audio.',
              'Online Downloader',
              cardWidth),
        ]);
      }),
      const SizedBox(height: 20),
      StudioCard(
          child: Row(children: [
        const Icon(Icons.layers_outlined),
        const SizedBox(width: 14),
        const Expanded(
            child: Text(
                'Convert multiple files with individual format and quality settings.')),
        TextButton(
            onPressed: () => navigate(5),
            child: const Text('Open Batch Converter'))
      ])),
      const SizedBox(height: 28),
      Wrap(alignment: WrapAlignment.center, spacing: 12, children: [
        for (final title in [
          'About MediaForge',
          'Supported Formats',
          'Privacy',
          'Terms'
        ])
          TextButton(onPressed: () => information(title), child: Text(title))
      ]),
    ]);
  }

  Widget toolCard(int index, String description, String badge, double width) {
    final theme = Theme.of(context);
    return SizedBox(
        width: width,
        child: Card(
            clipBehavior: Clip.antiAlias,
            child: InkWell(
                onTap: () => navigate(index),
                child: Stack(children: [
                  Positioned(
                      right: -35,
                      top: -35,
                      child: Container(
                          width: 150,
                          height: 150,
                          decoration: BoxDecoration(
                              shape: BoxShape.circle,
                              color: theme.colorScheme.primary
                                  .withValues(alpha: .07)))),
                  Padding(
                      padding: const EdgeInsets.all(26),
                      child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Row(children: [
                              Container(
                                  padding: const EdgeInsets.all(14),
                                  decoration: BoxDecoration(
                                      color: theme.colorScheme.primaryContainer,
                                      borderRadius: BorderRadius.circular(18)),
                                  child: Icon(icons[index],
                                      size: 27,
                                      color: theme.colorScheme.primary)),
                              const SizedBox(width: 12),
                              Expanded(
                                  child: Text(badge,
                                      textAlign: TextAlign.end,
                                      style: theme.textTheme.labelSmall
                                          ?.copyWith(
                                              color:
                                                  theme.colorScheme.primary)))
                            ]),
                            const SizedBox(height: 26),
                            Text(titles[index],
                                style: theme.textTheme.titleLarge),
                            const SizedBox(height: 12),
                            Text(description,
                                style: TextStyle(
                                    height: 1.7,
                                    color: theme.colorScheme.onSurfaceVariant)),
                            const SizedBox(height: 22),
                            Row(children: [
                              Expanded(
                                  child: Text('Open ${titles[index]}',
                                      style: TextStyle(
                                          color: theme.colorScheme.primary,
                                          fontWeight: FontWeight.w600))),
                              Icon(Icons.arrow_forward,
                                  color: theme.colorScheme.primary, size: 20)
                            ]),
                          ])),
                ]))));
  }

  Future<void> information(String title) async {
    String content;
    if (title == 'Supported Formats') {
      final api = LocalMediaApi();
      try {
        final formats = await api.request('/formats');
        content = formats.entries
            .map((e) =>
                '${e.key.toUpperCase()}\n${(e.value as List).join(', ')}')
            .join('\n\n');
      } catch (e) {
        content = e.toString();
      } finally {
        api.close();
      }
    } else if (title == 'About MediaForge') {
      content =
          'MediaForge brings video, audio, image editing and online downloads into one workspace. This native Windows application processes media locally using bundled tools.\n\nFonts: Plus Jakarta Sans and Inter, licensed under the SIL Open Font License.\n\nBundled processing tools require no manual installation. Local exports work offline. Online downloads require internet and source accessibility.';
    } else if (title == 'Privacy') {
      content =
          'Local preview opens files on this PC. Media editing and conversion stay on this PC; selected files are not uploaded. Jobs and file records are temporary and kept in memory; closing the application removes temporary job records. Saved files remain in the destination you choose.\n\nOnline media requests contact their source platform. Do not enter credentials or private URLs.';
    } else {
      content =
          'Only process or download media you own or are authorized to use. Source platform restrictions apply. The application does not bypass login requirements, DRM or private-content controls. Keep your own copy of outputs before temporary files expire.';
    }
    if (!mounted) return;
    await showDialog<void>(
        context: context,
        builder: (context) =>
            AlertDialog(
                title: Text(title),
                content: SizedBox(
                    width: 560,
                    child:
                        SingleChildScrollView(child: SelectableText(content))),
                actions: [
                  TextButton(
                      onPressed: () => Navigator.pop(context),
                      child: const Text('Close'))
                ]));
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context),
        narrow = MediaQuery.sizeOf(context).width < 1060;
    final content = IndexedStack(
        index: selected,
        children: List.generate(
            titles.length,
            (i) => visited.contains(i)
                ? TickerMode(
                    enabled: selected == i,
                    child: i == 6
                        ? page(i)
                        : SingleChildScrollView(
                            key: PageStorageKey('desktop-$i'),
                            padding: EdgeInsets.all(narrow ? 20 : 32),
                            child: Align(
                                alignment: Alignment.topCenter,
                                child: ConstrainedBox(
                                    constraints:
                                        const BoxConstraints(maxWidth: 1450),
                                    child: page(i)))))
                : const SizedBox()));
    return CallbackShortcuts(
        bindings: {
          const SingleActivator(LogicalKeyboardKey.keyO, control: true): () {
            if (selected == 2) video.currentState?.pick();
            if (selected == 3) audio.currentState?.pick();
            if (selected == 4) image.currentState?.pick();
            if (selected == 5) batch.currentState?.pick();
          },
          const SingleActivator(LogicalKeyboardKey.keyE, control: true): () {
            final editor = switch (selected) {
              2 => video.currentState,
              3 => audio.currentState,
              4 => image.currentState,
              _ => null
            };
            if (editor?.editable == true) editor!.export();
          },
          const SingleActivator(LogicalKeyboardKey.space, control: true): () {
            if (selected == 2) video.currentState?.playPause();
            if (selected == 3) audio.currentState?.playPause();
          },
          for (var i = 0; i < titles.length; i++)
            SingleActivator(
                [
                  LogicalKeyboardKey.digit1,
                  LogicalKeyboardKey.digit2,
                  LogicalKeyboardKey.digit3,
                  LogicalKeyboardKey.digit4,
                  LogicalKeyboardKey.digit5,
                  LogicalKeyboardKey.digit6,
                  LogicalKeyboardKey.digit7
                ][i],
                control: true): () => navigate(i)
        },
        child: Focus(
            autofocus: true,
            child: Scaffold(
                body: Row(children: [
              Container(
                  width: narrow ? 84 : 220,
                  decoration: BoxDecoration(
                      color: theme.colorScheme.surface,
                      border: Border(
                          right: BorderSide(
                              color: theme.colorScheme.outlineVariant))),
                  child: Column(children: [
                    Padding(
                        padding: EdgeInsets.symmetric(
                            horizontal: narrow ? 18 : 20, vertical: 24),
                        child: Row(children: [
                          const BrandMark(),
                          if (!narrow) ...[
                            const SizedBox(width: 10),
                            Expanded(
                                child: FittedBox(
                                    fit: BoxFit.scaleDown,
                                    alignment: Alignment.centerLeft,
                                    child: Text('MediaForge',
                                        style: theme.textTheme.titleLarge
                                            ?.copyWith(fontSize: 20))))
                          ]
                        ])),
                    Expanded(
                        child: ListView(
                            padding: const EdgeInsets.symmetric(
                                horizontal: 10, vertical: 12),
                            children: [
                          for (var i = 0; i < titles.length; i++)
                            Padding(
                                padding: const EdgeInsets.only(bottom: 7),
                                child: Tooltip(
                                    message: '${titles[i]} • Ctrl+${i + 1}',
                                    child: Material(
                                        color: selected == i
                                            ? theme
                                                .colorScheme.surfaceContainerLow
                                            : Colors.transparent,
                                        borderRadius: BorderRadius.circular(24),
                                        child: InkWell(
                                            borderRadius:
                                                BorderRadius.circular(24),
                                            onTap: () => navigate(i),
                                            child: Padding(
                                                padding: EdgeInsets.symmetric(
                                                    horizontal:
                                                        narrow ? 18 : 16,
                                                    vertical: 16),
                                                child: Row(children: [
                                                  Icon(icons[i],
                                                      size: 22,
                                                      color: selected == i
                                                          ? theme.colorScheme
                                                              .primary
                                                          : theme.colorScheme
                                                              .onSurfaceVariant),
                                                  if (!narrow) ...[
                                                    const SizedBox(width: 12),
                                                    Expanded(
                                                        child: Text(titles[i],
                                                            style: TextStyle(
                                                                fontSize: 13,
                                                                fontWeight: selected ==
                                                                        i
                                                                    ? FontWeight
                                                                        .w700
                                                                    : FontWeight
                                                                        .w500)))
                                                  ]
                                                ]))))))
                        ])),
                    if (!narrow)
                      Padding(
                          padding: const EdgeInsets.all(22),
                          child: Text('MediaForge for Windows',
                              style: theme.textTheme.labelSmall)),
                  ])),
              Expanded(
                  child: Column(children: [
                Container(
                    height: 76,
                    padding: EdgeInsets.symmetric(horizontal: narrow ? 20 : 32),
                    decoration: BoxDecoration(
                        color: theme.colorScheme.surface,
                        border: Border(
                            bottom: BorderSide(
                                color: theme.colorScheme.outlineVariant))),
                    child: Row(children: [
                      if (selected != 0) ...[
                        IconButton(
                            tooltip: 'Back to Overview',
                            onPressed: () => navigate(0),
                            icon: const Icon(Icons.arrow_back_rounded)),
                        const SizedBox(width: 12),
                      ],
                      Expanded(
                          child: Text(titles[selected],
                              style: theme.textTheme.titleMedium)),
                      Tooltip(
                          message: online == true
                              ? 'Local media engine ready'
                              : 'Bundled processing tools unavailable. Repair the app or click to retry.',
                          child: IconButton(
                              onPressed: checkHealth,
                              icon: checking
                                  ? const SizedBox(
                                      width: 17,
                                      height: 17,
                                      child: CircularProgressIndicator(
                                          strokeWidth: 2))
                                  : Icon(
                                      online == true
                                          ? Icons.check_circle_outline
                                          : Icons.warning_amber_rounded,
                                      color: online == true
                                          ? theme.colorScheme.tertiary
                                          : theme.colorScheme.error))),
                      const SizedBox(width: 8),
                      IconButton(
                          tooltip: 'Switch light / dark theme',
                          onPressed: toggleTheme,
                          style: IconButton.styleFrom(
                              backgroundColor:
                                  theme.colorScheme.surfaceContainerLow,
                              foregroundColor: theme.colorScheme.primary),
                          icon: Icon(theme.brightness == Brightness.dark
                              ? Icons.light_mode_outlined
                              : Icons.dark_mode_outlined)),
                    ])),
                Expanded(child: content),
              ])),
            ]))));
  }
}

/// Preserve the existing local FFmpeg workflows as an explicit offline mode.
/// The primary workspace also runs locally, using the full editing engine.
class _OfflineTools extends StatelessWidget {
  const _OfflineTools();
  @override
  Widget build(BuildContext context) => DefaultTabController(
      length: 4,
      child: Scaffold(
        appBar: AppBar(
            title: const Text('Offline conversion tools'),
            bottom: const TabBar(isScrollable: true, tabs: [
              Tab(text: 'Video'),
              Tab(text: 'Audio'),
              Tab(text: 'Image'),
              Tab(text: 'Batch')
            ])),
        body: const TabBarView(children: [
          VideoConverterPage(),
          AudioConverterPage(),
          ImageConverterPage(),
          BatchConverterPage()
        ]),
      ));
}
