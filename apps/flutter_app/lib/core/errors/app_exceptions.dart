class AppException implements Exception {
  final String message;
  final String? code;
  const AppException(this.message, {this.code});
  @override
  String toString() => 'AppException: $message (code: $code)';
}

class FfmpegNotFoundException extends AppException {
  const FfmpegNotFoundException()
      : super('FFmpeg executable not found. Please install FFmpeg and configure the path in Settings.', code: 'FFMPEG_NOT_FOUND');
}

class ConversionException extends AppException {
  const ConversionException(super.message) : super(code: 'CONVERSION_FAILED');
}

class FileException extends AppException {
  const FileException(super.message) : super(code: 'FILE_ERROR');
}

class NetworkException extends AppException {
  const NetworkException(super.message) : super(code: 'NETWORK_ERROR');
}

class UnsupportedFormatException extends AppException {
  const UnsupportedFormatException(String format)
      : super('Unsupported format: $format', code: 'UNSUPPORTED_FORMAT');
}
