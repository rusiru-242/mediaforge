import 'dart:convert';
import 'dart:io';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:integration_test/integration_test.dart';
import 'package:path_provider/path_provider.dart';
import 'package:mediaforge_desktop/core/processing/native_media_engine.dart';
import 'package:mediaforge_desktop/core/processing/media_processing_engine.dart';
import 'native_fixtures.dart';

class OfflineAudio extends HttpOverrides {
  @override
  HttpClient createHttpClient(SecurityContext? context) =>
      throw StateError('Audio export must remain offline.');
}

void main() {
  IntegrationTestWidgetsFlutterBinding.ensureInitialized();
  testWidgets('Android exports MP3 WAV AAC FLAC OGG and preserves M4A',
      (tester) async {
    await tester.pumpWidget(const MaterialApp(
        home: Scaffold(body: Text('Offline audio format verification'))));
    await tester.runAsync(() async {
      final engine = NativeMediaEngine();
      final dir = await getTemporaryDirectory();
      final input = await File('${dir.path}/owned සිංහල audio fixture.mp4')
          .writeAsBytes(base64Decode(videoBase64));
      final old = HttpOverrides.current;
      HttpOverrides.global = OfflineAudio();
      final outputs = <String>[];
      try {
        final caps = await engine.capabilities();
        expect(caps.formats[MediaKind.audio],
            containsAll(['mp3', 'wav', 'aac', 'flac', 'ogg', 'm4a']));
        for (final format in ['mp3', 'wav', 'aac', 'flac', 'ogg', 'm4a']) {
          final id = await engine.submit(MediaRequest(
              input: input.path,
              kind: MediaKind.audio,
              format: format,
              start: .25,
              end: 1.25,
              audioBitrate: 192,
              volume: .8,
              fadeIn: .1,
              fadeOut: .1,
              audioEffects: const {'echo': 10}));
          final states = await engine
              .watch(id, limit: const Duration(minutes: 3))
              .toList();
          final done = states.last;
          expect(done.state, ProcessingState.completed,
              reason: '$format: ${done.error}');
          outputs.add(done.output!);
          expect(done.output, endsWith('.$format'));
          final info = await engine.channel
              .invokeMapMethod<String, dynamic>('probe', {'path': done.output});
          expect(info!['audio'], true, reason: format);
          expect(info['video'], false, reason: format);
          expect(info['duration'] as num, closeTo(1, .3), reason: format);
          expect(info['bytes'] as num, greaterThan(0));
          expect(info['container'].toString(),
              contains(format == 'm4a' ? 'm4a' : format));
          expect(states.where((s) => s.progress != null), isNotEmpty);
          debugPrint('VERIFIED AUDIO $format: $info');
        }
        final root = Directory(await engine.outputDirectory());
        expect(
            root
                .listSync()
                .whereType<File>()
                .where((f) => f.path.endsWith('.intermediate.wav')),
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
