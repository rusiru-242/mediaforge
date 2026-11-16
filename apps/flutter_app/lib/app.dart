import 'dart:io';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'core/theme/app_theme.dart';
import 'shared/providers/app_providers.dart';
import 'features/shell/app_shell.dart';
import 'features/desktop/desktop_workspace.dart';
import 'features/mobile/mobile_workspace.dart';

class MediaForgeApp extends ConsumerWidget {
  final bool desktop;
  const MediaForgeApp({super.key, this.desktop = false});
  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final mode = ref.watch(themeModeProvider);
    return MaterialApp(
        title: 'MediaForge',
        debugShowCheckedModeBanner: false,
        theme: AppTheme.lightTheme,
        darkTheme: AppTheme.darkTheme,
        themeMode: mode == 'dark'
            ? ThemeMode.dark
            : mode == 'light'
                ? ThemeMode.light
                : ThemeMode.system,
        home: desktop
            ? const DesktopWorkspace(manageWindow: true)
            : Platform.isAndroid || Platform.isIOS
                ? const MobileWorkspace()
                : const AppShell());
  }
}
