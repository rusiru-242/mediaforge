import 'dart:io';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:archive/archive.dart';
import 'package:mediaforge_desktop/core/processing/batch_archive.dart';
import 'package:mediaforge_desktop/core/processing/media_processing_engine.dart';
import 'package:mediaforge_desktop/core/processing/native_media_engine.dart';
import 'package:mediaforge_desktop/core/processing/media_queue.dart';
import 'package:mediaforge_desktop/features/mobile/mobile_batch.dart';

class _Engine extends NativeMediaEngine {
  @override
  Future<MediaDetails> probeMedia(String path) async => MediaDetails(
      path: path,
      video: path.endsWith('.mp4'),
      audio: path.endsWith('.m4a'),
      bytes: 1024,
      width: 320,
      height: 240,
      duration: 1);
}

void main() {
  test('ZIP streams files, keeps Unicode names and separates duplicates',
      () async {
    final dir = await Directory.systemTemp.createTemp('mediaforge-zip-test-');
    try {
      final source = await File('${dir.path}/input').writeAsBytes([1, 2, 3, 4]);
      final progress = <double>[];
      final path = await BatchArchive().create(
          dir.path,
          [
            (source.path, '\u0dc3\u0dd2\u0d82\u0dc4\u0dbd.png'),
            (source.path, '\u0dc3\u0dd2\u0d82\u0dc4\u0dbd.png')
          ],
          onProgress: progress.add);
      final zip = ZipDecoder()
          .decodeBytes(await File(path).readAsBytes(), verify: true);
      expect(zip.length, 2);
      expect(zip.files[0].name, '1_\u0dc3\u0dd2\u0d82\u0dc4\u0dbd.png');
      expect(zip.files[1].name, '2_\u0dc3\u0dd2\u0d82\u0dc4\u0dbd.png');
      expect(zip.files[0].content, [1, 2, 3, 4]);
      expect(progress.last, 1);
    } finally {
      await dir.delete(recursive: true);
    }
  });
  test('ZIP cancellation removes partial output', () async {
    final dir = await Directory.systemTemp.createTemp('mediaforge-zip-cancel-');
    try {
      final source = await File('${dir.path}/input')
          .writeAsBytes(List.filled(1024 * 1024, 7));
      final packager = BatchArchive();
      await expectLater(
          packager.create(dir.path, [(source.path, 'a'), (source.path, 'b')],
              onProgress: (_) => packager.cancel()),
          throwsStateError);
      expect(
          dir
              .listSync()
              .whereType<File>()
              .where((f) => f.path.endsWith('.part')),
          isEmpty);
    } finally {
      await dir.delete(recursive: true);
    }
  });
  test('ZIP rejects missing outputs', () async {
    await expectLater(
        BatchArchive()
            .create(Directory.systemTemp.path, [('missing-output', 'x')]),
        throwsStateError);
  });
  for (final dark in [false, true]) {
    testWidgets('Batch filters and output settings fit mobile dark=$dark',
        (tester) async {
      tester.view.physicalSize = const Size(360, 800);
      tester.view.devicePixelRatio = 1;
      addTearDown(tester.view.resetPhysicalSize);
      addTearDown(tester.view.resetDevicePixelRatio);
      final engine = _Engine(), queue = MediaQueue(_Engine());
      final key = GlobalKey<MobileBatchState>();
      await tester.pumpWidget(MaterialApp(
          theme:
              ThemeData(brightness: dark ? Brightness.dark : Brightness.light),
          home: Scaffold(
              body: MobileBatch(
                  key: key,
                  engine: engine,
                  queue: queue,
                  caps: const EngineCapabilities({
                    MediaKind.video: ['mp4'],
                    MediaKind.audio: ['m4a', 'wav'],
                    MediaKind.image: ['jpg', 'png', 'webp']
                  }, maxHeight: 2160, encoderTuning: true)))));
      expect(find.text('Clear Queue'), findsOneWidget);
      await key.currentState!
          .importPaths(['movie.mp4', 'image.png', 'sound.m4a']);
      await tester.pump();
      expect(key.currentState!.items.length, 3);
      await tester.scrollUntilVisible(
          find.widgetWithText(ChoiceChip, 'Image'), 200);
      await tester.tap(find.widgetWithText(ChoiceChip, 'Image'));
      await tester.pump();
      expect(find.text('movie.mp4'), findsNothing);
      await tester.scrollUntilVisible(find.text('Image quality'), 150);
      await tester.tap(find.text('High'));
      await tester.pumpAndSettle();
      await tester.tap(find.text('Low').last);
      await tester.pumpAndSettle();
      expect(key.currentState!.items[1].quality, 50);
      await tester.scrollUntilVisible(
          find.widgetWithText(ChoiceChip, 'Video'), -200);
      await tester.tap(find.widgetWithText(ChoiceChip, 'Video'));
      await tester.pump();
      await tester.scrollUntilVisible(find.text('Output resolution'), 150);
      await tester.tap(find.text('Original resolution'));
      await tester.pumpAndSettle();
      expect(find.text('4K (2160p)'), findsOneWidget);
      await tester.tap(find.text('720p'));
      await tester.pumpAndSettle();
      expect(key.currentState!.items[0].height, 720);
      key.currentState!.clear();
      await tester.pump();
      expect(key.currentState!.items, isEmpty);
      expect(tester.takeException(), isNull);
      await tester.pumpWidget(const SizedBox());
      queue.dispose();
    });
  }
}
