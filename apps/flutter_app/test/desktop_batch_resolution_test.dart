import 'package:flutter_test/flutter_test.dart';
import 'package:mediaforge_desktop/features/desktop/desktop_batch.dart';
import 'package:mediaforge_desktop/features/desktop/video_export_options.dart';

void main() {
  for (final resolution in videoOutputResolutions) {
    test('Batch exports selected $resolution without a preset overriding it',
        () {
      final item = BatchItem('owned.mp4', 'video');
      addTearDown(item.task.dispose);
      item.quality = resolution;
      final request = item.payload('input');
      expect(request['targetResolution'],
          resolution == 'Original' ? null : resolution);
      expect(request['outputFormat'], 'mp4');
      expect(request['qualityPreset'], isNull);
      expect(request['videoBitrate'], isNull);
      expect(request['crf'], 20);
    });
  }
  test(
      'Batch resolutions remain independent and image/audio quality is preserved',
      () {
    final first = BatchItem('one.mp4', 'video'),
        second = BatchItem('two.mp4', 'video');
    final image = BatchItem('photo.png', 'image'),
        audio = BatchItem('clip.wav', 'audio');
    for (final item in [first, second, image, audio]) {
      addTearDown(item.task.dispose);
    }
    expect(first.quality, '1080p');
    first.quality = '144p';
    second.quality = '2160p';
    image.quality = 'Low';
    audio.quality = 'Medium';
    expect(first.payload('one')['targetResolution'], '144p');
    expect(second.payload('two')['targetResolution'], '2160p');
    expect(image.payload('photo')['imageQuality'], 50);
    expect(audio.payload('audio')['audioBitrate'], 192);
  });
}
