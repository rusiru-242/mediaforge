import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../core/processing/media_processing_engine.dart';
import '../../core/processing/native_media_engine.dart';
import '../../core/processing/media_queue.dart';
import '../../shared/providers/app_providers.dart';
import '../desktop/desktop_widgets.dart' show BrandMark;
import 'mobile_editor.dart';
import 'mobile_batch.dart';
import 'mobile_downloader.dart';

class MobileWorkspace extends ConsumerStatefulWidget {
  final NativeMediaEngine? engine;
  const MobileWorkspace({super.key, this.engine});
  @override
  ConsumerState<MobileWorkspace> createState() => _MobileWorkspaceState();
}

class _MobileWorkspaceState extends ConsumerState<MobileWorkspace>
    with WidgetsBindingObserver {
  late final NativeMediaEngine engine = widget.engine ?? NativeMediaEngine();
  late final MediaQueue queue = MediaQueue(engine);
  EngineCapabilities? caps;
  String error = '';
  int selected = 0;
  final visited = <int>{0};
  final batch = GlobalKey<MobileBatchState>();
  final editors = List.generate(3, (_) => GlobalKey<MobileEditorState>());
  // Keep page IDs stable while matching the website's navigation order.
  static const navigationOrder = [0, 5, 1, 2, 3, 4];
  static const titles = [
    'Overview',
    'Video Editor',
    'Audio Editor',
    'Image Editor',
    'Batch Converter',
    'Downloader'
  ];
  static const icons = [
    Icons.dashboard_outlined,
    Icons.movie_outlined,
    Icons.music_note,
    Icons.image_outlined,
    Icons.layers_outlined,
    Icons.download_outlined
  ];
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
    initialize();
  }

  Future<void> initialize() async {
    try {
      await engine.cleanup();
      final c = await engine.capabilities();
      if (mounted) setState(() => caps = c);
    } catch (e) {
      if (mounted) {
        setState(() => error = 'Local engine initialization failed: $e');
      }
    }
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    if (state == AppLifecycleState.paused) unawaited(queue.cancelAll());
  }

  bool navigating = false;
  Future<void> navigate(int i) async {
    if (i == selected || navigating) return;
    navigating = true;
    try {
      final dirty = (selected >= 1 &&
              selected <= 3 &&
              (editors[selected - 1].currentState?.hasWork ?? false)) ||
          (selected == 4 && (batch.currentState?.hasWork ?? false));
      if (dirty || queue.busy) {
        final yes = await showDialog<bool>(
            context: context,
            builder: (c) => AlertDialog(
                    title: const Text('Leave this tool?'),
                    content: const Text(
                        'Edits stay in this session. Keep MediaForge in the foreground while exporting; background exports are cancelled.'),
                    actions: [
                      TextButton(
                          onPressed: () => Navigator.pop(c, false),
                          child: const Text('Stay')),
                      FilledButton(
                          onPressed: () => Navigator.pop(c, true),
                          child: const Text('Continue'))
                    ]));
        if (yes != true) return;
      }
      for (final editor in editors) {
        await editor.currentState?.pause();
      }
      if (mounted) {
        setState(() {
          selected = i;
          visited.add(i);
        });
      }
    } finally {
      navigating = false;
    }
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    queue.dispose();
    unawaited(engine.dispose());
    super.dispose();
  }

  @override
  Widget build(BuildContext context) => PopScope(
      canPop: selected == 0,
      onPopInvokedWithResult: (popped, _) {
        if (!popped) navigate(0);
      },
      child: Scaffold(
          appBar: AppBar(
              title: Row(children: [
                const SizedBox(width: 30, height: 30, child: BrandMark()),
                const SizedBox(width: 8),
                Flexible(
                    child: Text(selected == 0 ? 'MediaForge' : titles[selected],
                        overflow: TextOverflow.ellipsis))
              ]),
              actions: [
                IconButton(
                    tooltip: 'Toggle theme',
                    icon: const Icon(Icons.brightness_6_outlined),
                    onPressed: () async {
                      final value =
                          Theme.of(context).brightness == Brightness.dark
                              ? 'light'
                              : 'dark';
                      ref.read(themeModeProvider.notifier).state = value;
                      await ref
                          .read(settingsServiceProvider)
                          .setThemeMode(value);
                    })
              ]),
          drawer: Drawer(
              child: SafeArea(
                  child: ListView(children: [
            const Padding(
                padding: EdgeInsets.all(24),
                child: Text('MediaForge',
                    style:
                        TextStyle(fontSize: 24, fontWeight: FontWeight.bold))),
            for (final i in navigationOrder)
              ListTile(
                  leading: Icon(icons[i]),
                  title: Text(titles[i]),
                  selected: selected == i,
                  onTap: () {
                    Navigator.pop(context);
                    navigate(i);
                  }),
            const Padding(
                padding: EdgeInsets.all(20),
                child: Text(
                    'Local processing works offline. Keep this app open during exports.'))
          ]))),
          body: SafeArea(
              child: caps == null
                  ? Center(
                      child: error.isEmpty
                          ? const CircularProgressIndicator()
                          : Padding(
                              padding: const EdgeInsets.all(24),
                              child: Column(
                                  mainAxisSize: MainAxisSize.min,
                                  children: [
                                    Text(error),
                                    TextButton(
                                        onPressed: initialize,
                                        child: const Text('Retry'))
                                  ])))
                  : IndexedStack(index: selected, children: [
                      overview(),
                      for (var i = 0; i < 3; i++)
                        visited.contains(i + 1)
                            ? MobileEditor(
                                key: editors[i],
                                kind: MediaKind.values[i],
                                engine: engine,
                                queue: queue,
                                caps: caps!)
                            : const SizedBox(),
                      visited.contains(4)
                          ? MobileBatch(
                              key: batch,
                              engine: engine,
                              queue: queue,
                              caps: caps!)
                          : const SizedBox(),
                      visited.contains(5)
                          ? MobileDownloader(engine: engine)
                          : const SizedBox()
                    ]))));
  Widget overview() => ListView(padding: const EdgeInsets.all(20), children: [
        const SizedBox(height: 20),
        Text('Your Media. Your Way.',
            style: Theme.of(context).textTheme.headlineLarge),
        const SizedBox(height: 16),
        const Text(
            'Edit and convert local video, audio and images on your device. No account or server required.'),
        const SizedBox(height: 20),
        for (final i in navigationOrder.skip(1))
          Card(
              child: ListTile(
                  contentPadding: const EdgeInsets.all(16),
                  leading: Icon(icons[i],
                      color: Theme.of(context).colorScheme.primary),
                  title: Text(titles[i]),
                  subtitle: Text(i == 5
                      ? 'Internet and an optional extraction service'
                      : 'Process locally, including offline'),
                  trailing: const Icon(Icons.chevron_right),
                  onTap: () => navigate(i)))
      ]);
}
