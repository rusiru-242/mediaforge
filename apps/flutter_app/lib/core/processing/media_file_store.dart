import 'dart:io';
import 'package:file_picker/file_picker.dart';
import 'package:path/path.dart' as p;
import 'package:share_plus/share_plus.dart';
import 'package:uuid/uuid.dart';
import 'media_processing_engine.dart';
import 'native_media_engine.dart';

abstract class MediaFileStore {
  Future<List<String>> importFiles({MediaKind? kind, bool multiple = false});
  Future<String?> saveOutput(String source, {bool gallery = false});
  Future<void> shareOutput(String path);
}

class DeviceMediaFileStore implements MediaFileStore {
  final NativeMediaEngine? native;
  DeviceMediaFileStore({this.native});
  @override
  Future<List<String>> importFiles(
      {MediaKind? kind, bool multiple = false}) async {
    final picked = await FilePicker.platform.pickFiles(
        allowMultiple: multiple,
        type: FileType.custom,
        allowedExtensions: switch (kind) {
          MediaKind.image => [
              'jpg',
              'jpeg',
              'png',
              'webp',
              'heic',
              'heif',
              'bmp'
            ],
          MediaKind.audio => [
              'mp3',
              'm4a',
              'wav',
              'aac',
              'flac',
              'ogg',
              'mp4',
              'mov'
            ],
          MediaKind.video => ['mp4', 'mov', 'mkv', 'webm', 'm4v'],
          null => [
              'mp4',
              'mov',
              'mkv',
              'webm',
              'm4v',
              'mp3',
              'm4a',
              'wav',
              'aac',
              'flac',
              'ogg',
              'jpg',
              'jpeg',
              'png',
              'webp',
              'heic'
            ],
        });
    final files = <String>[];
    for (final file in picked?.files ?? <PlatformFile>[]) {
      // Native document providers copy scoped/security-scoped documents to cache.
      // Do not request withData: large imports must not be loaded into Dart RAM.
      if (file.path == null ||
          file.size <= 0 ||
          file.size > 2 * 1024 * 1024 * 1024) {
        throw StateError('Choose a locally accessible file under 2 GiB.');
      }
      files.add(file.path!);
    }
    return files;
  }

  @override
  Future<String?> saveOutput(String source, {bool gallery = false}) async {
    if (native != null) return native!.save(source, gallery: gallery);
    if (!Platform.isWindows || gallery) {
      throw UnsupportedError('Use the native Files/share interface.');
    }
    final destination = await FilePicker.platform.saveFile(
        dialogTitle: 'Save MediaForge output', fileName: p.basename(source));
    if (destination == null) return null;
    final install = p.dirname(Platform.resolvedExecutable).toLowerCase();
    final target = p.normalize(p.absolute(destination));
    if (p.isWithin(install, target.toLowerCase()) ||
        p.equals(install, target.toLowerCase()) ||
        p.equals(p.absolute(source), target)) {
      throw StateError(
          'Choose a different path outside the installation directory.');
    }
    final partial = File('$target.${const Uuid().v4()}.part');
    try {
      await File(source).openRead().pipe(partial.openWrite());
      if (await partial.length() != await File(source).length()) {
        throw StateError('Incomplete output copy.');
      }
      await partial.rename(target);
      return target;
    } finally {
      if (await partial.exists()) await partial.delete();
    }
  }

  @override
  Future<void> shareOutput(String path) async {
    await Share.shareXFiles([XFile(path)]);
  }
}
