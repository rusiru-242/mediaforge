import 'dart:async';
import 'package:flutter/services.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mediaforge_desktop/core/processing/media_processing_engine.dart';
import 'package:mediaforge_desktop/core/processing/native_media_engine.dart';
import 'package:mediaforge_desktop/core/processing/media_queue.dart';

class ControlledEngine extends MediaProcessingEngine {
  final started = <String>[];
  final streams = <String, StreamController<ProcessingJob>>{};
  @override
  Future<EngineCapabilities> capabilities() async => const EngineCapabilities({
        MediaKind.video: ['mp4']
      });
  @override
  Future<MediaDetails> probeMedia(String path) async => MediaDetails(
      path: path, video: true, duration: 3, width: 640, height: 480);
  @override
  Future<String> submit(MediaRequest r) async {
    final id = 'job-${started.length}';
    started.add(id);
    streams[id] = StreamController();
    return id;
  }

  @override
  Stream<ProcessingJob> watch(String id,
          {Duration limit = const Duration(minutes: 30)}) =>
      streams[id]!.stream;
  @override
  Future<ProcessingJob> status(String id) async =>
      ProcessingJob(id, ProcessingState.processing);
  void finish(String id, ProcessingState state) {
    streams[id]!.add(ProcessingJob(id, state));
    streams[id]!.close();
  }

  @override
  Future<void> cancelJob(String id) async {
    finish(id, ProcessingState.cancelled);
  }

  @override
  Future<void> cleanup() async {}
  @override
  Future<void> dispose() async {}
}

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();
  test('Typed requests reject invalid ranges, crop bounds and unsafe formats',
      () {
    for (final r in [
      const MediaRequest(
          input: 'clip',
          kind: MediaKind.video,
          format: 'mp4',
          start: 5,
          end: 4),
      const MediaRequest(
          input: 'clip', kind: MediaKind.video, format: '../mp4'),
      const MediaRequest(
          input: 'clip', kind: MediaKind.video, format: 'mp4', height: 145),
      const MediaRequest(
          input: 'clip',
          kind: MediaKind.video,
          format: 'mp4',
          crop: MediaCrop(.8, 0, .4, 1)),
    ]) {
      expect(r.validate, throwsArgumentError);
    }
  });
  test(
      'Native adapter exposes actual formats, transmits edits and propagates missing engine errors',
      () async {
    const channel = MethodChannel('mediaforge/test-native');
    final calls = <MethodCall>[];
    TestDefaultBinaryMessengerBinding.instance.defaultBinaryMessenger
        .setMockMethodCallHandler(channel, (c) async {
      calls.add(c);
      return switch (c.method) {
        'capabilities' => {
            'video': ['mp4'],
            'audio': ['m4a'],
            'image': ['jpg', 'png'],
            'maxHeight': 1080
          },
        'submit' => {'id': 'real-native-id'},
        _ => throw PlatformException(code: 'MISSING')
      };
    });
    addTearDown(() => TestDefaultBinaryMessengerBinding
        .instance.defaultBinaryMessenger
        .setMockMethodCallHandler(channel, null));
    final engine = NativeMediaEngine(channel: channel);
    expect(
        await engine.submit(const MediaRequest(
            input: 'owned.mp4',
            kind: MediaKind.video,
            format: 'mp4',
            start: 1,
            end: 2,
            height: 720,
            crop: MediaCrop(0, 0, .5, 1))),
        'real-native-id');
    expect((calls.last.arguments as Map)['height'], 720);
    await expectLater(
        engine.submit(const MediaRequest(
            input: 'owned.mp4', kind: MediaKind.video, format: 'webm')),
        throwsUnsupportedError);
    await expectLater(
        engine.probeMedia('missing.mp4'), throwsA(isA<PlatformException>()));
  });
  test(
      'Shared queue is sequential, survives failure and cancels queued items without starting them',
      () async {
    final engine = ControlledEngine(), queue = MediaQueue(ControlledEngine());
    queue.dispose();
    final actual = MediaQueue(engine);
    addTearDown(actual.dispose);
    const request =
        MediaRequest(input: 'owned.mp4', kind: MediaKind.video, format: 'mp4');
    final one = actual.add(request),
        two = actual.add(request),
        three = actual.add(request);
    await Future<void>.delayed(Duration.zero);
    expect(engine.started.length, 1);
    await actual.cancel(three);
    expect(three.snapshot.state, ProcessingState.cancelled);
    engine.finish(one.nativeId!, ProcessingState.failed);
    await Future<void>.delayed(Duration.zero);
    expect(one.snapshot.state, ProcessingState.failed);
    expect(engine.started.length, 2);
    engine.finish(two.nativeId!, ProcessingState.completed);
    await Future<void>.delayed(Duration.zero);
    expect(two.snapshot.state, ProcessingState.completed);
    expect(actual.busy, false);
    expect(engine.started.length, 2);
  });
}
