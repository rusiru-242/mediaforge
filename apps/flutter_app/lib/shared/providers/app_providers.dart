import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../../core/services/ffmpeg_service.dart';
import '../../core/services/conversion_service.dart';
import '../../core/services/settings_service.dart';
import '../models/media_job.dart';

final sharedPreferencesProvider = Provider<SharedPreferences>((ref) {
  throw UnimplementedError('SharedPreferences not initialized');
});

final settingsServiceProvider = Provider<SettingsService>((ref) {
  final prefs = ref.watch(sharedPreferencesProvider);
  return SettingsService(prefs);
});

final ffmpegServiceProvider = Provider<FfmpegService>((ref) {
  final settings = ref.watch(settingsServiceProvider);
  final service = FfmpegService();
  service.configure(
    ffmpegPath: settings.ffmpegPath,
    ffprobePath: settings.ffprobePath,
  );
  return service;
});

final conversionServiceProvider = Provider<ConversionService>((ref) {
  final ffmpeg = ref.watch(ffmpegServiceProvider);
  return ConversionService(ffmpeg);
});

final themeModeProvider = StateProvider<String>((ref) {
  final settings = ref.watch(settingsServiceProvider);
  return settings.themeMode;
});

// Job management
final jobListProvider = StateNotifierProvider<JobListNotifier, List<MediaJob>>((ref) {
  return JobListNotifier();
});

class JobListNotifier extends StateNotifier<List<MediaJob>> {
  JobListNotifier() : super([]);

  void addJob(MediaJob job) => state = [...state, job];

  void updateJob(String id, {JobStatus? status, double? progress, String? errorMessage}) {
    state = state.map((job) {
      if (job.id == id) {
        job.status = status ?? job.status;
        job.progress = progress ?? job.progress;
        job.errorMessage = errorMessage ?? job.errorMessage;
        if (status == JobStatus.completed || status == JobStatus.failed || status == JobStatus.cancelled) {
          job.completedAt = DateTime.now();
        }
      }
      return job;
    }).toList();
  }

  void removeJob(String id) => state = state.where((j) => j.id != id).toList();

  List<MediaJob> get activeJobs => state.where((j) => j.status == JobStatus.queued || j.status == JobStatus.processing).toList();
  List<MediaJob> get completedJobs => state.where((j) => j.status == JobStatus.completed || j.status == JobStatus.failed || j.status == JobStatus.cancelled).toList();
}
