import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:mediaforge_desktop/app.dart';
import 'package:mediaforge_desktop/shared/providers/app_providers.dart';

void main() {
  testWidgets('MediaForge Desktop AppShell smoke test', (WidgetTester tester) async {
    tester.view.physicalSize = const Size(1280, 800);
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

    // Verify Navigation Rail items are present
    expect(find.text('Home'), findsWidgets);
    expect(find.text('Downloader'), findsOneWidget);
    expect(find.text('Video'), findsOneWidget);
    expect(find.text('Audio'), findsOneWidget);
    expect(find.text('Image'), findsOneWidget);
    expect(find.text('Batch'), findsOneWidget);
    expect(find.text('Settings'), findsOneWidget);

    // Verify Home Dashboard header
    expect(find.text('MediaForge Desktop'), findsOneWidget);

    // Tap on 'Video' navigation destination
    await tester.tap(find.text('Video'));
    await tester.pumpAndSettle();

    // Verify Video Converter page is displayed
    expect(find.text('Offline Video Converter'), findsOneWidget);
    expect(find.text('Select Video File for Conversion'), findsOneWidget);

    // Tap on 'Audio' navigation destination
    await tester.tap(find.text('Audio'));
    await tester.pumpAndSettle();

    // Verify Audio Converter page is displayed
    expect(find.text('Offline Audio Converter & Extraction'), findsOneWidget);

    // Tap on 'Settings' navigation destination
    await tester.tap(find.text('Settings'));
    await tester.pumpAndSettle();

    // Verify Settings page is displayed
    expect(find.text('Application Settings'), findsOneWidget);
    expect(find.text('Appearance'), findsOneWidget);
    expect(find.text('FFmpeg & FFprobe Engine'), findsOneWidget);
  });
}
