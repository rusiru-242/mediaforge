import 'dart:convert';
import 'dart:io';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:integration_test/integration_test.dart';
import 'package:path_provider/path_provider.dart';
import 'package:mediaforge_desktop/core/processing/native_media_engine.dart';
import 'package:mediaforge_desktop/core/processing/media_processing_engine.dart';
import 'native_fixtures.dart';

class OfflineContainers extends HttpOverrides {
  @override
  HttpClient createHttpClient(SecurityContext? context) =>
      throw StateError('Container exports must work offline.');
}

void main() {
  IntegrationTestWidgetsFlutterBinding.ensureInitialized();
  testWidgets('Android exports verified WEBM MOV MKV AVI locally',
      (tester) async {
    await tester.pumpWidget(const MaterialApp(
        home: Scaffold(body: Text('Offline container verification'))));
    await tester.runAsync(() async {
      final engine = NativeMediaEngine();
      final folder = await getTemporaryDirectory();
      final input = await File('${folder.path}/owned සිංහල fixture.mp4')
          .writeAsBytes(base64Decode(videoBase64));
      final old = HttpOverrides.current;
      final outputs = <String>[];
      HttpOverrides.global = OfflineContainers();
      try {
        final caps = await engine.capabilities();
        expect(caps.formats[MediaKind.video],
            containsAll(['mp4', 'webm', 'mov', 'mkv', 'avi']));
        for (final format in ['webm', 'mov', 'mkv', 'avi']) {
          final id = await engine.submit(MediaRequest(
              input: input.path,
              kind: MediaKind.video,
              format: format,
              start: .25,
              end: 1.25,
              height: 240,
              crop: const MediaCrop(.25, 0, .5, 1),
              videoFilter: 'mono',
              videoBitrate: 1000));
          final states = await engine
              .watch(id, limit: const Duration(minutes: 3))
              .toList();
          final done = states.last;
          expect(done.state, ProcessingState.completed,
              reason: '$format: ${done.error}');
          final path = done.output!;
          outputs.add(path);
          expect(path, endsWith('.$format'));
          final probe = await engine.channel
              .invokeMapMethod<String, dynamic>('probe', {'path': path});
          expect(probe!['video'], true, reason: format);
          expect(probe['audio'], true, reason: format);
          expect(probe['width'], 160, reason: format);
          expect(probe['height'], 240, reason: format);
          expect(probe['duration'] as num, closeTo(1, .35), reason: format);
          expect(probe['bytes'] as num, greaterThan(0));
          expect(probe['container'].toString(),
              contains(format == 'mkv' ? 'matroska' : format));
          expect(states.where((s) => s.progress != null), isNotEmpty);
          debugPrint('VERIFIED $format: $probe');
        }
        final outputFolder = Directory(await engine.outputDirectory());
        expect(
            outputFolder
                .listSync()
                .whereType<File>()
                .where((f) => f.path.endsWith('.intermediate.mp4')),
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
