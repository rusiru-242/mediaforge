import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:mediaforge_desktop/core/processing/native_media_engine.dart';
import 'package:mediaforge_desktop/core/theme/app_theme.dart';
import 'package:mediaforge_desktop/features/mobile/mobile_workspace.dart';
import 'package:mediaforge_desktop/shared/providers/app_providers.dart';

void main() {
  for (final size in [const Size(390, 844), const Size(320, 568)]) {
    for (final dark in [false, true]) {
      testWidgets('Offline native mobile navigation at $size, dark=$dark',
          (tester) async {
        tester.view.physicalSize = size;
        tester.view.devicePixelRatio = 1;
        addTearDown(tester.view.resetPhysicalSize);
        addTearDown(tester.view.resetDevicePixelRatio);
        const channel = MethodChannel('mediaforge/ui-test');
        final methods = <String>[];
        TestDefaultBinaryMessengerBinding.instance.defaultBinaryMessenger
            .setMockMethodCallHandler(channel, (call) async {
          methods.add(call.method);
          if (call.method == 'capabilities') {
            return {
              'video': ['mp4'],
              'audio': ['m4a'],
              'image': ['jpg', 'png'],
              'cropVideo': true,
              'cut': true,
              'imageRotation': true,
              'maxHeight': 1080
            };
          }
          return null;
        });
        addTearDown(() => TestDefaultBinaryMessengerBinding
            .instance.defaultBinaryMessenger
            .setMockMethodCallHandler(channel, null));
        SharedPreferences.setMockInitialValues({});
        final prefs = await SharedPreferences.getInstance();
        await tester.pumpWidget(ProviderScope(
            overrides: [sharedPreferencesProvider.overrideWithValue(prefs)],
            child: MaterialApp(
                theme: dark ? AppTheme.darkTheme : AppTheme.lightTheme,
                home: MobileWorkspace(
                    engine: NativeMediaEngine(channel: channel)))));
        await tester.pumpAndSettle();
        expect(find.text('Your Media. Your Way.'), findsOneWidget);
        for (final label in [
          'Video Editor',
          'Audio Editor',
          'Image Editor',
          'Batch Converter',
          'Downloader',
          'Overview'
        ]) {
          await tester.tap(find.byTooltip('Open navigation menu'));
          await tester.pumpAndSettle();
          final tile = find.widgetWithText(ListTile, label).last;
          await tester.ensureVisible(tile);
          await tester.tap(tile);
          await tester.pumpAndSettle();
          expect(tester.takeException(), isNull, reason: label);
        }
        expect(methods.toSet(), containsAll(['capabilities', 'cleanup']));
        expect(methods, isNot(contains('submit')));
        await tester.pumpWidget(const SizedBox());
        await tester.pumpAndSettle();
      });
    }
  }
}
