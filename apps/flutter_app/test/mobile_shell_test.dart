import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:mediaforge_desktop/app.dart';
import 'package:mediaforge_desktop/shared/providers/app_providers.dart';

void main() {
  testWidgets('MediaForge Mobile AppShell renders NavigationBar on small screen', (WidgetTester tester) async {
    tester.view.physicalSize = const Size(400, 800);
    tester.view.devicePixelRatio = 1.0;
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);

    SharedPreferences.setMockInitialValues({});
    final prefs = await SharedPreferences.getInstance();

    await tester.pumpWidget(
      ProviderScope(
        overrides: [
          sharedPreferencesProvider.overrideWithValue(prefs),
        ],
        child: const MediaForgeApp(),
      ),
    );

    await tester.pumpAndSettle();

    // On mobile (< 720 width), NavigationBar should be present, NavigationRail should NOT be present
    expect(find.byType(NavigationBar), findsOneWidget);
    expect(find.byType(NavigationRail), findsNothing);

    // Verify AppBar is present on mobile
    expect(find.byType(AppBar), findsOneWidget);

    // Bottom Navigation destinations
    expect(find.text('Home'), findsWidgets);
    expect(find.text('Download'), findsOneWidget);
    expect(find.text('Video'), findsOneWidget);
    expect(find.text('Audio'), findsOneWidget);
    expect(find.text('More'), findsOneWidget);

    // Tap on 'Download' bottom navigation destination
    await tester.tap(find.text('Download'));
    await tester.pumpAndSettle();

    // Downloader page should now be visible
    expect(find.text('URL Media Downloader'), findsOneWidget);

    // Tap on 'Video' bottom navigation destination
    await tester.tap(find.text('Video'));
    await tester.pumpAndSettle();

    // Video Converter page should now be visible
    expect(find.text('Offline Video Converter'), findsOneWidget);

    // Tap on 'More' destination to show modal bottom sheet
    await tester.tap(find.text('More'));
    await tester.pumpAndSettle();

    // Verify modal bottom sheet options
    expect(find.text('Image Converter'), findsOneWidget);
    expect(find.text('Batch Processing'), findsOneWidget);
    expect(find.text('Settings'), findsOneWidget);

    // Tap 'Settings' in the bottom sheet
    await tester.tap(find.text('Settings'));
    await tester.pumpAndSettle();

    // Verify Settings page is displayed
    expect(find.text('Application Settings'), findsOneWidget);
  });

  testWidgets('MediaForge Mobile Drawer opens and displays all navigation targets', (WidgetTester tester) async {
    tester.view.physicalSize = const Size(400, 800);
    tester.view.devicePixelRatio = 1.0;
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);

    SharedPreferences.setMockInitialValues({});
    final prefs = await SharedPreferences.getInstance();

    await tester.pumpWidget(
      ProviderScope(
        overrides: [
          sharedPreferencesProvider.overrideWithValue(prefs),
        ],
        child: const MediaForgeApp(),
      ),
    );

    await tester.pumpAndSettle();

    // Open Drawer via hamburger button in AppBar
    final menuButton = find.byTooltip('Navigation Menu');
    expect(menuButton, findsOneWidget);
    await tester.tap(menuButton);
    await tester.pumpAndSettle();

    // Verify Drawer is opened
    expect(find.byType(Drawer), findsOneWidget);
    expect(find.descendant(of: find.byType(Drawer), matching: find.text('Media Downloader')), findsOneWidget);
    expect(find.descendant(of: find.byType(Drawer), matching: find.text('Video Converter')), findsOneWidget);
    expect(find.descendant(of: find.byType(Drawer), matching: find.text('Audio & Extraction')), findsOneWidget);
    expect(find.descendant(of: find.byType(Drawer), matching: find.text('Image Converter')), findsOneWidget);
    expect(find.descendant(of: find.byType(Drawer), matching: find.text('Batch Processing')), findsOneWidget);

    // Tap 'Image Converter' from the drawer
    await tester.tap(find.descendant(of: find.byType(Drawer), matching: find.text('Image Converter')));
    await tester.pumpAndSettle();

    // Verify Image Converter page is loaded
    expect(find.text('Offline Image Converter'), findsOneWidget);
  });
}
