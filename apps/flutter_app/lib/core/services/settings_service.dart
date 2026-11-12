import 'package:shared_preferences/shared_preferences.dart';

class SettingsService {
  static const _keyOutputFolder = 'output_folder';
  static const _keyDefaultVideoFormat = 'default_video_format';
  static const _keyDefaultAudioFormat = 'default_audio_format';
  static const _keyDefaultImageFormat = 'default_image_format';
  static const _keyDefaultQuality = 'default_quality';
  static const _keyThemeMode = 'theme_mode';
  static const _keyMaxConcurrentJobs = 'max_concurrent_jobs';
  static const _keyFfmpegPath = 'ffmpeg_path';
  static const _keyFfprobePath = 'ffprobe_path';

  final SharedPreferences _prefs;
  SettingsService(this._prefs);

  String get outputFolder => _prefs.getString(_keyOutputFolder) ?? '';
  Future<void> setOutputFolder(String v) => _prefs.setString(_keyOutputFolder, v);

  String get defaultVideoFormat => _prefs.getString(_keyDefaultVideoFormat) ?? 'mp4';
  Future<void> setDefaultVideoFormat(String v) => _prefs.setString(_keyDefaultVideoFormat, v);

  String get defaultAudioFormat => _prefs.getString(_keyDefaultAudioFormat) ?? 'mp3';
  Future<void> setDefaultAudioFormat(String v) => _prefs.setString(_keyDefaultAudioFormat, v);

  String get defaultImageFormat => _prefs.getString(_keyDefaultImageFormat) ?? 'jpg';
  Future<void> setDefaultImageFormat(String v) => _prefs.setString(_keyDefaultImageFormat, v);

  String get defaultQuality => _prefs.getString(_keyDefaultQuality) ?? 'High';
  Future<void> setDefaultQuality(String v) => _prefs.setString(_keyDefaultQuality, v);

  String get themeMode => _prefs.getString(_keyThemeMode) ?? 'system';
  Future<void> setThemeMode(String v) => _prefs.setString(_keyThemeMode, v);

  int get maxConcurrentJobs => _prefs.getInt(_keyMaxConcurrentJobs) ?? 3;
  Future<void> setMaxConcurrentJobs(int v) => _prefs.setInt(_keyMaxConcurrentJobs, v);

  String get ffmpegPath => _prefs.getString(_keyFfmpegPath) ?? 'ffmpeg';
  Future<void> setFfmpegPath(String v) => _prefs.setString(_keyFfmpegPath, v);

  String get ffprobePath => _prefs.getString(_keyFfprobePath) ?? 'ffprobe';
  Future<void> setFfprobePath(String v) => _prefs.setString(_keyFfprobePath, v);
}
