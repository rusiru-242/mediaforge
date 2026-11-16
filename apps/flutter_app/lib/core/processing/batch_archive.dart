import 'dart:async';
import 'dart:io';
import 'dart:isolate';
import 'package:archive/archive_io.dart';
import 'package:path/path.dart' as p;
import 'package:uuid/uuid.dart';

class BatchArchive {
  Isolate? _worker;
  SendPort? _control;
  Completer<void>? _done;
  bool _cancelled = false;
  Future<String> create(String directory, List<(String, String)> sources,
      {void Function(double)? onProgress}) async {
    if (_done != null) throw StateError('Packaging is already running.');
    if (sources.isEmpty || sources.length > 50) {
      throw StateError('Choose 1-50 completed outputs.');
    }
    var bytes = 0;
    for (final source in sources) {
      final file = File(source.$1);
      if (!await file.exists()) {
        throw StateError('A completed output is no longer available.');
      }
      if (await file.length() == 0) {
        throw StateError('A completed output is empty.');
      }
      bytes += await file.length();
    }
    if (bytes > 2 * 1024 * 1024 * 1024 - 1024 * 1024) {
      throw StateError(
          'ZIP exports must be smaller than 2 GiB. Save these files individually.');
    }
    await Directory(directory).create(recursive: true);
    final target =
        p.join(directory, 'MediaForge_batch_${const Uuid().v4()}.zip');
    final partial = '$target.part';
    final port = ReceivePort(), errors = ReceivePort();
    final done = Completer<void>();
    _done = done;
    done.future.ignore();
    _cancelled = false;
    final messages = port.listen((message) {
      if (message is SendPort) {
        _control = message;
        if (_cancelled) message.send('cancel');
      } else if (message == 'done' && !done.isCompleted) {
        done.complete();
      } else if (message is double) {
        onProgress?.call(message);
      } else if (message is String && !done.isCompleted) {
        done.completeError(StateError(message));
      }
    });
    final failures = errors.listen((message) {
      if (!done.isCompleted) {
        done.completeError(StateError('ZIP packaging failed.'));
      }
    });
    try {
      final files = <List<String>>[];
      for (var i = 0; i < sources.length; i++) {
        final name = sources[i]
            .$2
            .split(RegExp(r'[/\\]'))
            .last
            .replaceAll(RegExp(r'[\x00-\x1f]'), '_');
        files
            .add([sources[i].$1, '${i + 1}_${name.isEmpty ? 'output' : name}']);
      }
      // Install the listener before spawning; do not hold completed media in RAM.
      _worker = await Isolate.spawn(_zip, [port.sendPort, partial, files],
          onError: errors.sendPort);
      if (_cancelled) _control?.send('cancel');
      await done.future.timeout(const Duration(minutes: 10));
      if (_cancelled) throw StateError('Packaging cancelled.');
      await File(partial).rename(target);
      return target;
    } finally {
      _worker?.kill(priority: Isolate.immediate);
      _worker = null;
      _control = null;
      _done = null;
      await messages.cancel();
      await failures.cancel();
      port.close();
      errors.close();
      if (await File(partial).exists()) await File(partial).delete();
    }
  }

  void cancel() {
    _cancelled = true;
    _control?.send('cancel');
  }
}

void _zip(List<dynamic> args) async {
  final port = args[0] as SendPort, encoder = ZipFileEncoder();
  final control = ReceivePort();
  var cancelled = false;
  control.listen((_) => cancelled = true);
  port.send(control.sendPort);
  try {
    encoder.create(args[1] as String, level: ZipFileEncoder.store);
    final files = (args[2] as List).cast<List<String>>();
    var bytes = 0, done = 0;
    for (final file in files) {
      bytes += await File(file[0]).length();
    }
    for (final file in files) {
      if (cancelled) throw StateError('Packaging cancelled.');
      await encoder.addFile(File(file[0]), file[1]);
      done += await File(file[0]).length();
      port.send(done / bytes);
    }
    await encoder.close();
    if (cancelled) throw StateError('Packaging cancelled.');
    port.send('done');
  } catch (_) {
    try {
      await encoder.close();
    } catch (_) {}
    port.send(cancelled ? 'Packaging cancelled.' : 'ZIP packaging failed.');
  } finally {
    control.close();
  }
}
