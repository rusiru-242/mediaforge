import 'dart:async';
import 'dart:convert';
import 'dart:io';
import 'package:http/http.dart' as http;
import '../config/app_config.dart';

import 'media_api.dart';
export 'media_api.dart';

/// The same HTTP contract used by web/src/services/apiClient.ts.
/// A client belongs to one operation so cancellation also interrupts streaming I/O.
class BackendApi implements MediaApi {
  final String baseUrl;
  final http.Client _client;
  final Duration timeout;
  BackendApi(
      {String? baseUrl,
      http.Client? client,
      this.timeout = const Duration(seconds: 90)})
      : baseUrl = baseUrl ?? AppConfig.backendBaseUrl,
        _client = client ?? http.Client();
  @override
  void close() => _client.close();
  Uri uri(String endpoint) => Uri.parse('$baseUrl$endpoint');

  @override
  Future<Json> request(String endpoint,
      {Json? body, String method = 'GET'}) async {
    try {
      final req = http.Request(method, uri(endpoint));
      req.headers.addAll(
          {'Accept': 'application/json', 'Content-Type': 'application/json'});
      if (body != null) req.body = jsonEncode(body);
      final res = await _client.send(req).timeout(timeout);
      final text = await res.stream.bytesToString().timeout(timeout);
      return _decode(res.statusCode, text);
    } on TimeoutException {
      throw const BackendException(
          'The backend request timed out. Check the service and try again.');
    } on http.ClientException {
      throw const BackendException(
          'Cannot reach the MediaForge backend on port 8081, or the request was cancelled.');
    } on SocketException {
      throw const BackendException(
          'Cannot connect to the MediaForge backend on port 8081.');
    }
  }

  Json _decode(int status, String text) {
    dynamic data;
    try {
      data = jsonDecode(text);
    } on FormatException {
      throw BackendException(
          'The backend returned an invalid response (HTTP $status).', status);
    }
    if (status < 200 || status >= 300) {
      throw BackendException(
          data is Map
              ? (data['detail'] ??
                      data['message'] ??
                      'Request failed (HTTP $status).')
                  .toString()
              : 'Request failed (HTTP $status).',
          status);
    }
    if (data is! Map) {
      throw const BackendException('Expected a JSON object from the backend.');
    }
    return Map<String, dynamic>.from(data);
  }

  @override
  Future<Json> upload(String path, {void Function(double)? onProgress}) async {
    final file = File(path);
    final length = await file.length();
    if (length == 0 || length > 2 * 1024 * 1024 * 1024) {
      throw const BackendException(
          'Choose a non-empty media file smaller than 2 GB.');
    }
    final req = http.MultipartRequest('POST', uri('/files/upload'));
    var sent = 0;
    req.files.add(http.MultipartFile(
        'file',
        file.openRead().map((chunk) {
          sent += chunk.length;
          onProgress?.call(sent / length);
          return chunk;
        }),
        length,
        filename: file.uri.pathSegments.last));
    final res = await _client.send(req).timeout(const Duration(minutes: 10));
    return _decode(
        res.statusCode, await res.stream.bytesToString().timeout(timeout));
  }

  @override
  Future<BackendJob> createJob(String endpoint, Json body) async =>
      BackendJob.fromJson(await request(endpoint, body: body, method: 'POST'));
  @override
  Future<BackendJob> job(String id) async =>
      BackendJob.fromJson(await request('/jobs/${Uri.encodeComponent(id)}'));
  @override
  Future<BackendJob> cancel(String id) async => BackendJob.fromJson(
      await request('/jobs/${Uri.encodeComponent(id)}/cancel', method: 'POST'));

  /// Bounded polling. Progress comes exclusively from the actual backend job.
  @override
  Stream<BackendJob> watch(String id,
      {Duration interval = const Duration(milliseconds: 700),
      Duration limit = const Duration(hours: 2)}) async* {
    final elapsed = Stopwatch()..start();
    while (elapsed.elapsed < limit) {
      final value = await job(id);
      yield value;
      if (value.terminal) return;
      await Future<void>.delayed(interval);
    }
    await cancel(id);
    throw const BackendException(
        'Processing exceeded the desktop time limit and was cancelled.');
  }

  /// Saves in the destination directory only after a complete HTTP transfer.
  @override
  Future<void> save(String endpoint, String destination,
      {void Function(double?)? onProgress}) async {
    final partial =
        File('$destination.${DateTime.now().microsecondsSinceEpoch}.part');
    IOSink? sink;
    try {
      final res = await _client
          .send(http.Request('GET', uri(endpoint)))
          .timeout(timeout);
      if (res.statusCode != 200) {
        _decode(
            res.statusCode, await res.stream.bytesToString().timeout(timeout));
        throw const BackendException('File download failed.');
      }
      final length = res.contentLength;
      var received = 0;
      sink = partial.openWrite();
      await sink.addStream(res.stream.timeout(timeout).map((chunk) {
        received += chunk.length;
        onProgress
            ?.call(length == null || length == 0 ? null : received / length);
        return chunk;
      }));
      await sink.flush();
      await sink.close();
      sink = null;
      if (received == 0 || (length != null && received != length)) {
        throw const BackendException(
            'Incomplete file transfer; the partial file was discarded.');
      }
      await partial.rename(destination);
    } finally {
      if (sink != null) await sink.close();
      if (await partial.exists()) await partial.delete();
    }
  }
}
