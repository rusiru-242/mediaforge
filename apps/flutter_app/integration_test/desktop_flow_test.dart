import 'dart:convert';
import 'dart:io';
import 'package:mediaforge_desktop/core/services/bundled_tools.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:integration_test/integration_test.dart';
import 'package:media_kit/media_kit.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:mediaforge_desktop/core/theme/app_theme.dart';
import 'package:mediaforge_desktop/features/desktop/desktop_workspace.dart';
import 'package:mediaforge_desktop/features/desktop/desktop_editor.dart';
import 'package:mediaforge_desktop/features/desktop/desktop_batch.dart';
import 'package:mediaforge_desktop/shared/providers/app_providers.dart';

void main() {
  const nativeDialogs = bool.fromEnvironment('MEDIAFORGE_NATIVE_DIALOGS');
  IntegrationTestWidgetsFlutterBinding.ensureInitialized();
  MediaKit.ensureInitialized();
  testWidgets('Native Windows previews, trimmed playback, exports and batch',
      (tester) async {
    final directory =
        await Directory.systemTemp.createTemp('mediaforge-native-e2e-');
    final source = '${directory.path}/owned-video.mp4',
        picture = '${directory.path}/owned-image.png';
    final generated = await Process.run(BundledTools().ffmpeg, [
      '-y',
      '-v',
      'error',
      '-f',
      'lavfi',
      '-i',
      'testsrc2=size=640x480:rate=24:duration=3',
      '-f',
      'lavfi',
      '-i',
      'sine=frequency=440:duration=3',
      '-c:v',
      'libx264',
      '-preset',
      'ultrafast',
      '-pix_fmt',
      'yuv420p',
      '-c:a',
      'aac',
      '-shortest',
      source
    ]);
    expect(generated.exitCode, 0, reason: generated.stderr.toString());
    final image = await Process.run(BundledTools().ffmpeg, [
      '-y',
      '-v',
      'error',
      '-f',
      'lavfi',
      '-i',
      'testsrc2=size=640x480',
      '-frames:v',
      '1',
      picture
    ]);
    expect(image.exitCode, 0);
    final prefs = await SharedPreferences.getInstance();
    await tester.pumpWidget(ProviderScope(
        overrides: [sharedPreferencesProvider.overrideWithValue(prefs)],
        child: MaterialApp(
            theme: AppTheme.lightTheme, home: const DesktopWorkspace())));
    await tester.pumpAndSettle();
    Future<void> pumpWork(Future<void> Function() operation) async {
      bool done = false;
      Object? failure;
      operation().then((_) => done = true, onError: (Object e) {
        failure = e;
        done = true;
      });
      final elapsed = Stopwatch()..start();
      while (!done && elapsed.elapsed < const Duration(minutes: 3)) {
        await tester.pump(const Duration(milliseconds: 50));
      }
      expect(done, true, reason: 'Native operation timed out');
      if (failure != null) throw failure!;
    }

    Future<void> navigate(String title) async {
      final finder = find.byWidgetPredicate((widget) =>
          widget is Tooltip &&
          (widget.message?.startsWith('$title •') ?? false));
      await tester.ensureVisible(finder);
      await tester.pumpAndSettle();
      await tester.tap(finder);
      await tester.pumpAndSettle();
    }

    Future<JsonMap> probe(String path) async {
      final result = await Process.run(BundledTools().ffprobe,
          ['-v', 'error', '-show_streams', '-of', 'json', path]);
      expect(result.exitCode, 0);
      return jsonDecode(result.stdout.toString()) as JsonMap;
    }

    for (final kind in ['video', 'audio', 'image']) {
      await navigate('${kind[0].toUpperCase()}${kind.substring(1)} Editor');
      final finder = find.byWidgetPredicate(
          (widget) => widget is DesktopEditor && widget.kind == kind);
      final editor = tester.state<DesktopEditorState>(finder);
      debugPrint('Native test: importing $kind');
      if (kind == 'video' && nativeDialogs) {
        final driver = await Process.start('powershell', [
          '-NoProfile',
          '-File',
          File('tool/windows_dialog_driver.ps1').absolute.path,
          '-TargetProcessId',
          '$pid',
          '-FileName',
          source
        ]);
        final driverError = driver.stderr.transform(utf8.decoder).join();
        final driverOutput = driver.stdout.drain<void>();
        await pumpWork(editor.pick);
        await driverOutput;
        expect(await driver.exitCode, 0, reason: await driverError);
      } else {
        await pumpWork(
            () => editor.importFile(kind == 'image' ? picture : source));
      }
      await tester.pump(const Duration(milliseconds: 250));
      expect(editor.path, isNotNull, reason: editor.error);
      if (kind != 'image') {
        editor.setRange(const RangeValues(.5, 1.5));
        await editor.playPause();
        await tester.pump(const Duration(seconds: 2));
        expect(editor.position, inInclusiveRange(.5, 1.5));
        await editor.pause();
        editor.change(() {
          editor.effects = {'reverb': 25, 'bass': 40};
          editor.volume = 75;
        });
        if (kind == 'audio') {
          editor.change(() {
            editor.fadeIn = .2;
            editor.fadeOut = .2;
          });
        }
      } else {
        editor.setRatio('1:1');
        editor.change(() {
          editor.imageQuality = 75;
          editor.saturation = 1.45;
        });
      }
      debugPrint('Native test: exporting $kind');
      await pumpWork(editor.export);
      expect(editor.task.job?.completed, true, reason: editor.task.error);
      final output = '${directory.path}/native-$kind.${editor.format}';
      await pumpWork(() => editor.task
          .save('/files/${editor.task.job!.outputFileId}/download', output));
      expect(editor.task.savedPath, output, reason: editor.task.error);
      final inspected = await probe(output);
      final streams = (inspected['streams'] as List).cast<Map>();
      if (kind == 'video') {
        expect(streams.any((s) => s['codec_type'] == 'video'), true);
      }
      if (kind == 'audio') {
        expect(streams.any((s) => s['codec_type'] == 'audio'), true);
        expect(streams.any((s) => s['codec_type'] == 'video'), false);
      }
      if (kind == 'image') {
        expect(streams.first['width'], streams.first['height']);
      }
      if (kind == 'image' && nativeDialogs) {
        final destination = '${directory.path}/native-dialog.webp';
        final driver = await Process.start('powershell', [
          '-NoProfile',
          '-File',
          File('tool/windows_dialog_driver.ps1').absolute.path,
          '-TargetProcessId',
          '$pid',
          '-FileName',
          destination
        ]);
        final driverError = driver.stderr.transform(utf8.decoder).join();
        final driverOutput = driver.stdout.drain<void>();
        final saveButton = find.widgetWithText(FilledButton, 'Save to Disk');
        await tester.ensureVisible(saveButton);
        await tester.pumpAndSettle();
        await tester.tap(saveButton);
        await pumpWork(() async {
          final status = await driver.exitCode;
          expect(status, 0, reason: await driverError);
          final elapsed = Stopwatch()..start();
          while (editor.task.savedPath != destination &&
              elapsed.elapsed < const Duration(seconds: 30)) {
            await Future<void>.delayed(const Duration(milliseconds: 100));
          }
        });
        await driverOutput;
        expect(await File(destination).exists(), true,
            reason: editor.task.error);
      }
      await tester.pump(const Duration(milliseconds: 250));
      expect(tester.takeException(), isNull);
    }
    await navigate('Batch Converter');
    final batch = tester.state<DesktopBatchState>(find.byType(DesktopBatch));
    debugPrint('Native test: converting batch');
    await batch.add([source, picture]);
    await pumpWork(batch.convert);
    expect(batch.items.every((i) => i.task.job?.completed == true), true,
        reason: batch.error);
    await batch.zipTask.save('/conversions/batch/${batch.batchId}/zip',
        '${directory.path}/native.zip');
    expect(batch.zipTask.savedPath, isNotNull, reason: batch.zipTask.error);
    await tester.pump(const Duration(milliseconds: 250));
    expect(tester.takeException(), isNull);
    await tester.pumpWidget(const SizedBox());
    await tester.pump(const Duration(milliseconds: 500));
    await directory.delete(recursive: true);
  }, timeout: const Timeout(Duration(minutes: 10)));
}

typedef JsonMap = Map<String, dynamic>;
