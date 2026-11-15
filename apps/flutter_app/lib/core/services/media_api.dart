typedef Json = Map<String, dynamic>;

class BackendException implements Exception {
  final String message;
  final int? status;
  const BackendException(this.message, [this.status]);
  @override
  String toString() => message;
}

class BackendJob {
  final String id, status;
  final double progress;
  final String? outputFileId, error;
  const BackendJob(
      this.id, this.status, this.progress, this.outputFileId, this.error);
  factory BackendJob.fromJson(Json value) {
    final data = value['job'] is Map
        ? Map<String, dynamic>.from(value['job'] as Map)
        : value;
    final id = data['id'] ?? value['jobId'];
    if (id is! String || id.isEmpty || data['status'] is! String) {
      throw const BackendException(
          'The backend returned an invalid job response.');
    }
    return BackendJob(
        id,
        data['status'] as String,
        ((data['progress'] ?? data['progressPercentage'] ?? 0) as num)
            .toDouble()
            .clamp(0, 100),
        data['outputFileId'] as String?,
        data['errorMessage'] as String?);
  }
  bool get terminal => ['COMPLETED', 'FAILED', 'CANCELLED'].contains(status);
  bool get completed => status == 'COMPLETED';
}

abstract class MediaApi {
  void close();
  Future<Json> request(String endpoint, {Json? body, String method = 'GET'});
  Future<Json> upload(String path, {void Function(double)? onProgress});
  Future<BackendJob> createJob(String endpoint, Json body);
  Future<BackendJob> job(String id);
  Future<BackendJob> cancel(String id);
  Stream<BackendJob> watch(String id,
      {Duration interval = const Duration(milliseconds: 700),
      Duration limit = const Duration(hours: 2)});
  Future<void> save(String endpoint, String destination,
      {void Function(double?)? onProgress});
}
