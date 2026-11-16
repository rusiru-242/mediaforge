import 'dart:convert';
import 'package:flutter_test/flutter_test.dart';
import 'package:mediaforge_desktop/features/mobile/download_filename.dart';

void main() {
  test('Uses real title and selected video resolution', () {
    expect(downloadFilename('Kev Rupee - GTFOMW', '2160p (4K)', 'mp4'),
        'Kev Rupee - GTFOMW (2160p).mp4');
    expect(downloadFilename('සිංහල ගීතය', '720p (HD)', 'webm'),
        'සිංහල ගීතය (720p).webm');
  });
  test('Retains audio quality and selected extension', () {
    expect(downloadFilename('Song', '320 kbps', 'mp3'), 'Song (320 kbps).mp3');
  });
  test('Sanitizes paths, controls and reserved names', () {
    final name = downloadFilename('../clip/title:bad?\u0000', '720p', 'mp4');
    expect(name, isNot(contains('/')));
    expect(name, isNot(contains(':')));
    expect(name, isNot(startsWith('.')));
    expect(
        downloadFilename('CON', '1080p', 'mp4'), startsWith('MediaForge_CON'));
    expect(downloadFilename('', '', 'mp4'), 'MediaForge Video.mp4');
  });
  test('Unicode filename stays within filesystem byte limits', () {
    final name = downloadFilename('සිංහල😀' * 100, '2160p (4K)', 'mp4');
    expect(utf8.encode(name).length, lessThan(240));
    expect(name, endsWith(' (2160p).mp4'));
    expect(
        () => downloadFilename('Title', '720p', '../mp4'), throwsArgumentError);
  });
}
