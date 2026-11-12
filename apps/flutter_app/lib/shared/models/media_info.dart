class MediaInfo {
  final String path;
  final String filename;
  final String format;
  final String? mimeType;
  final int? width;
  final int? height;
  final double? durationSeconds;
  final int? bitrate;
  final int? sampleRate;
  final int? channels;
  final String? codec;
  final int fileSizeBytes;

  const MediaInfo({
    required this.path,
    required this.filename,
    required this.format,
    this.mimeType,
    this.width,
    this.height,
    this.durationSeconds,
    this.bitrate,
    this.sampleRate,
    this.channels,
    this.codec,
    required this.fileSizeBytes,
  });

  bool get isVideo => ['mp4', 'mkv', 'webm', 'mov', 'avi', 'flv', 'wmv', 'm4v'].contains(format.toLowerCase());
  bool get isAudio => ['mp3', 'wav', 'aac', 'flac', 'm4a', 'ogg', 'wma', 'opus'].contains(format.toLowerCase());
  bool get isImage => ['jpg', 'jpeg', 'png', 'webp', 'gif', 'bmp', 'tiff', 'avif'].contains(format.toLowerCase());

  String get resolution => (width != null && height != null) ? '${width}x$height' : 'Unknown';
  String get duration => durationSeconds != null
      ? '${(durationSeconds! ~/ 60).toString().padLeft(2, '0')}:${(durationSeconds! % 60).toInt().toString().padLeft(2, '0')}'
      : 'Unknown';
  String get fileSizeMb => '${(fileSizeBytes / 1048576).toStringAsFixed(1)} MB';
}
