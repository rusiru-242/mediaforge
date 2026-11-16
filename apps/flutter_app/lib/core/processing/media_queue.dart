import 'dart:async';
import 'package:flutter/foundation.dart';
import 'package:uuid/uuid.dart';
import 'media_processing_engine.dart';

class QueueEntry {
  final String id = const Uuid().v4();
  final MediaRequest request;
  ProcessingJob snapshot;
  String? nativeId;
  bool cancelled = false;
  QueueEntry(this.request)
      : snapshot = const ProcessingJob('', ProcessingState.queued,
            operation: 'Queued');
}

class MediaQueue extends ChangeNotifier {
  final MediaProcessingEngine engine;
  final List<QueueEntry> entries = [];
  bool _running = false, _disposed = false;
  MediaQueue(this.engine);
  QueueEntry add(MediaRequest request) {
    request.validate();
    if (entries.where((e) => !e.snapshot.terminal).length >= 50) {
      throw StateError('Queue is full.');
    }
    final e = QueueEntry(request);
    entries.add(e);
    notifyListeners();
    unawaited(_pump());
    return e;
  }

  Future<void> _pump() async {
    if (_running || _disposed) return;
    _running = true;
    try {
      while (!_disposed) {
        final e = entries
            .where((e) =>
                e.snapshot.state == ProcessingState.queued && !e.cancelled)
            .firstOrNull;
        if (e == null) break;
        try {
          e.snapshot = ProcessingJob(e.id, ProcessingState.processing,
              operation: 'Inspecting media');
          notifyListeners();
          final id = await engine.submit(e.request);
          e.nativeId = id;
          if (e.cancelled || _disposed) await engine.cancelJob(id);
          await for (final state in engine.watch(id)) {
            e.snapshot = state;
            if (!_disposed) notifyListeners();
          }
        } catch (error) {
          e.snapshot = ProcessingJob(e.id,
              e.cancelled ? ProcessingState.cancelled : ProcessingState.failed,
              error: error.toString(), completed: DateTime.now());
        }
        if (!_disposed) notifyListeners();
      }
    } finally {
      _running = false;
    }
  }

  Future<void> cancel(QueueEntry e) async {
    e.cancelled = true;
    if (e.nativeId != null) await engine.cancelJob(e.nativeId!);
    if (!e.snapshot.terminal) {
      e.snapshot = ProcessingJob(e.id, ProcessingState.cancelled,
          completed: DateTime.now());
    }
    if (!_disposed) notifyListeners();
  }

  Future<void> cancelAll() async {
    for (final e in entries.where((e) => !e.snapshot.terminal).toList()) {
      await cancel(e);
    }
  }

  bool get busy => entries.any((e) => !e.snapshot.terminal);
  @override
  void dispose() {
    _disposed = true;
    unawaited(cancelAll());
    super.dispose();
  }
}
