import 'dart:io';
import 'dart:ui' as ui;
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:integration_test/integration_test.dart';
import 'package:path_provider/path_provider.dart';
import 'package:mediaforge_desktop/core/processing/native_media_engine.dart';
import 'package:mediaforge_desktop/core/processing/media_processing_engine.dart';

class OfflineAvif extends HttpOverrides {
  @override
  HttpClient createHttpClient(SecurityContext? context) =>
      throw StateError('AVIF export must work offline.');
}

void main() {
  IntegrationTestWidgetsFlutterBinding.ensureInitialized();
  testWidgets('Android exports genuine AVIF with crop filters resize and alpha',
      (tester) async {
    await tester.pumpWidget(const MaterialApp(
        home: Scaffold(body: Text('AVIF offline verification'))));
    await tester.runAsync(() async {
      final engine = NativeMediaEngine();
      final recorder = ui.PictureRecorder();
      final canvas = Canvas(recorder);
      canvas.drawRect(
          const Rect.fromLTWH(0, 0, 80, 60), Paint()..color = Colors.red);
      canvas.drawRect(const Rect.fromLTWH(0, 0, 40, 60),
          Paint()..blendMode = BlendMode.clear);
      final picture = recorder.endRecording();
      final image = await picture.toImage(80, 60);
      final png = await image.toByteData(format: ui.ImageByteFormat.png);
      final folder = await getTemporaryDirectory();
      final input = await File('${folder.path}/owned සිංහල alpha.png')
          .writeAsBytes(png!.buffer.asUint8List());
      image.dispose();
      picture.dispose();
      final old = HttpOverrides.current;
      HttpOverrides.global = OfflineAvif();
      final outputs = <String>[];
      try {
        expect((await engine.capabilities()).formats[MediaKind.image],
            contains('avif'));
        for (final quality in [30, 95]) {
          final id = await engine.submit(MediaRequest(
              input: input.path,
              kind: MediaKind.image,
              format: 'avif',
              quality: quality,
              crop: const MediaCrop(0, 0, .75, 1),
              imageScale: .5,
              imageAdjustments: const {
                'brightness': .05,
                'contrast': 1.1,
                'saturation': 1.2,
                'warmth': .1
              }));
          final done =
              await engine.watch(id, limit: const Duration(minutes: 3)).last;
          expect(done.state, ProcessingState.completed, reason: done.error);
          outputs.add(done.output!);
          expect(done.output, endsWith('.avif'));
          final info = await engine.channel
              .invokeMapMethod<String, dynamic>('probe', {'path': done.output});
          expect(info!['container'], 'avif');
          expect(info['codec'], 'av1');
          expect(info['width'], 30);
          expect(info['height'], 30);
          expect(info['alpha'], true);
          expect(info['bytes'] as num, greaterThan(0));
          final header = await File(done.output!).open();
          final bytes = await header.read(32);
          await header.close();
          expect(String.fromCharCodes(bytes), contains('ftypavif'));
          debugPrint('VERIFIED AVIF quality=$quality: $info');
        }
        expect(
            Directory(await engine.outputDirectory())
                .listSync()
                .whereType<File>()
                .where((f) => f.path.endsWith('.intermediate.png')),
            isEmpty);
      } finally {
        HttpOverrides.global = old;
        await engine.dispose();
        for (final path in outputs) {
          if (await File(path).exists()) await File(path).delete();
        }
        if (await input.exists()) await input.delete();
      }
    });
  }, timeout: const Timeout(Duration(minutes: 15)));
}
