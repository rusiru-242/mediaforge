import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:file_picker/file_picker.dart';
import 'package:path/path.dart' as p;
import 'package:http/http.dart' as http;
import 'dart:convert';
import 'dart:io';
import '../../core/config/app_config.dart';
import '../../core/services/platform_service.dart';

class DownloaderPage extends ConsumerStatefulWidget {
  const DownloaderPage({super.key});

  @override
  ConsumerState<DownloaderPage> createState() => _DownloaderPageState();
}

class _DownloaderPageState extends ConsumerState<DownloaderPage> {
  final _urlController = TextEditingController();
  bool _isValidating = false;
  bool _isDownloading = false;
  double _downloadProgress = 0.0;
  String? _downloadSpeed;
  int _receivedBytes = 0;
  int _totalBytes = 0;
  String? _etaString;
  String? _currentSavePath;
  String? _error;
  String? _successMessage;
  String? _outputFolder;
  String? _downloadedFilePath;
  Map<String, dynamic>? _metadata;
  http.Client? _activeClient;

  @override
  void dispose() {
    _urlController.dispose();
    _activeClient?.close();
    super.dispose();
  }

  Future<void> _pickOutputFolder() async {
    final folder = await FilePicker.platform.getDirectoryPath();
    if (folder != null) {
      setState(() => _outputFolder = folder);
    }
  }

  Future<void> _openFolder(String path) async {
    await PlatformService.openFolder(path);
  }

  Future<void> _inspectUrl() async {
    final url = _urlController.text.trim();
    if (url.isEmpty) return;

    final uri = Uri.tryParse(url);
    if (uri == null || !uri.hasScheme || (!uri.isScheme('http') && !uri.isScheme('https'))) {
      setState(() {
        _error = 'Please enter a valid HTTP or HTTPS media URL.';
        _metadata = null;
      });
      return;
    }

    setState(() {
      _isValidating = true;
      _error = null;
      _metadata = null;
      _successMessage = null;
    });

    // Try backend metadata inspection first
    try {
      final backendUri = Uri.parse('${AppConfig.backendBaseUrl}/downloads/metadata');
      final response = await http
          .post(
            backendUri,
            headers: {'Content-Type': 'application/json'},
            body: jsonEncode({'url': url}),
          )
          .timeout(const Duration(seconds: 5));

      if (response.statusCode == 200) {
        setState(() {
          _metadata = jsonDecode(response.body) as Map<String, dynamic>;
          _isValidating = false;
        });
        return;
      }
    } catch (_) {
      // Backend not running, check directly via HEAD / GET request
    }

    // Direct HTTP inspection
    try {
      final directResponse = await http.head(uri).timeout(const Duration(seconds: 10));
      final contentType = directResponse.headers['content-type'] ?? '';
      final contentLengthStr = directResponse.headers['content-length'];
      final contentLength = contentLengthStr != null ? int.tryParse(contentLengthStr) : null;
      final fileName = uri.pathSegments.isNotEmpty ? uri.pathSegments.last : 'download';

      setState(() {
        _metadata = {
          'title': fileName,
          'mediaType': contentType.startsWith('video')
              ? 'VIDEO'
              : contentType.startsWith('audio')
                  ? 'AUDIO'
                  : contentType.startsWith('image')
                      ? 'IMAGE'
                      : 'MEDIA',
          'mimeType': contentType,
          'fileSize': contentLength,
          'directDownloadSupported': true,
          'url': url,
        };
        _isValidating = false;
      });
    } catch (e) {
      setState(() {
        _error = 'Unable to inspect media URL: $e\n\nEnsure URL is accessible or start the backend at ${AppConfig.backendBaseUrl}.';
        _isValidating = false;
      });
    }
  }

  Future<void> _startDownload() async {
    final url = _urlController.text.trim();
    if (url.isEmpty) return;

    final uri = Uri.parse(url);
    final rawFileName = uri.pathSegments.isNotEmpty && uri.pathSegments.last.isNotEmpty
        ? uri.pathSegments.last
        : 'mediaforge_${DateTime.now().millisecondsSinceEpoch}';

    final baseName = p.basenameWithoutExtension(rawFileName);
    final ext = p.extension(rawFileName).replaceFirst('.', '').isNotEmpty
        ? p.extension(rawFileName).replaceFirst('.', '')
        : 'mp4';

    final outputDir = _outputFolder ?? await PlatformService.getDefaultDownloadDirectory();
    final savePath = AppConfig.getUniqueOutputPath(outputDir, baseName, ext);

    setState(() {
      _isDownloading = true;
      _downloadProgress = 0.0;
      _downloadSpeed = null;
      _receivedBytes = 0;
      _totalBytes = 0;
      _etaString = null;
      _currentSavePath = savePath;
      _error = null;
      _successMessage = null;
    });

    _activeClient = http.Client();
    try {
      final request = http.Request('GET', uri);
      final response = await _activeClient!.send(request);

      if (response.statusCode >= 200 && response.statusCode < 300) {
        final totalBytes = response.contentLength ?? 0;
        int receivedBytes = 0;
        int lastTimestamp = DateTime.now().millisecondsSinceEpoch;
        int bytesSinceLastTick = 0;

        final file = File(savePath);
        final sink = file.openWrite();

        await response.stream.listen((chunk) {
          sink.add(chunk);
          receivedBytes += chunk.length;
          bytesSinceLastTick += chunk.length;

          final now = DateTime.now().millisecondsSinceEpoch;
          final elapsedMs = now - lastTimestamp;

          if (elapsedMs >= 500 && mounted) {
            final speedBytesPerSec = (bytesSinceLastTick * 1000) / elapsedMs;
            final speedText = speedBytesPerSec > 1048576
                ? '${(speedBytesPerSec / 1048576).toStringAsFixed(2)} MB/s'
                : '${(speedBytesPerSec / 1024).toStringAsFixed(1)} KB/s';

            String? eta;
            if (totalBytes > 0 && speedBytesPerSec > 0) {
              final remainingSec = ((totalBytes - receivedBytes) / speedBytesPerSec).round();
              eta = remainingSec > 60
                  ? '${remainingSec ~/ 60}m ${remainingSec % 60}s remaining'
                  : '${remainingSec}s remaining';
            }

            setState(() {
              _downloadSpeed = speedText;
              _receivedBytes = receivedBytes;
              _totalBytes = totalBytes;
              _etaString = eta;
              if (totalBytes > 0) {
                _downloadProgress = (receivedBytes / totalBytes).clamp(0.0, 1.0);
              }
            });

            lastTimestamp = now;
            bytesSinceLastTick = 0;
          }
        }).asFuture();

        await sink.flush();
        await sink.close();

        if (mounted) {
          setState(() {
            _isDownloading = false;
            _downloadProgress = 1.0;
            _downloadedFilePath = savePath;
            _currentSavePath = null;
            _successMessage = 'Media downloaded successfully to:\n$savePath';
          });
        }
      } else {
        throw HttpException('HTTP error ${response.statusCode}: ${response.reasonPhrase}');
      }
    } catch (e) {
      // Clean up partial file on failure
      if (_currentSavePath != null) {
        try {
          final partialFile = File(_currentSavePath!);
          if (partialFile.existsSync()) {
            partialFile.deleteSync();
          }
        } catch (_) {}
      }
      if (mounted) {
        setState(() {
          _isDownloading = false;
          _currentSavePath = null;
          _error = 'Download failed: $e';
        });
      }
    } finally {
      _activeClient = null;
    }
  }

  void _cancelDownload() {
    _activeClient?.close();
    _activeClient = null;
    // Clean up partial file on cancellation
    if (_currentSavePath != null) {
      try {
        final partialFile = File(_currentSavePath!);
        if (partialFile.existsSync()) {
          partialFile.deleteSync();
        }
      } catch (_) {}
    }
    setState(() {
      _isDownloading = false;
      _currentSavePath = null;
      _error = 'Download cancelled by user.';
    });
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final screenWidth = MediaQuery.of(context).size.width;
    final isMobile = screenWidth < 720;
    final pagePadding = isMobile ? const EdgeInsets.all(16) : const EdgeInsets.all(24);

    return Scaffold(
      body: SingleChildScrollView(
        padding: pagePadding,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'URL Media Downloader',
              style: theme.textTheme.headlineSmall?.copyWith(fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 4),
            Text(
              'Download permitted video, audio, or images from authorized HTTP/HTTPS streams.',
              style: theme.textTheme.bodyMedium?.copyWith(color: theme.colorScheme.onSurfaceVariant),
            ),
            const SizedBox(height: 24),
            Card(
              child: Padding(
                padding: const EdgeInsets.all(20),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'Media Stream URL',
                      style: theme.textTheme.titleSmall?.copyWith(fontWeight: FontWeight.w600),
                    ),
                    const SizedBox(height: 12),
                    if (isMobile) ...[
                      TextField(
                        controller: _urlController,
                        decoration: const InputDecoration(
                          hintText: 'https://example.com/media/sample.mp4',
                          prefixIcon: Icon(Icons.link),
                        ),
                        onSubmitted: (_) => _inspectUrl(),
                      ),
                      const SizedBox(height: 10),
                      ElevatedButton.icon(
                        onPressed: _isValidating || _isDownloading ? null : _inspectUrl,
                        icon: _isValidating
                            ? const SizedBox(
                                width: 16,
                                height: 16,
                                child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
                              )
                            : const Icon(Icons.search),
                        label: const Text('Inspect'),
                      ),
                    ] else ...[
                      Row(
                        children: [
                          Expanded(
                            child: TextField(
                              controller: _urlController,
                              decoration: const InputDecoration(
                                hintText: 'https://example.com/media/sample.mp4',
                                prefixIcon: Icon(Icons.link),
                              ),
                              onSubmitted: (_) => _inspectUrl(),
                            ),
                          ),
                          const SizedBox(width: 12),
                          ElevatedButton.icon(
                            onPressed: _isValidating || _isDownloading ? null : _inspectUrl,
                            icon: _isValidating
                                ? const SizedBox(
                                    width: 16,
                                    height: 16,
                                    child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
                                  )
                                : const Icon(Icons.search),
                            label: const Text('Inspect'),
                          ),
                        ],
                      ),
                    ],
                    const SizedBox(height: 16),
                    if (isMobile) ...[
                      Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Row(
                            children: [
                              const Text('Save To: ', style: TextStyle(fontWeight: FontWeight.w500)),
                              const SizedBox(width: 8),
                              Expanded(
                                child: Text(
                                  _outputFolder ?? 'Default Downloads Folder',
                                  style: theme.textTheme.bodySmall,
                                  overflow: TextOverflow.ellipsis,
                                ),
                              ),
                            ],
                          ),
                          const SizedBox(height: 4),
                          TextButton.icon(
                            onPressed: _isDownloading ? null : _pickOutputFolder,
                            icon: const Icon(Icons.folder_open, size: 16),
                            label: const Text('Change Folder'),
                          ),
                        ],
                      ),
                    ] else ...[
                      Row(
                        children: [
                          const Text('Save To: ', style: TextStyle(fontWeight: FontWeight.w500)),
                          const SizedBox(width: 8),
                          Expanded(
                            child: Text(
                              _outputFolder ?? 'Default Downloads Folder',
                              style: theme.textTheme.bodySmall,
                              overflow: TextOverflow.ellipsis,
                            ),
                          ),
                          TextButton.icon(
                            onPressed: _isDownloading ? null : _pickOutputFolder,
                            icon: const Icon(Icons.folder_open, size: 16),
                            label: const Text('Change Folder'),
                          ),
                        ],
                      ),
                    ],
                    if (_error != null) ...[
                      const SizedBox(height: 16),
                      Container(
                        padding: const EdgeInsets.all(12),
                        decoration: BoxDecoration(
                          color: Colors.red.withValues(alpha: 0.1),
                          borderRadius: BorderRadius.circular(8),
                          border: Border.all(color: Colors.red.withValues(alpha: 0.3)),
                        ),
                        child: Row(
                          children: [
                            const Icon(Icons.error_outline, color: Colors.red, size: 20),
                            const SizedBox(width: 8),
                            Expanded(child: Text(_error!, style: const TextStyle(color: Colors.red, fontSize: 13))),
                            if (_metadata != null && !_isDownloading)
                              TextButton.icon(
                                onPressed: _startDownload,
                                icon: const Icon(Icons.refresh, size: 16, color: Colors.red),
                                label: const Text('Retry', style: TextStyle(color: Colors.red)),
                              ),
                          ],
                        ),
                      ),
                    ],
                    if (_successMessage != null) ...[
                      const SizedBox(height: 16),
                      Container(
                        padding: const EdgeInsets.all(12),
                        decoration: BoxDecoration(
                          color: Colors.green.withValues(alpha: 0.1),
                          borderRadius: BorderRadius.circular(8),
                          border: Border.all(color: Colors.green.withValues(alpha: 0.3)),
                        ),
                        child: Row(
                          children: [
                            const Icon(Icons.check_circle, color: Colors.green, size: 20),
                            const SizedBox(width: 8),
                            Expanded(child: Text(_successMessage!, style: const TextStyle(color: Colors.green, fontSize: 13))),
                            if (_downloadedFilePath != null) ...[
                              IconButton(
                                icon: const Icon(Icons.share, size: 20),
                                tooltip: 'Share File',
                                onPressed: () => PlatformService.shareFile(_downloadedFilePath!),
                              ),
                              TextButton(
                                onPressed: () => _openFolder(p.dirname(_downloadedFilePath!)),
                                child: const Text('Open Folder'),
                              ),
                            ],
                          ],
                        ),
                      ),
                    ],
                    if (_metadata != null) ...[
                      const SizedBox(height: 20),
                      Container(
                        padding: const EdgeInsets.all(16),
                        decoration: BoxDecoration(
                          color: theme.colorScheme.surfaceContainerHighest.withValues(alpha: 0.5),
                          borderRadius: BorderRadius.circular(12),
                          border: Border.all(color: theme.colorScheme.outlineVariant),
                        ),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Row(
                              children: [
                                const Icon(Icons.check_circle_outline, color: Colors.green, size: 20),
                                const SizedBox(width: 8),
                                Text(
                                  'Media Stream Found',
                                  style: theme.textTheme.titleSmall?.copyWith(fontWeight: FontWeight.w600),
                                ),
                              ],
                            ),
                            const Divider(height: 20),
                            Text('Title: ${_metadata!['title'] ?? 'Direct Stream'}', style: const TextStyle(fontWeight: FontWeight.w500)),
                            const SizedBox(height: 4),
                            Text('Type: ${_metadata!['mediaType'] ?? 'Unknown'}', style: theme.textTheme.bodySmall),
                            if (_metadata!['fileSize'] != null)
                              Text(
                                'Size: ${((_metadata!['fileSize'] as int) / 1048576).toStringAsFixed(1)} MB',
                                style: theme.textTheme.bodySmall,
                              ),
                            const SizedBox(height: 16),
                            Row(
                              children: [
                                ElevatedButton.icon(
                                  onPressed: _isDownloading ? null : _startDownload,
                                  icon: const Icon(Icons.download),
                                  label: const Text('Download Media'),
                                ),
                                if (_isDownloading) ...[
                                  const SizedBox(width: 12),
                                  OutlinedButton.icon(
                                    onPressed: _cancelDownload,
                                    icon: const Icon(Icons.stop),
                                    label: const Text('Cancel'),
                                  ),
                                ],
                              ],
                            ),
                            if (_isDownloading) ...[
                              const SizedBox(height: 16),
                              LinearProgressIndicator(value: _downloadProgress > 0 ? _downloadProgress : null),
                              const SizedBox(height: 6),
                              Row(
                                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                children: [
                                  Text(
                                    _totalBytes > 0
                                        ? '${(_downloadProgress * 100).toInt()}% (${(_receivedBytes / 1048576).toStringAsFixed(1)} / ${(_totalBytes / 1048576).toStringAsFixed(1)} MB)'
                                        : '${(_receivedBytes / 1048576).toStringAsFixed(1)} MB downloaded',
                                    style: theme.textTheme.bodySmall?.copyWith(fontWeight: FontWeight.w500),
                                  ),
                                  Row(
                                    children: [
                                      if (_downloadSpeed != null) ...[
                                        Text(_downloadSpeed!, style: theme.textTheme.bodySmall?.copyWith(color: theme.colorScheme.primary)),
                                        const SizedBox(width: 8),
                                      ],
                                      if (_etaString != null)
                                        Text(_etaString!, style: theme.textTheme.bodySmall?.copyWith(color: theme.colorScheme.outline)),
                                    ],
                                  ),
                                ],
                              ),
                            ],
                          ],
                        ),
                      ),
                    ],
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
