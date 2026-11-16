import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mediaforge_desktop/core/processing/media_processing_engine.dart';
import 'package:mediaforge_desktop/core/processing/native_media_engine.dart';
import 'package:mediaforge_desktop/core/processing/media_queue.dart';
import 'package:mediaforge_desktop/features/mobile/mobile_editor.dart';

void main() {
  testWidgets('Mobile exposes selectable MP3 WAV AAC FLAC OGG formats',
      (tester) async {
    final engine = NativeMediaEngine();
    final queue = MediaQueue(engine);
    final key = GlobalKey<MobileEditorState>();
    await tester.pumpWidget(MaterialApp(
        home: Scaffold(
            body: MobileEditor(
      key: key,
      kind: MediaKind.audio,
      engine: engine,
      queue: queue,
      caps: const EngineCapabilities({
        MediaKind.audio: ['mp3', 'wav', 'aac', 'flac', 'ogg', 'm4a']
      }),
    ))));
    await tester.scrollUntilVisible(find.text('Audio Container Format'), 150);
    for (final format in ['MP3', 'WAV', 'AAC', 'FLAC', 'OGG', 'M4A']) {
      final chip = find.widgetWithText(ChoiceChip, format);
      await tester.ensureVisible(chip);
      await tester.tap(chip);
      await tester.pump();
      expect(key.currentState!.format, format.toLowerCase());
    }
    await tester.pumpWidget(const SizedBox());
    queue.dispose();
  });
  test('Fade settings validate and serialize', () {
    const r = MediaRequest(
        input: 'audio',
        kind: MediaKind.audio,
        format: 'wav',
        fadeIn: .5,
        fadeOut: 1);
    r.validate();
    expect(r.toMap()['fadeIn'], .5);
    expect(r.toMap()['fadeOut'], 1);
    expect(
        () => const MediaRequest(
                input: 'x', kind: MediaKind.audio, format: 'wav', fadeIn: -1)
            .validate(),
        throwsArgumentError);
  });
  testWidgets('Mobile audio formats, effects and fades fit 360px',
      (tester) async {
    tester.view.physicalSize = const Size(360, 800);
    tester.view.devicePixelRatio = 1;
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);
    final engine = NativeMediaEngine(), queue = MediaQueue(NativeMediaEngine());
    final key = GlobalKey<MobileEditorState>();
    await tester.pumpWidget(MaterialApp(
        home: Scaffold(
            body: MobileEditor(
                key: key,
                kind: MediaKind.audio,
                engine: engine,
                queue: queue,
                caps: const EngineCapabilities({
                  MediaKind.audio: ['m4a', 'wav']
                }, audioEffects: true, audioFades: true)))));
    await tester.scrollUntilVisible(find.text('WAV'), 150);
    expect(find.widgetWithText(ChoiceChip, 'MP3'), findsNothing);
    await tester.tap(find.widgetWithText(ChoiceChip, 'WAV'));
    await tester.pump();
    expect(key.currentState!.format, 'wav');
    await tester.scrollUntilVisible(find.text('Audio Effects'), 150);
    expect(find.text('Reverb'), findsOneWidget);
    await tester.scrollUntilVisible(find.text('Fade Transitions'), 150);
    expect(find.text('Fade In 0.0s'), findsOneWidget);
    for (final slider in tester.widgetList<Slider>(find.byType(Slider))) {
      expect(slider.onChanged, isNull);
    }
    expect(tester.takeException(), isNull);
    await tester.pumpWidget(const SizedBox());
    queue.dispose();
  });
}
