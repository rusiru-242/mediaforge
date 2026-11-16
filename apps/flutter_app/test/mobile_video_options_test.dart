import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mediaforge_desktop/core/processing/media_processing_engine.dart';
import 'package:mediaforge_desktop/core/processing/native_media_engine.dart';
import 'package:mediaforge_desktop/core/processing/media_queue.dart';
import 'package:mediaforge_desktop/features/mobile/mobile_editor.dart';
import 'package:mediaforge_desktop/features/mobile/video_look.dart';

void main() {
  test('Advanced values are validated and serialized for native export', () {
    const request = MediaRequest(
        input: 'clip',
        kind: MediaKind.video,
        format: 'mp4',
        videoFilter: 'mono',
        videoBitrate: 1200,
        volume: .5,
        audioEffects: {'echo': 25});
    request.validate();
    expect(request.toMap()['videoFilter'], 'mono');
    expect(request.toMap()['audioEffects'], {'echo': 25.0});
    expect(
        () => const MediaRequest(
                input: 'x',
                kind: MediaKind.video,
                format: 'mp4',
                volume: double.nan)
            .validate(),
        throwsArgumentError);
    expect(
        () => const MediaRequest(
            input: 'x',
            kind: MediaKind.video,
            format: 'mp4',
            audioEffects: {'echo': 101}).validate(),
        throwsArgumentError);
    final mono = videoLookMatrix('mono');
    expect(mono.sublist(0, 3), mono.sublist(5, 8));
    expect(mono.sublist(5, 8), mono.sublist(10, 13));
  });
  testWidgets('Format pills select real engine formats and audio mode',
      (tester) async {
    final engine = NativeMediaEngine(), queue = MediaQueue(NativeMediaEngine());
    final key = GlobalKey<MobileEditorState>();
    await tester.pumpWidget(MaterialApp(
        home: Scaffold(
            body: MobileEditor(
      key: key,
      kind: MediaKind.video,
      engine: engine,
      queue: queue,
      caps: const EngineCapabilities({
        MediaKind.video: ['mp4', 'webm', 'mov', 'mkv', 'avi'],
        MediaKind.audio: ['mp3', 'm4a', 'wav'],
      }),
    ))));
    await tester.scrollUntilVisible(find.text('AVI'), 150);
    await tester.tap(find.widgetWithText(ChoiceChip, 'AVI'));
    await tester.pump();
    expect(key.currentState!.format, 'avi');
    await tester.ensureVisible(find.text('Export Audio'));
    await tester.tap(find.text('Export Audio'));
    await tester.pump();
    await tester.ensureVisible(find.text('WAV'));
    await tester.tap(find.widgetWithText(ChoiceChip, 'WAV'));
    await tester.pump();
    expect(key.currentState!.format, 'wav');
    expect(key.currentState!.exportAudio, isTrue);
    expect(tester.takeException(), isNull);
    await tester.pumpWidget(const SizedBox());
    queue.dispose();
  });
  testWidgets(
      'Mobile web options fit a narrow screen and lock unloaded sliders',
      (tester) async {
    tester.view.physicalSize = const Size(360, 800);
    tester.view.devicePixelRatio = 1;
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);
    final engine = NativeMediaEngine(), queue = MediaQueue(NativeMediaEngine());
    await tester.pumpWidget(MaterialApp(
        home: Scaffold(
            body: MobileEditor(
                kind: MediaKind.video,
                engine: engine,
                queue: queue,
                caps: const EngineCapabilities({
                  MediaKind.video: ['mp4'],
                  MediaKind.audio: ['m4a']
                },
                    videoFilters: true,
                    audioEffects: true,
                    encoderTuning: true)))));
    await tester.scrollUntilVisible(find.text('Container Format'), 150);
    for (final f in ['MP4', 'WEBM', 'MOV', 'MKV', 'AVI']) {
      expect(find.widgetWithText(ChoiceChip, f), findsOneWidget);
    }
    expect(
        tester
            .widget<ChoiceChip>(find.widgetWithText(ChoiceChip, 'AVI'))
            .onSelected,
        isNull);
    expect(
        tester
            .widget<ChoiceChip>(find.widgetWithText(ChoiceChip, 'MP4'))
            .selected,
        isTrue);
    await tester.scrollUntilVisible(find.text('Video Filters'), 200);
    expect(find.text('Vivid Warm'), findsOneWidget);
    await tester.scrollUntilVisible(find.text('Audio Effects'), 200);
    expect(find.text('Reverb'), findsOneWidget);
    expect(find.text('Preview effects'), findsOneWidget);
    for (final slider in tester.widgetList<Slider>(find.byType(Slider))) {
      expect(slider.onChanged, isNull);
    }
    expect(tester.takeException(), isNull);
    await tester.pumpWidget(const SizedBox());
    queue.dispose();
  });
}
