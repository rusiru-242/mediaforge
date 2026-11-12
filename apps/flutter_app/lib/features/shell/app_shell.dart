import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../home/home_page.dart';
import '../downloader/downloader_page.dart';
import '../video_converter/video_converter_page.dart';
import '../audio_converter/audio_converter_page.dart';
import '../image_converter/image_converter_page.dart';
import '../batch_converter/batch_converter_page.dart';
import '../settings/settings_page.dart';

final navigationIndexProvider = StateProvider<int>((ref) => 0);

class AppShell extends ConsumerWidget {
  const AppShell({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final selectedIndex = ref.watch(navigationIndexProvider);
    final theme = Theme.of(context);

    final destinations = const [
      NavigationRailDestination(
        icon: Icon(Icons.home_outlined),
        selectedIcon: Icon(Icons.home),
        label: Text('Home'),
      ),
      NavigationRailDestination(
        icon: Icon(Icons.download_outlined),
        selectedIcon: Icon(Icons.download),
        label: Text('Downloader'),
      ),
      NavigationRailDestination(
        icon: Icon(Icons.video_file_outlined),
        selectedIcon: Icon(Icons.video_file),
        label: Text('Video'),
      ),
      NavigationRailDestination(
        icon: Icon(Icons.audio_file_outlined),
        selectedIcon: Icon(Icons.audio_file),
        label: Text('Audio'),
      ),
      NavigationRailDestination(
        icon: Icon(Icons.image_outlined),
        selectedIcon: Icon(Icons.image),
        label: Text('Image'),
      ),
      NavigationRailDestination(
        icon: Icon(Icons.layers_outlined),
        selectedIcon: Icon(Icons.layers),
        label: Text('Batch'),
      ),
      NavigationRailDestination(
        icon: Icon(Icons.settings_outlined),
        selectedIcon: Icon(Icons.settings),
        label: Text('Settings'),
      ),
    ];

    final pages = const [
      HomePage(),
      DownloaderPage(),
      VideoConverterPage(),
      AudioConverterPage(),
      ImageConverterPage(),
      BatchConverterPage(),
      SettingsPage(),
    ];

    return CallbackShortcuts(
      bindings: <ShortcutActivator, VoidCallback>{
        const SingleActivator(LogicalKeyboardKey.digit1, control: true): () =>
            ref.read(navigationIndexProvider.notifier).state = 0,
        const SingleActivator(LogicalKeyboardKey.digit2, control: true): () =>
            ref.read(navigationIndexProvider.notifier).state = 1,
        const SingleActivator(LogicalKeyboardKey.digit3, control: true): () =>
            ref.read(navigationIndexProvider.notifier).state = 2,
        const SingleActivator(LogicalKeyboardKey.digit4, control: true): () =>
            ref.read(navigationIndexProvider.notifier).state = 3,
        const SingleActivator(LogicalKeyboardKey.digit5, control: true): () =>
            ref.read(navigationIndexProvider.notifier).state = 4,
        const SingleActivator(LogicalKeyboardKey.digit6, control: true): () =>
            ref.read(navigationIndexProvider.notifier).state = 5,
        const SingleActivator(LogicalKeyboardKey.digit7, control: true): () =>
            ref.read(navigationIndexProvider.notifier).state = 6,
      },
      child: Focus(
        autofocus: true,
        child: Scaffold(
          body: Row(
            children: [
              NavigationRail(
                selectedIndex: selectedIndex,
                onDestinationSelected: (i) =>
                    ref.read(navigationIndexProvider.notifier).state = i,
                destinations: destinations,
                labelType: NavigationRailLabelType.all,
                leading: Padding(
                  padding: const EdgeInsets.symmetric(vertical: 16),
                  child: Container(
                    width: 44,
                    height: 44,
                    decoration: BoxDecoration(
                      gradient: LinearGradient(
                        colors: [
                          theme.colorScheme.primary,
                          theme.colorScheme.secondary,
                        ],
                        begin: Alignment.topLeft,
                        end: Alignment.bottomRight,
                      ),
                      borderRadius: BorderRadius.circular(12),
                      boxShadow: [
                        BoxShadow(
                          color: theme.colorScheme.primary.withValues(alpha: 0.3),
                          blurRadius: 8,
                          offset: const Offset(0, 2),
                        ),
                      ],
                    ),
                    child: const Icon(
                      Icons.movie_filter_outlined,
                      color: Colors.white,
                      size: 24,
                    ),
                  ),
                ),
                trailing: Expanded(
                  child: Align(
                    alignment: Alignment.bottomCenter,
                    child: Padding(
                      padding: const EdgeInsets.only(bottom: 16),
                      child: Tooltip(
                        message: 'MediaForge Desktop v0.1.0\nDatabase-Free & Ephemeral',
                        child: Icon(
                          Icons.verified_user_outlined,
                          color: theme.colorScheme.primary.withValues(alpha: 0.6),
                          size: 20,
                        ),
                      ),
                    ),
                  ),
                ),
              ),
              VerticalDivider(
                thickness: 1,
                width: 1,
                color: theme.colorScheme.outlineVariant,
              ),
              Expanded(
                child: pages[selectedIndex],
              ),
            ],
          ),
        ),
      ),
    );
  }
}
