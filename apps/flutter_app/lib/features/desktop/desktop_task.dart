import 'package:flutter/foundation.dart';
import '../../core/services/media_api.dart';
import '../../core/services/local_media_api.dart';

/// Owns one local operation; progress is reported by real processing jobs.
class DesktopTask extends ChangeNotifier {
  final MediaApi Function() _createApi;
  DesktopTask({MediaApi Function()? apiFactory})
      : _createApi = apiFactory ?? LocalMediaApi.new;
  MediaApi? _api;
  BackendJob? job;
  String stage = '', error = '';
  Json? output;
  String? savedPath;
  double? transferProgress;
  bool busy = false, _cancelled = false, _disposed = false;
  int _lastTransferNotification = 0;
  void _transfer(double? value) {
    transferProgress = value;
    final now = DateTime.now().millisecondsSinceEpoch;
    if (now - _lastTransferNotification >= 100 || value == 1) {
      _lastTransferNotification = now;
      _notify();
    }
  }

  void _notify() {
    if (!_disposed) notifyListeners();
  }

  void invalidate() {
    if (!busy) {
      job = null;
      output = null;
      savedPath = null;
      error = '';
      stage = '';
      _notify();
    }
  }

  Future<void> run(Future<BackendJob> Function(MediaApi api) create) async {
    if (busy) return;
    _api = _createApi();
    busy = true;
    _cancelled = false;
    output = null;
    savedPath = null;
    job = null;
    error = '';
    transferProgress = null;
    stage = 'Preparing media…';
    _notify();
    try {
      final created = await create(_api!);
      job = created;
      if (_cancelled) {
        await _api!.cancel(created.id);
        return;
      }
      stage = 'Processing media';
      _notify();
      await for (final update in _api!.watch(created.id)) {
        job = update;
        stage = update.status;
        _notify();
        if (update.status == 'FAILED') {
          throw BackendException(update.error ?? 'Processing failed.');
        }
        if (update.completed) {
          if (update.outputFileId == null) {
            throw const BackendException(
                'Completed job has no verified output file.');
          }
          output =
              await _api!.request('/files/${update.outputFileId}/metadata');
        }
      }
    } catch (e) {
      if (!_cancelled) error = e.toString();
    } finally {
      _api?.close();
      _api = null;
      busy = false;
      _notify();
    }
  }

  void uploading(double progress) {
    stage = 'Uploading media';
    _transfer(progress);
  }

  Future<void> cancel() async {
    _cancelled = true;
    final id = job?.id;
    if (id != null && !job!.terminal) {
      final control = _createApi();
      try {
        job = await control.cancel(id);
      } catch (e) {
        error = 'Cancellation could not be confirmed: $e';
      } finally {
        control.close();
      }
    }
    _api?.close();
    stage = 'Cancelled';
    _notify();
  }

  Future<void> save(String endpoint, String path) async {
    if (busy) return;
    busy = true;
    _cancelled = false;
    error = '';
    stage = 'Saving to disk';
    transferProgress = null;
    _api = _createApi();
    _notify();
    try {
      await _api!.save(endpoint, path, onProgress: (v) {
        _transfer(v);
      });
      savedPath = path;
      stage = 'Saved to disk';
    } catch (e) {
      if (!_cancelled) {
        if (e is BackendException && e.status == 404) {
          job = null;
          output = null;
          error = 'This temporary output expired. Export or download it again.';
        } else {
          error = e.toString();
        }
      }
    } finally {
      _api?.close();
      _api = null;
      busy = false;
      _notify();
    }
  }

  @override
  void dispose() {
    _disposed = true;
    _api?.close();
    super.dispose();
  }
}
