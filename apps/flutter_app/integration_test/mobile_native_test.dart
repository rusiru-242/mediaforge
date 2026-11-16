import 'dart:convert';
import 'dart:io';
import 'dart:ui' as ui;
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:integration_test/integration_test.dart';
import 'package:path_provider/path_provider.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:mediaforge_desktop/features/mobile/mobile_editor.dart';
import 'package:mediaforge_desktop/core/theme/app_theme.dart';
import 'package:mediaforge_desktop/shared/providers/app_providers.dart';
import 'package:mediaforge_desktop/core/processing/media_processing_engine.dart';
import 'package:mediaforge_desktop/core/processing/native_media_engine.dart';
import 'package:mediaforge_desktop/core/processing/media_queue.dart';
import 'package:mediaforge_desktop/core/processing/media_file_store.dart';
import 'native_fixtures.dart';
import 'package:mediaforge_desktop/core/processing/batch_archive.dart';
import 'package:archive/archive.dart';
import 'package:mediaforge_desktop/features/mobile/video_look.dart';

class NoNetwork extends HttpOverrides {
  @override
  HttpClient createHttpClient(SecurityContext? context) =>
      throw StateError('Offline tests must not create an HTTP client.');
}

void main() {
  IntegrationTestWidgetsFlutterBinding.ensureInitialized();
  testWidgets(
      'Real native offline video, audio, image, cuts, queue, cancellation and gallery',
      (tester) async {
    await tester.pumpWidget(const MaterialApp(
        home: Scaffold(
            body: Center(
                child: Text('MediaForge native offline verification')))));
    final engine = NativeMediaEngine();
    await tester.runAsync(() async {
      final report = <String, dynamic>{
        'platform': Platform.operatingSystem,
        'checks': <String, dynamic>{},
        'success': false
      };
      final checks = report['checks'] as Map<String, dynamic>;
      final root = await getApplicationDocumentsDirectory();
      final folder = await Directory('${root.path}/native-verification')
          .create(recursive: true);
      final video = await File(
              '${folder.path}/owned \u0dc3\u0dd2\u0d82\u0dc4\u0dbd video.mp4')
          .writeAsBytes(base64Decode(videoBase64));
      final image = await File('${folder.path}/owned image.png')
          .writeAsBytes(base64Decode(imageBase64));
      final savedOverride = HttpOverrides.current;
      HttpOverrides.global = NoNetwork();
      final outputs = <String>[];
      Future<void> check(String name, Future<void> Function() action) async {
        try {
          await action();
          checks[name] = {'passed': true};
        } catch (e) {
          checks[name] = {'passed': false, 'error': e.toString()};
        }
      }

      Future<ProcessingJob> export(MediaRequest request) async {
        final id = await engine.submit(request);
        final samples = <double?>[];
        final done =
            await engine.watch(id, limit: const Duration(minutes: 3)).map((s) {
          samples.add(s.progress);
          return s;
        }).last;
        expect(done.state, ProcessingState.completed, reason: done.error);
        expect(done.output, isNotNull);
        report['progressSamples'] = samples;
        outputs.add(done.output!);
        return done;
      }

      try {
        await check('native_capabilities', () async {
          final caps = await engine.capabilities();
          expect(caps.formats[MediaKind.video], contains('mp4'));
          expect(caps.formats[MediaKind.audio], contains('m4a'));
          report['formats'] = {
            for (final e in caps.formats.entries) e.key.name: e.value
          };
        });
        await check('unicode_video_probe', () async {
          final d = await engine.probeMedia(video.path);
          expect(d.video, true);
          expect(d.audio, true);
          expect(d.width, 320);
          expect(d.height, 240);
        });
        await check('trim_crop_resize_mp4_with_audio', () async {
          final done = await export(MediaRequest(
              input: video.path,
              kind: MediaKind.video,
              format: 'mp4',
              start: .25,
              end: 1.25,
              height: 240,
              crop: const MediaCrop(.25, 0, .5, 1)));
          final d = await engine.probeMedia(done.output!);
          expect(d.video, true);
          expect(d.audio, true);
          expect(d.height, 240);
          expect(d.width, 160);
          expect(d.duration, closeTo(1, .3));
        });
        await check('cut_interval_removes_real_duration', () async {
          final done = await export(MediaRequest(
              input: video.path,
              kind: MediaKind.video,
              format: 'mp4',
              start: 0,
              end: 1.5,
              cuts: const [MediaCut(.5, 1)]));
          expect(
              (await engine.probeMedia(done.output!)).duration, closeTo(1, .3));
        });
        await check('wav_trim_cuts_fades_effects', () async {
          final done = await export(MediaRequest(
              input: video.path,
              kind: MediaKind.audio,
              format: 'wav',
              start: .1,
              end: 1.4,
              cuts: const [MediaCut(.6, .8)],
              volume: .7,
              fadeIn: .3,
              fadeOut: .3,
              audioEffects: const {'echo': 20}));
          final d = await engine.probeMedia(done.output!);
          expect(d.audio, true);
          expect(d.video, false);
          expect(d.duration, closeTo(1.1, .05));
          report['wavFadeOutput'] = done.output;
          report['wavGalleryUri'] =
              await engine.save(done.output!, gallery: true);
        });
        await check('m4a_fades_export', () async {
          final done = await export(MediaRequest(
              input: video.path,
              kind: MediaKind.audio,
              format: 'm4a',
              start: .1,
              end: 1.4,
              fadeIn: .3,
              fadeOut: .3));
          final d = await engine.probeMedia(done.output!);
          expect(d.audio, true);
          expect(d.video, false);
          report['m4aFadeOutput'] = done.output;
          report['m4aGalleryUri'] =
              await engine.save(done.output!, gallery: true);
        });
        await check('audio_m4a_has_no_video', () async {
          final done = await export(MediaRequest(
              input: video.path,
              kind: MediaKind.audio,
              format: 'm4a',
              start: .2,
              end: 1.2,
              audioBitrate: 192));
          final d = await engine.probeMedia(done.output!);
          expect(d.audio, true);
          expect(d.video, false);
          expect(d.duration, closeTo(1, .3));
        });
        await check('image_filters_flips_scale_and_formats', () async {
          final recorder = ui.PictureRecorder();
          final canvas = Canvas(recorder);
          for (final entry in [
            (const Rect.fromLTWH(0, 0, 40, 30), const Color(0xFFFF0000)),
            (const Rect.fromLTWH(40, 0, 40, 30), const Color(0xFF00FF00)),
            (const Rect.fromLTWH(0, 30, 40, 30), const Color(0xFF0000FF)),
            (const Rect.fromLTWH(40, 30, 40, 30), const Color(0xFFFFFF00)),
          ]) {
            canvas.drawRect(entry.$1, Paint()..color = entry.$2);
          }
          canvas.drawRect(const Rect.fromLTWH(0, 0, 4, 4),
              Paint()..blendMode = BlendMode.clear);
          final picture = recorder.endRecording();
          final bitmap = await picture.toImage(80, 60);
          final png = await bitmap.toByteData(format: ui.ImageByteFormat.png);
          final input = await File('${folder.path}/colored image.png')
              .writeAsBytes(png!.buffer.asUint8List());
          bitmap.dispose();
          picture.dispose();
          for (final look in imageLookSettings.entries) {
            final p = look.value;
            final done = await export(MediaRequest(
                input: input.path,
                kind: MediaKind.image,
                format: 'png',
                flipHorizontal: true,
                imageAdjustments: {
                  'brightness': p[0],
                  'contrast': p[1],
                  'saturation': p[2],
                  'warmth': p[3]
                }));
            final codec = await ui
                .instantiateImageCodec(await File(done.output!).readAsBytes());
            final frame = await codec.getNextFrame();
            final pixels = await frame.image
                .toByteData(format: ui.ImageByteFormat.rawRgba);
            int at(int x, int y, int channel) =>
                pixels!.getUint8((y * 80 + x) * 4 + channel);
            expect(at(79, 0, 3), 0,
                reason:
                    'Transparent crop corner must flip and stay transparent');
            if (look.key == 'mono') {
              expect(
                  (at(10, 10, 0) - at(10, 10, 1)).abs(), lessThanOrEqualTo(1));
              expect(
                  (at(10, 10, 1) - at(10, 10, 2)).abs(), lessThanOrEqualTo(1));
            }
            if (look.key == 'original') {
              expect(at(10, 10, 1), greaterThan(240));
              expect(at(10, 10, 0), lessThan(10));
            }
            frame.image.dispose();
            codec.dispose();
          }
          for (final f in ['jpg', 'png', 'webp']) {
            final done = await export(MediaRequest(
                input: input.path,
                kind: MediaKind.image,
                format: f,
                crop: const MediaCrop(.25, 0, .5, 1),
                rotation: 90,
                flipVertical: true,
                imageScale: .5,
                imageAdjustments: const {
                  'brightness': .1,
                  'contrast': 1.2,
                  'saturation': 1.3,
                  'warmth': .2
                }));
            final d = await engine.probeMedia(done.output!);
            expect(d.width, 30);
            expect(d.height, 20);
          }
        });
        await check('image_crop_rotation_resize_png', () async {
          final done = await export(MediaRequest(
              input: image.path,
              kind: MediaKind.image,
              format: 'png',
              height: 240,
              rotation: 90,
              crop: const MediaCrop(.25, .25, .5, .5)));
          final d = await engine.probeMedia(done.output!);
          expect(d.width, 180);
          expect(d.height, 240);
          expect(d.bytes, greaterThan(0));
        });
        await check('png_transparency_is_preserved', () async {
          final transparent = await File('${folder.path}/transparent.png')
              .writeAsBytes(base64Decode(alphaImageBase64));
          final done = await export(MediaRequest(
              input: transparent.path, kind: MediaKind.image, format: 'png'));
          final codec = await ui
              .instantiateImageCodec(await File(done.output!).readAsBytes());
          final frame = await codec.getNextFrame();
          final rgba =
              await frame.image.toByteData(format: ui.ImageByteFormat.rawRgba);
          expect(rgba!.getUint8(3), inInclusiveRange(60, 68));
          frame.image.dispose();
          codec.dispose();
        });
        await check('mixed_sequential_batch', () async {
          final queue = MediaQueue(engine);
          try {
            final entries = [
              queue.add(MediaRequest(
                  input: image.path,
                  kind: MediaKind.image,
                  format: 'jpg',
                  height: 240)),
              queue.add(MediaRequest(
                  input: video.path,
                  kind: MediaKind.audio,
                  format: 'm4a',
                  end: 1))
            ];
            final watch = Stopwatch()..start();
            while (queue.busy && watch.elapsed < const Duration(minutes: 3)) {
              await Future<void>.delayed(const Duration(milliseconds: 100));
            }
            for (final item in entries) {
              expect(item.snapshot.state, ProcessingState.completed,
                  reason: item.snapshot.error);
            }
          } finally {
            queue.dispose();
          }
        });
        await check('actual_native_cancellation', () async {
          final id = await engine.submit(MediaRequest(
              input: video.path,
              kind: MediaKind.video,
              format: 'mp4',
              height: 1080));
          await Future<void>.delayed(const Duration(milliseconds: 100));
          await engine.cancelJob(id);
          expect((await engine.status(id)).state, ProcessingState.cancelled);
          final cache = await getTemporaryDirectory();
          await Future<void>.delayed(const Duration(milliseconds: 100));
          if (Platform.isAndroid) {
            expect(await File('${cache.path}/mediaforge-jobs/$id.mp4').exists(),
                false);
          }
        });
        await check('invalid_media_and_unsupported_format', () async {
          final bad = await File('${folder.path}/invalid.mp4')
              .writeAsString('This is not media');
          await expectLater(engine.probeMedia(bad.path), throwsA(anything));
          await expectLater(
              engine.submit(MediaRequest(
                  input: video.path, kind: MediaKind.video, format: 'xyz')),
              throwsUnsupportedError);
        });
        if (Platform.isAndroid) {
          await check('video_filter_and_audio_effect_export', () async {
            for (final filter in [
              'vivid',
              'vivid-warm',
              'vivid-cool',
              'dramatic',
              'mono'
            ]) {
              await export(MediaRequest(
                  input: video.path,
                  kind: MediaKind.video,
                  format: 'mp4',
                  height: 240,
                  videoFilter: filter,
                  videoBitrate: 900,
                  volume: .6,
                  audioEffects: const {
                    'reverb': 25,
                    'echo': 35,
                    'bass': 45,
                    'treble': 55,
                    'warmth': 65
                  }));
            }
            await export(MediaRequest(
                input: video.path,
                kind: MediaKind.audio,
                format: 'm4a',
                volume: 0));
          });
          await check('scoped_gallery_save', () async {
            expect(await engine.save(outputs.first, gallery: true),
                startsWith('content://'));
          });
        }
        if (const bool.fromEnvironment('MEDIAFORGE_NATIVE_DIALOGS')) {
          await check('native_save_as_dialog', () async {
            final saved = await engine
                .save(outputs.first)
                .timeout(const Duration(minutes: 2));
            expect(saved, startsWith('content://'));
            report['savedDocumentUri'] = saved;
          });
          await check('native_system_file_picker', () async {
            final files = await DeviceMediaFileStore(native: engine)
                .importFiles(kind: MediaKind.video)
                .timeout(const Duration(minutes: 2));
            expect(files.length, 1);
            final picked = await engine.probeMedia(files.single);
            expect(picked.video, true);
            expect(picked.audio, true);
          });
        }
        await check('completed_outputs_zip_packaging', () async {
          final path =
              await BatchArchive().create(await engine.outputDirectory(), [
            (outputs.first, 'video.mp4'),
            (report['wavFadeOutput'] as String, 'audio.wav'),
            (outputs.last, 'last-output')
          ]);
          final zip = ZipDecoder()
              .decodeBytes(await File(path).readAsBytes(), verify: true);
          expect(zip.length, 3);
          expect(zip.files.every((f) => f.size > 0), true);
          expect(zip.files[0].name, '1_video.mp4');
          report['zipOutput'] = path;
        });
        await check('cleanup_does_not_delete_input', () async {
          await engine.cleanup();
          expect(await video.exists(), true);
          expect(await image.exists(), true);
        });
        report['success'] =
            checks.values.every((v) => (v as Map)['passed'] == true);
      } finally {
        HttpOverrides.global = savedOverride;
        await engine.dispose();
        await File('${folder.path}/verification.json')
            .writeAsString(const JsonEncoder.withIndent('  ').convert(report));
        // Readable report contains no URLs or credentials.
        debugPrint('NATIVE_VERIFICATION ${jsonEncode(report)}');
      }
      expect(report['success'], true, reason: jsonEncode(checks));
    });
  });
  testWidgets('Native mobile preview obeys trim and clears imported media',
      (tester) async {
    final engine = NativeMediaEngine();
    final queue = MediaQueue(engine);
    final caps = await engine.capabilities();
    final prefs = await SharedPreferences.getInstance();
    final key = GlobalKey<MobileEditorState>();
    await tester.pumpWidget(ProviderScope(
        overrides: [sharedPreferencesProvider.overrideWithValue(prefs)],
        child: MaterialApp(
            theme: AppTheme.lightTheme,
            home: Scaffold(
                body: MobileEditor(
                    key: key,
                    kind: MediaKind.video,
                    engine: engine,
                    queue: queue,
                    caps: caps)))));
    final root = await getApplicationDocumentsDirectory();
    final source =
        '${root.path}/native-verification/owned \u0dc3\u0dd2\u0d82\u0dc4\u0dbd video.mp4';
    await tester.runAsync(() => key.currentState!.importPath(source));
    await tester.pumpAndSettle();
    expect(key.currentState!.player?.value.isInitialized, true);
    key.currentState!
        .change(() => key.currentState!.range = const RangeValues(.2, .5));
    await tester.pump();
    await tester.runAsync(() async {
      await key.currentState!.togglePlay();
      await Future<void>.delayed(const Duration(milliseconds: 1200));
      expect(key.currentState!.player!.value.isPlaying, false);
      expect(key.currentState!.player!.value.position.inMilliseconds,
          inInclusiveRange(450, 1000));
      key.currentState!.export();
      final clock = Stopwatch()..start();
      while (queue.busy && clock.elapsed < const Duration(minutes: 3)) {
        await Future<void>.delayed(const Duration(milliseconds: 100));
      }
      expect(key.currentState!.entry!.snapshot.state, ProcessingState.completed,
          reason: key.currentState!.entry!.snapshot.error);
      await key.currentState!.clear();
    });
    await tester.pumpAndSettle();
    expect(key.currentState!.path, null);
    expect(find.text('Import video to begin'), findsOneWidget);
    await tester.pumpWidget(const SizedBox());
    queue.dispose();
    await engine.dispose();
  });
}
