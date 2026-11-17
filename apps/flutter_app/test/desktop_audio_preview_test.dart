import 'dart:convert';
import 'dart:io';
import 'package:flutter_test/flutter_test.dart';
import 'package:mediaforge_desktop/core/services/bundled_tools.dart';
import 'package:mediaforge_desktop/core/services/desktop_audio_preview.dart';

void main() {
  test('All five preview effects render real audio, levels and cleanup',
      () async {
    final tools = BundledTools(
        directory: Directory('vendor/windows/tools').absolute.path);
    final directory = await Directory.systemTemp.createTemp('effects-test-');
    final source = '${directory.path}/සිංහල audio with spaces.wav';
    final preview = DesktopAudioPreview(tools: tools);
    final rendered = <String>[];
    try {
      final generated = await Process.run(tools.ffmpeg, [
        '-v',
        'error',
        '-f',
        'lavfi',
        '-i',
        'aevalsrc=0.1*sin(2*PI*100*t)+0.1*sin(2*PI*5000*t)+0.1*sin(2*PI*15000*t):s=48000:d=1',
        source,
      ]);
      expect(generated.exitCode, 0, reason: '${generated.stderr}');
      Future<String> hash(String file) async {
        final result = await Process.run(
            tools.ffmpeg, ['-v', 'error', '-i', file, '-f', 'md5', '-']);
        expect(result.exitCode, 0);
        return '${result.stdout}';
      }

      final original = await hash(source);
      for (final effect in ['reverb', 'echo', 'bass', 'treble', 'warmth']) {
        final low = (await preview.render(source, {effect: 20}, 1))!;
        rendered.add(low);
        final lowHash = await hash(low);
        final high = (await preview.render(source, {effect: 90}, 1))!;
        rendered.add(high);
        expect(await hash(high), isNot(lowHash), reason: '$effect level');
        expect(lowHash, isNot(original), reason: '$effect changes audio');
        final probe = await Process.run(tools.ffprobe, [
          '-v',
          'error',
          '-show_streams',
          '-show_format',
          '-of',
          'json',
          high
        ]);
        expect(probe.exitCode, 0);
        final data = jsonDecode('${probe.stdout}') as Map;
        expect((data['streams'] as List).single['codec_type'], 'audio');
        expect(double.parse(data['format']['duration']), closeTo(1, .02));
      }
      expect(await preview.render(source, {}, 1), isNull);
      final cancelled = preview.render(source, {'echo': 50}, 1);
      preview.cancel();
      expect(await cancelled, isNull);
      await preview.releaseUnused(null);
      for (final file in rendered) {
        expect(await File(file).exists(), false);
      }
      await expectLater(
          preview.render('${directory.path}/missing.wav', {'bass': 50}, 1),
          throwsStateError);
    } finally {
      await preview.close();
      await directory.delete(recursive: true);
    }
  });
}
