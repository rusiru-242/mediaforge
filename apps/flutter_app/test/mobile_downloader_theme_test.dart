import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter/services.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:mediaforge_desktop/core/processing/native_media_engine.dart';
import 'package:mediaforge_desktop/core/theme/app_theme.dart';
import 'package:mediaforge_desktop/features/mobile/mobile_downloader.dart';

void main() {
  tearDown(() => debugDefaultTargetPlatformOverride = null);
  testWidgets(
      'Clipboard paste detects platform and Clear resets input and errors',
      (tester) async {
    debugDefaultTargetPlatformOverride = TargetPlatform.windows;
    SharedPreferences.setMockInitialValues({});
    tester.view.physicalSize = const Size(320, 568);
    tester.view.devicePixelRatio = 1;
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);
    TestDefaultBinaryMessengerBinding.instance.defaultBinaryMessenger
        .setMockMethodCallHandler(SystemChannels.platform, (call) async {
      if (call.method == 'Clipboard.getData') {
        return {'text': '  https://www.instagram.com/reel/owned/  '};
      }
      return null;
    });
    addTearDown(() => TestDefaultBinaryMessengerBinding
        .instance.defaultBinaryMessenger
        .setMockMethodCallHandler(SystemChannels.platform, null));
    await tester.pumpWidget(MaterialApp(
        theme: AppTheme.lightTheme,
        home: Scaffold(body: MobileDownloader(engine: NativeMediaEngine()))));
    await tester.pumpAndSettle();
    await tester.ensureVisible(find.widgetWithText(OutlinedButton, 'Paste'));
    await tester.tap(find.widgetWithText(OutlinedButton, 'Paste'));
    await tester.pumpAndSettle();
    expect(tester.widget<TextField>(find.byType(TextField)).controller!.text,
        'https://www.instagram.com/reel/owned/');
    expect(
        tester
            .widget<ChoiceChip>(find.widgetWithText(ChoiceChip, 'Instagram'))
            .selected,
        true);
    await tester.ensureVisible(find.widgetWithText(FilledButton, 'Analyze'));
    await tester.tap(find.widgetWithText(FilledButton, 'Analyze'));
    await tester.pumpAndSettle();
    expect(
        find.textContaining(
            'Online downloads are not configured in this build.'),
        findsOneWidget);
    await tester.ensureVisible(find.widgetWithText(TextButton, 'Clear'));
    await tester.tap(find.widgetWithText(TextButton, 'Clear'));
    await tester.pumpAndSettle();
    expect(tester.widget<TextField>(find.byType(TextField)).controller!.text,
        isEmpty);
    expect(
        find.textContaining(
            'Online downloads are not configured in this build.'),
        findsNothing);
    expect(
        tester
            .widget<ChoiceChip>(find.widgetWithText(ChoiceChip, 'Facebook'))
            .onSelected,
        isNotNull);
    expect(
        tester
            .widget<FilledButton>(find.widgetWithText(FilledButton, 'Analyze'))
            .onPressed,
        isNull);
    debugDefaultTargetPlatformOverride = null;
    expect(tester.takeException(), isNull);
  });
  testWidgets(
      'Clipboard read locks controls and empty clipboard keeps typed URL',
      (tester) async {
    debugDefaultTargetPlatformOverride = TargetPlatform.windows;
    SharedPreferences.setMockInitialValues({});
    final clipboard = Completer<Object?>();
    TestDefaultBinaryMessengerBinding.instance.defaultBinaryMessenger
        .setMockMethodCallHandler(SystemChannels.platform, (call) async {
      if (call.method == 'Clipboard.getData') return clipboard.future;
      return null;
    });
    addTearDown(() => TestDefaultBinaryMessengerBinding
        .instance.defaultBinaryMessenger
        .setMockMethodCallHandler(SystemChannels.platform, null));
    await tester.pumpWidget(MaterialApp(
        theme: AppTheme.darkTheme,
        home: Scaffold(body: MobileDownloader(engine: NativeMediaEngine()))));
    await tester.pumpAndSettle();
    await tester.enterText(find.byType(TextField), 'https://youtu.be/owned');
    await tester.tap(find.widgetWithText(OutlinedButton, 'Paste'));
    await tester.pump();
    expect(tester.widget<TextField>(find.byType(TextField)).enabled, false);
    expect(
        tester
            .widget<FilledButton>(find.widgetWithText(FilledButton, 'Analyze'))
            .onPressed,
        isNull);
    expect(
        tester
            .widget<TextButton>(find.widgetWithText(TextButton, 'Clear'))
            .onPressed,
        isNull);
    clipboard.complete(null);
    await tester.pumpAndSettle();
    expect(tester.widget<TextField>(find.byType(TextField)).controller!.text,
        'https://youtu.be/owned');
    expect(find.text('Clipboard has no text to paste.'), findsOneWidget);
    expect(tester.widget<TextField>(find.byType(TextField)).enabled, true);
    debugDefaultTargetPlatformOverride = null;
    expect(tester.takeException(), isNull);
  });
  for (final dark in [false, true]) {
    testWidgets('Mobile platform colors, logos and URL locking dark=$dark',
        (tester) async {
      debugDefaultTargetPlatformOverride = TargetPlatform.windows;
      SharedPreferences.setMockInitialValues({});
      tester.view.physicalSize = const Size(360, 800);
      tester.view.devicePixelRatio = 1;
      addTearDown(tester.view.resetPhysicalSize);
      addTearDown(tester.view.resetDevicePixelRatio);
      await tester.pumpWidget(MaterialApp(
        theme: dark ? AppTheme.darkTheme : AppTheme.lightTheme,
        home: Scaffold(body: MobileDownloader(engine: NativeMediaEngine())),
      ));
      await tester.pumpAndSettle();
      expect(find.byType(TextField), findsOneWidget);
      expect(find.text('Optional HTTPS API base'), findsNothing);
      expect(find.byType(SocialPlatformIcon), findsNWidgets(3));
      Color accent() =>
          Theme.of(tester.element(find.widgetWithText(FilledButton, 'Analyze')))
              .colorScheme
              .primary;
      expect(accent(), const Color(0xFFDC2626));
      await tester.tap(find.widgetWithText(ChoiceChip, 'Facebook'));
      await tester.pumpAndSettle();
      expect(accent(), const Color(0xFF1865E6));
      await tester.tap(find.widgetWithText(ChoiceChip, 'Instagram'));
      await tester.pumpAndSettle();
      expect(accent(), const Color(0xFFC13584));
      await tester.enterText(find.byType(TextField), 'https://youtu.be/owned');
      await tester.pumpAndSettle();
      expect(accent(), const Color(0xFFDC2626));
      expect(
          tester
              .widget<ChoiceChip>(find.widgetWithText(ChoiceChip, 'Instagram'))
              .onSelected,
          isNull);
      await tester.tap(find.widgetWithText(FilledButton, 'Analyze'));
      await tester.pumpAndSettle();
      expect(
          find.textContaining(
              'Online downloads are not configured in this build.'),
          findsOneWidget);
      debugDefaultTargetPlatformOverride = null;
      expect(tester.takeException(), isNull);
    });
  }
}
