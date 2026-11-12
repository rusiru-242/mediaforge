import 'package:uuid/uuid.dart';

enum JobStatus { queued, processing, completed, failed, cancelled }
enum JobType { videoConversion, audioConversion, imageConversion, download }

class MediaJob {
  final String id;
  final JobType type;
  final String inputPath;
  final String outputPath;
  final String outputFormat;
  final Map<String, dynamic> settings;
  JobStatus status;
  double progress;
  String? errorMessage;
  DateTime createdAt;
  DateTime? completedAt;

  MediaJob({
    String? id,
    required this.type,
    required this.inputPath,
    required this.outputPath,
    required this.outputFormat,
    this.settings = const {},
    this.status = JobStatus.queued,
    this.progress = 0.0,
    this.errorMessage,
    DateTime? createdAt,
  })  : id = id ?? const Uuid().v4(),
        createdAt = createdAt ?? DateTime.now();

  String get statusLabel {
    switch (status) {
      case JobStatus.queued: return 'Queued';
      case JobStatus.processing: return 'Processing';
      case JobStatus.completed: return 'Completed';
      case JobStatus.failed: return 'Failed';
      case JobStatus.cancelled: return 'Cancelled';
    }
  }

  String get inputFilename => inputPath.split(RegExp(r'[/\\]')).last;
  String get outputFilename => outputPath.split(RegExp(r'[/\\]')).last;
}
