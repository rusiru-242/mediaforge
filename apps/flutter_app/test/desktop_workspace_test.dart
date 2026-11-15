import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:mediaforge_desktop/core/theme/app_theme.dart';
import 'package:mediaforge_desktop/features/desktop/desktop_workspace.dart';
import 'package:mediaforge_desktop/features/desktop/crop_surface.dart';
import 'package:mediaforge_desktop/shared/providers/app_providers.dart';
import 'package:mediaforge_desktop/features/desktop/desktop_window.dart';

void main() {
  test('Initial Windows size respects DPI-adjusted work area', () {
    expect(initialDesktopSize(const Size(1920, 1040)), const Size(1280, 800));
    expect(initialDesktopSize(const Size(1024, 720)), const Size(976, 672));
    expect(initialDesktopSize(const Size(800, 600)), const Size(752, 552));
  });
  for (final size in [
    const Size(1920, 1080),
    const Size(1600, 900),
    const Size(1366, 768),
    const Size(1280, 720),
    const Size(640, 480)
  ]) {
    for (final dark in [false, true]) {
      testWidgets('Desktop pages fit ${size.width}×${size.height}, dark=$dark',
          (tester) async {
        tester.view.physicalSize = size;
        tester.view.devicePixelRatio = 1;
        addTearDown(tester.view.resetPhysicalSize);
        addTearDown(tester.view.resetDevicePixelRatio);
        SharedPreferences.setMockInitialValues({});
        final prefs = await SharedPreferences.getInstance();
        await tester.pumpWidget(ProviderScope(
            overrides: [sharedPreferencesProvider.overrideWithValue(prefs)],
            child: MaterialApp(
                theme: dark ? AppTheme.darkTheme : AppTheme.lightTheme,
                home: const DesktopWorkspace())));
        await tester.pump(const Duration(milliseconds: 300));
        expect(tester.takeException(), isNull);
        for (final title in [
          'Downloader',
          'Video Editor',
          'Audio Editor',
          'Image Editor',
          'Batch Converter',
          'Settings',
          'Overview'
        ]) {
          final tooltip = find.byWidgetPredicate((widget) =>
              widget is Tooltip &&
              (widget.message?.startsWith('$title •') ?? false));
          await tester.ensureVisible(tooltip);
          await tester.pump(const Duration(milliseconds: 300));
          await tester.tap(tooltip);
          await tester.pump(const Duration(milliseconds: 300));
          expect(tester.takeException(), isNull,
              reason: '$title overflowed at $size');
          if (title.endsWith('Editor')) {
            for (final slider
                in tester.widgetList<Slider>(find.byType(Slider))) {
              expect(slider.onChanged, isNull);
            }
            for (final slider
                in tester.widgetList<RangeSlider>(find.byType(RangeSlider))) {
              expect(slider.onChanged, isNull);
            }
          }
        }
        await tester.pumpWidget(const SizedBox());
        await tester.pump(const Duration(milliseconds: 300));
      });
    }
  }
  test('Free crop stays inside source bounds', () {
    final value = clampCrop(const Rect.fromLTWH(-.2, .9, .6, .5));
    expect(value.left, 0);
    expect(value.bottom, 1);
    expect(value.width, .6);
  });
  testWidgets('Crop frame corners resize and body moves', (tester) async {
    Rect crop = const Rect.fromLTWH(.2, .2, .6, .6);
    await tester.pumpWidget(MaterialApp(
        home: Center(
            child: SizedBox(
                width: 500,
                child: StatefulBuilder(
                    builder: (context, update) => CropSurface(
                        aspect: 1,
                        crop: crop,
                        onChanged: (v) => update(() => crop = v),
                        child: const ColoredBox(color: Colors.black)))))));
    final handles = find.bySemanticsLabel('Resize crop');
    expect(handles, findsNWidgets(8));
    await tester.drag(handles.first, const Offset(-40, -40));
    await tester.pump();
    expect(crop.left, lessThan(.2));
    expect(crop.width, greaterThan(.6));
  });
}
