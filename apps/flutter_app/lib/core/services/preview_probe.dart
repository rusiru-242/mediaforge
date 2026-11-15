import 'dart:async';
import 'dart:convert';
import 'dart:io';
import 'dart:typed_data';
import 'backend_api.dart';

/// Local inspection/preview using packaged tools; exports use LocalMediaEngine.
class PreviewProbe {
  Process? _process;
  bool _closed = false;
  void close() {
    _closed = true;
    _process?.kill();
  }

  Future<Json> inspect(String file, String executable) async {
    _process = await Process.start(executable, [
      '-v',
      'error',
      '-protocol_whitelist',
      'file,pipe',
      '-show_format',
      '-show_streams',
      '-of',
      'json',
      file
    ]);
    if (_closed) {
      _process!.kill();
      throw const BackendException('Inspection cancelled.');
    }
    final process = _process!;
    final out = process.stdout.transform(utf8.decoder).join();
    final err = process.stderr.drain<void>();
    try {
      final status =
          await process.exitCode.timeout(const Duration(seconds: 30));
      await err;
      final text = await out;
      if (status != 0) {
        throw const BackendException(
            'This file could not be inspected by FFprobe.');
      }
      return jsonDecode(text) as Json;
    } on TimeoutException {
      process.kill();
      throw const BackendException('Media inspection timed out.');
    } finally {
      _process = null;
    }
  }

  Future<List<double>> waveform(
      String file, double duration, String executable) async {
    if (_closed || duration <= 0) return [];
    final peaks = List<double>.filled(300, 0);
    _process = await Process.start(executable, [
      '-v',
      'error',
      '-protocol_whitelist',
      'file,pipe',
      '-i',
      file,
      '-vn',
      '-ac',
      '1',
      '-ar',
      '1000',
      '-f',
      'f32le',
      'pipe:1'
    ]);
    final process = _process!;
    if (_closed) {
      process.kill();
      return [];
    }
    final err = process.stderr.drain<void>();
    var pending = <int>[], index = 0;
    try {
      await for (final chunk
          in process.stdout.timeout(const Duration(seconds: 45))) {
        final bytes = Uint8List.fromList([...pending, ...chunk]);
        final data = ByteData.sublistView(bytes);
        final count = bytes.length ~/ 4;
        for (var i = 0; i < count; i++, index++) {
          final bucket = (index / (duration * 1000) * peaks.length)
              .floor()
              .clamp(0, peaks.length - 1);
          final value = data.getFloat32(i * 4, Endian.little).abs();
          if (value.isFinite && value > peaks[bucket]) {
            peaks[bucket] = value.clamp(0, 1);
          }
        }
        pending = bytes.sublist(count * 4);
      }
      await err;
      return await process.exitCode == 0 ? peaks : [];
    } finally {
      process.kill();
      _process = null;
    }
  }
}
