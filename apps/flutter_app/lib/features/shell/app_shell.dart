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

  static const pageTitles = [
    'MediaForge',
    'Media Downloader',
    'Video Converter',
    'Audio & Extraction',
    'Image Converter',
    'Batch Processing',
    'Settings',
  ];

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final selectedIndex = ref.watch(navigationIndexProvider);
    final theme = Theme.of(context);
    final isMobile = MediaQuery.of(context).size.width < 720;

    final railDestinations = const [
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

    void showMoreBottomSheet(BuildContext context) {
      showModalBottomSheet(
        context: context,
        showDragHandle: true,
        builder: (ctx) => SafeArea(
          child: Padding(
            padding: const EdgeInsets.only(bottom: 16),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                ListTile(
                  leading: const Icon(Icons.image_outlined),
                  title: const Text('Image Converter'),
                  subtitle: const Text('Convert PNG, JPG, WEBP, AVIF'),
                  selected: selectedIndex == 4,
                  onTap: () {
                    ref.read(navigationIndexProvider.notifier).state = 4;
                    Navigator.pop(ctx);
                  },
                ),
                ListTile(
                  leading: const Icon(Icons.layers_outlined),
                  title: const Text('Batch Processing'),
                  subtitle: const Text('Process multiple media files in queue'),
                  selected: selectedIndex == 5,
                  onTap: () {
                    ref.read(navigationIndexProvider.notifier).state = 5;
                    Navigator.pop(ctx);
                  },
                ),
                ListTile(
                  leading: const Icon(Icons.settings_outlined),
                  title: const Text('Settings'),
                  subtitle: const Text('App preferences, storage, FFmpeg path'),
                  selected: selectedIndex == 6,
                  onTap: () {
                    ref.read(navigationIndexProvider.notifier).state = 6;
                    Navigator.pop(ctx);
                  },
                ),
              ],
            ),
          ),
        ),
      );
    }

    Widget buildDrawer(BuildContext context) {
      return Drawer(
        child: ListView(
          padding: EdgeInsets.zero,
          children: [
            DrawerHeader(
              decoration: BoxDecoration(
                gradient: LinearGradient(
                  colors: [theme.colorScheme.primary, theme.colorScheme.secondary],
                  begin: Alignment.topLeft,
                  end: Alignment.bottomRight,
                ),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                mainAxisAlignment: MainAxisAlignment.end,
                children: [
                  Container(
                    width: 48,
                    height: 48,
                    decoration: BoxDecoration(
                      color: Colors.white.withValues(alpha: 0.2),
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: const Icon(Icons.movie_filter_rounded, color: Colors.white, size: 28),
                  ),
                  const SizedBox(height: 12),
                  const Text(
                    'MediaForge',
                    style: TextStyle(color: Colors.white, fontSize: 20, fontWeight: FontWeight.bold),
                  ),
                  Text(
                    'v0.1.0 • Database-Free & Ephemeral',
                    style: TextStyle(color: Colors.white.withValues(alpha: 0.8), fontSize: 11),
                  ),
                ],
              ),
            ),
            ListTile(
              leading: const Icon(Icons.home_outlined),
              title: const Text('Home'),
              selected: selectedIndex == 0,
              onTap: () {
                ref.read(navigationIndexProvider.notifier).state = 0;
                Navigator.pop(context);
              },
            ),
            ListTile(
              leading: const Icon(Icons.download_outlined),
              title: const Text('Media Downloader'),
              selected: selectedIndex == 1,
              onTap: () {
                ref.read(navigationIndexProvider.notifier).state = 1;
                Navigator.pop(context);
              },
            ),
            ListTile(
              leading: const Icon(Icons.video_file_outlined),
              title: const Text('Video Converter'),
              selected: selectedIndex == 2,
              onTap: () {
                ref.read(navigationIndexProvider.notifier).state = 2;
                Navigator.pop(context);
              },
            ),
            ListTile(
              leading: const Icon(Icons.audio_file_outlined),
              title: const Text('Audio & Extraction'),
              selected: selectedIndex == 3,
              onTap: () {
                ref.read(navigationIndexProvider.notifier).state = 3;
                Navigator.pop(context);
              },
            ),
            ListTile(
              leading: const Icon(Icons.image_outlined),
              title: const Text('Image Converter'),
              selected: selectedIndex == 4,
              onTap: () {
                ref.read(navigationIndexProvider.notifier).state = 4;
                Navigator.pop(context);
              },
            ),
            ListTile(
              leading: const Icon(Icons.layers_outlined),
              title: const Text('Batch Processing'),
              selected: selectedIndex == 5,
              onTap: () {
                ref.read(navigationIndexProvider.notifier).state = 5;
                Navigator.pop(context);
              },
            ),
            const Divider(),
            ListTile(
              leading: const Icon(Icons.settings_outlined),
              title: const Text('Settings'),
              selected: selectedIndex == 6,
              onTap: () {
                ref.read(navigationIndexProvider.notifier).state = 6;
                Navigator.pop(context);
              },
            ),
          ],
        ),
      );
    }

    final int bottomNavIndex = selectedIndex >= 4 ? 4 : selectedIndex;

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
        child: isMobile
            ? Scaffold(
                appBar: AppBar(
                  leading: Builder(
                    builder: (ctx) => IconButton(
                      icon: const Icon(Icons.menu),
                      tooltip: 'Navigation Menu',
                      onPressed: () => Scaffold.of(ctx).openDrawer(),
                    ),
                  ),
                  title: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Container(
                        width: 26,
                        height: 26,
                        decoration: BoxDecoration(
                          gradient: LinearGradient(
                            colors: [theme.colorScheme.primary, theme.colorScheme.secondary],
                          ),
                          borderRadius: BorderRadius.circular(6),
                        ),
                        child: const Icon(Icons.movie_filter_rounded, color: Colors.white, size: 16),
                      ),
                      const SizedBox(width: 8),
                      Flexible(
                        child: Text(
                          pageTitles[selectedIndex],
                          style: const TextStyle(fontSize: 17, fontWeight: FontWeight.bold),
                          overflow: TextOverflow.ellipsis,
                        ),
                      ),
                    ],
                  ),
                  actions: [
                    IconButton(
                      icon: const Icon(Icons.tune_outlined),
                      tooltip: 'Settings',
                      onPressed: () => ref.read(navigationIndexProvider.notifier).state = 6,
                    ),
                  ],
                ),
                drawer: buildDrawer(context),
                body: pages[selectedIndex],
                bottomNavigationBar: Builder(
                  builder: (ctx) => NavigationBar(
                    selectedIndex: bottomNavIndex,
                    onDestinationSelected: (i) {
                      if (i < 4) {
                        ref.read(navigationIndexProvider.notifier).state = i;
                      } else {
                        showMoreBottomSheet(ctx);
                      }
                    },
                    destinations: const [
                      NavigationDestination(
                        icon: Icon(Icons.home_outlined),
                        selectedIcon: Icon(Icons.home),
                        label: 'Home',
                      ),
                      NavigationDestination(
                        icon: Icon(Icons.download_outlined),
                        selectedIcon: Icon(Icons.download),
                        label: 'Download',
                      ),
                      NavigationDestination(
                        icon: Icon(Icons.video_file_outlined),
                        selectedIcon: Icon(Icons.video_file),
                        label: 'Video',
                      ),
                      NavigationDestination(
                        icon: Icon(Icons.audio_file_outlined),
                        selectedIcon: Icon(Icons.audio_file),
                        label: 'Audio',
                      ),
                      NavigationDestination(
                        icon: Icon(Icons.more_horiz),
                        selectedIcon: Icon(Icons.more_horiz),
                        label: 'More',
                      ),
                    ],
                  ),
                ),
              )
            : Scaffold(
                body: Row(
                  children: [
                    NavigationRail(
                      selectedIndex: selectedIndex,
                      onDestinationSelected: (i) =>
                          ref.read(navigationIndexProvider.notifier).state = i,
                      destinations: railDestinations,
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
                              message: 'MediaForge v0.1.0\nDatabase-Free & Ephemeral',
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
