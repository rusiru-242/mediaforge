class AppConfig {
  static const String appName = 'MediaForge';
  static const String appVersion = '0.1.0';
  static const String backendBaseUrl = 'http://localhost:8080/api/v1';
  static const int maxConcurrentJobs = 3;
  static const int downloadTimeoutSeconds = 300;
  static const List<String> supportedVideoFormats = ['mp4', 'mkv', 'webm', 'mov', 'avi'];
  static const List<String> supportedAudioFormats = ['mp3', 'wav', 'aac', 'flac', 'm4a', 'ogg'];
  static const List<String> supportedImageFormats = ['jpg', 'jpeg', 'png', 'webp', 'avif'];
  static const List<String> videoInputFormats = ['mp4', 'mkv', 'webm', 'mov', 'avi', 'flv', 'wmv', 'm4v'];
  static const List<String> audioInputFormats = ['mp3', 'wav', 'aac', 'flac', 'm4a', 'ogg', 'wma', 'opus'];
  static const List<String> imageInputFormats = ['jpg', 'jpeg', 'png', 'webp', 'gif', 'bmp', 'tiff', 'avif'];
  static const int maxFileSizeMb = 2048;
}
