import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'core/theme/app_theme.dart';
import 'shared/providers/app_providers.dart';
import 'features/shell/app_shell.dart';
import 'features/desktop/desktop_workspace.dart';

class MediaForgeApp extends ConsumerWidget {
  final bool desktop;
  const MediaForgeApp({super.key, this.desktop = false});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final themeMode = ref.watch(themeModeProvider);

    return MaterialApp(
      title: 'MediaForge Desktop',
      debugShowCheckedModeBanner: false,
      theme: AppTheme.lightTheme,
      darkTheme: AppTheme.darkTheme,
      themeMode: themeMode == 'dark'
          ? ThemeMode.dark
          : themeMode == 'light'
              ? ThemeMode.light
              : ThemeMode.system,
      home: desktop
          ? const DesktopWorkspace(manageWindow: true)
          : const AppShell(),
    );
  }
}
