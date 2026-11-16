import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:mediaforge_desktop/core/theme/app_theme.dart';
import 'package:mediaforge_desktop/features/desktop/desktop_editor.dart';
import 'package:mediaforge_desktop/features/desktop/desktop_widgets.dart';
import 'package:mediaforge_desktop/shared/providers/app_providers.dart';

void main() {
  testWidgets(
      'Desktop video resolution and filters reach export payload independently of audio',
      (tester) async {
    SharedPreferences.setMockInitialValues({});
    final prefs = await SharedPreferences.getInstance();
    final key = GlobalKey<DesktopEditorState>();
    await tester.pumpWidget(ProviderScope(
        overrides: [sharedPreferencesProvider.overrideWithValue(prefs)],
        child: MaterialApp(
            theme: AppTheme.lightTheme,
            home: Scaffold(
                body: SingleChildScrollView(
                    child: DesktopEditor(key: key, kind: 'video'))))));
    final selector = tester.widget<StudioSelect>(find.byWidgetPredicate(
        (w) => w is StudioSelect && w.label == 'Output Resolution'));
    expect(selector.values, [
      'Original',
      '144p',
      '240p',
      '360p',
      '480p',
      '720p',
      '1080p',
      '1440p',
      '2160p'
    ]);
    expect(selector.onChanged, isNull);
    expect(find.text('Video Filters'), findsOneWidget);
    key.currentState!.path = 'owned.mp4';
    key.currentState!.change(() {
      key.currentState!.duration = 3;
      key.currentState!.end = 3;
    });
    await tester.pump();
    for (final resolution in selector.values) {
      final active = tester.widget<StudioSelect>(find.byWidgetPredicate(
          (w) => w is StudioSelect && w.label == 'Output Resolution'));
      active.onChanged!(resolution);
      await tester.pump();
      expect(key.currentState!.payload('input')['targetResolution'],
          resolution == 'Original' ? null : resolution);
    }
    final mono =
        tester.widget<ChoiceChip>(find.widgetWithText(ChoiceChip, 'Mono'));
    mono.onSelected!(true);
    await tester.pump();
    expect(key.currentState!.payload('input')['saturation'], 0);
    key.currentState!.change(() {
      key.currentState!.exportMode = 'Audio';
      key.currentState!.format = 'mp3';
    });
    await tester.pump();
    expect(key.currentState!.payload('input').containsKey('saturation'), false);
    expect(key.currentState!.payload('input').containsKey('targetResolution'),
        false);
    expect(find.text('Video Filters'), findsNothing);
    await tester.pumpWidget(const SizedBox());
    await tester.pump();
  });
}
