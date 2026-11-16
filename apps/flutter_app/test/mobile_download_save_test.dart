import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:mediaforge_desktop/core/processing/native_media_engine.dart';
import 'package:mediaforge_desktop/core/processing/media_processing_engine.dart';
import 'package:mediaforge_desktop/core/services/backend_api.dart';
import 'package:mediaforge_desktop/features/mobile/mobile_downloader.dart';
import 'package:mediaforge_desktop/features/mobile/mobile_editor.dart';
import 'package:mediaforge_desktop/core/processing/media_queue.dart';

class SaveEngine extends NativeMediaEngine {
  int saves = 0;
  String? lastPath;
  @override
  Future<String> outputDirectory() async => '/native-outputs';
  @override
  Future<MediaDetails> probeMedia(String path) async =>
      MediaDetails(path: path, video: true, audio: true);
  @override
  Future<String?> save(String path, {bool gallery = false}) async {
    saves++;
    lastPath = path;
    expect(path, startsWith('/native-outputs/'));
    return 'saved';
  }
}

class SaveApi extends BackendApi {
  SaveApi()
      : super(
            baseUrl: 'https://media.example/api/v1',
            client: MockClient((r) async {
              return http.Response(
                  jsonEncode(r.url.path.endsWith('/metadata')
                      ? {
                          'success': true,
                          'title': 'Test media',
                          'availableFormats': [
                            {'format': 'mp4', 'quality': '720p'},
                            {'format': 'mp4', 'quality': '360p'}
                          ]
                        }
                      : {
                          'id': 'job',
                          'status': 'COMPLETED',
                          'progress': 100,
                          'outputFileId': 'output'
                        }),
                  200);
            }));
  @override
  Future<void> save(String endpoint, String destination,
      {void Function(double?)? onProgress}) async {}
}

void main() {
  for (final kind in MediaKind.values) {
    testWidgets('$kind export automatically saves once and exposes only Share',
        (tester) async {
      final engine = SaveEngine();
      final queue = MediaQueue(engine);
      final entry =
          QueueEntry(MediaRequest(input: 'input', kind: kind, format: 'mp4'));
      entry.snapshot = const ProcessingJob('job', ProcessingState.completed,
          output: '/native-outputs/verified.mp4');
      Widget panel() => MaterialApp(
          home: Scaffold(
              body: MobileJobPanel(
                  entry: entry, engine: engine, queue: queue, autoSave: true)));
      await tester.pumpWidget(panel());
      await tester.pumpAndSettle();
      expect(engine.saves, 1);
      expect(find.text('Save to Files'), findsNothing);
      expect(find.text('Save to Gallery'), findsNothing);
      expect(find.text('Share'), findsOneWidget);
      await tester.pumpWidget(panel());
      await tester.pumpAndSettle();
      expect(engine.saves, 1);
      await tester.pumpWidget(const SizedBox());
      queue.dispose();
    });
  }
  testWidgets('Verified download opens native save and leaves only Share',
      (tester) async {
    SharedPreferences.setMockInitialValues(
        {'mobileOnlineService': 'https://media.example/api/v1'});
    final engine = SaveEngine();
    await tester.pumpWidget(MaterialApp(
        home: Scaffold(
            body: MobileDownloader(
                engine: engine, apiFactory: (_) => SaveApi()))));
    await tester.enterText(find.byType(TextField), 'https://youtu.be/test');
    await tester.pump();
    await tester.tap(find.text('Analyze'));
    await tester.pumpAndSettle();
    await tester.scrollUntilVisible(find.text('Download'), 250,
        scrollable: find.byType(Scrollable).first);
    await tester.runAsync(() async {
      await tester.tap(find.text('Download'));
      // Filename collision checks use real asynchronous filesystem I/O.
      for (var i = 0; i < 100 && engine.saves == 0; i++) {
        await Future<void>.delayed(const Duration(milliseconds: 10));
      }
    });
    await tester.pumpAndSettle();
    expect(engine.saves, 1);
    expect(engine.lastPath, endsWith('/Test media (720p).mp4'));
    expect(find.text('Download'), findsNothing);
    expect(find.text('Share'), findsOneWidget);
    expect(find.text('Saved successfully.'), findsOneWidget);
    expect(tester.takeException(), isNull);
  });
}
