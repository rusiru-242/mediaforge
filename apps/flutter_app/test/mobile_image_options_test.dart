import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mediaforge_desktop/core/processing/media_processing_engine.dart';
import 'package:mediaforge_desktop/core/processing/native_media_engine.dart';
import 'package:mediaforge_desktop/core/processing/media_queue.dart';
import 'package:mediaforge_desktop/features/mobile/mobile_editor.dart';

void main() {
  testWidgets('Image editor exposes selectable AVIF from native capabilities',
      (tester) async {
    final engine = NativeMediaEngine();
    final queue = MediaQueue(engine);
    final key = GlobalKey<MobileEditorState>();
    await tester.pumpWidget(MaterialApp(
        home: Scaffold(
            body: MobileEditor(
      key: key,
      kind: MediaKind.image,
      engine: engine,
      queue: queue,
      caps: const EngineCapabilities({
        MediaKind.image: ['jpg', 'png', 'webp', 'avif']
      }),
    ))));
    await tester.scrollUntilVisible(find.text('AVIF'), 150);
    await tester.tap(find.widgetWithText(ChoiceChip, 'AVIF'));
    await tester.pump();
    expect(key.currentState!.format, 'avif');
    expect(
        tester
            .widget<ChoiceChip>(find.widgetWithText(ChoiceChip, 'AVIF'))
            .selected,
        true);
    expect(tester.takeException(), isNull);
    await tester.pumpWidget(const SizedBox());
    queue.dispose();
  });
  test('Image settings validate media type and finite adjustments', () {
    const r = MediaRequest(
        input: 'x',
        kind: MediaKind.image,
        format: 'png',
        imageScale: .5,
        flipHorizontal: true,
        imageAdjustments: {'saturation': 0});
    r.validate();
    expect(r.toMap()['imageScale'], .5);
    expect(r.toMap()['flipHorizontal'], true);
    expect(
        () => const MediaRequest(
                input: 'x',
                kind: MediaKind.video,
                format: 'mp4',
                imageScale: .5)
            .validate(),
        throwsArgumentError);
    expect(
        () => const MediaRequest(
            input: 'x',
            kind: MediaKind.image,
            format: 'jpg',
            imageAdjustments: {'contrast': double.nan}).validate(),
        throwsArgumentError);
  });
  for (final dark in [false, true]) {
    testWidgets('Image website options fit mobile dark=$dark', (tester) async {
      tester.view.physicalSize = const Size(360, 800);
      tester.view.devicePixelRatio = 1;
      addTearDown(tester.view.resetPhysicalSize);
      addTearDown(tester.view.resetDevicePixelRatio);
      final engine = NativeMediaEngine(),
          queue = MediaQueue(NativeMediaEngine());
      await tester.pumpWidget(MaterialApp(
          theme:
              ThemeData(brightness: dark ? Brightness.dark : Brightness.light),
          home: Scaffold(
              body: MobileEditor(
                  kind: MediaKind.image,
                  engine: engine,
                  queue: queue,
                  caps: const EngineCapabilities({
                    MediaKind.image: ['jpg', 'png', 'webp']
                  }, imageEditing: true)))));
      await tester.scrollUntilVisible(find.text('Photo Filters'), 150);
      expect(find.text('Vivid Warm'), findsOneWidget);
      await tester.scrollUntilVisible(find.text('Target Format'), 150);
      expect(
          tester
              .widget<ChoiceChip>(find.widgetWithText(ChoiceChip, 'WEBP'))
              .selected,
          true);
      expect(find.widgetWithText(ChoiceChip, 'AVIF'), findsNothing);
      await tester.scrollUntilVisible(find.text('Resolution Scaling'), 150);
      for (final slider in tester.widgetList<Slider>(find.byType(Slider))) {
        expect(slider.onChanged, isNull);
      }
      expect(tester.takeException(), isNull);
      await tester.pumpWidget(const SizedBox());
      queue.dispose();
    });
  }
}
