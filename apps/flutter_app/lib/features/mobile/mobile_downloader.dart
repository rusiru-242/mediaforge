import 'dart:io';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:path_provider/path_provider.dart';
import 'package:share_plus/share_plus.dart';
import 'package:uuid/uuid.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../../core/services/backend_api.dart';
import '../../core/config/mobile_online_config.dart';
import '../../core/processing/native_media_engine.dart';

class MobileDownloader extends StatefulWidget {
  final NativeMediaEngine engine;
  final BackendApi Function(String)? apiFactory;
  const MobileDownloader({super.key, required this.engine, this.apiFactory});
  @override
  State<MobileDownloader> createState() => _MobileDownloaderState();
}

class _MobileDownloaderState extends State<MobileDownloader> {
  final url = TextEditingController();
  String serviceBase = '';
  BackendApi connect(String base) =>
      widget.apiFactory?.call(base) ?? BackendApi(baseUrl: base);
  static const accents = {
    'YouTube': Color(0xFFDC2626),
    'Facebook': Color(0xFF1865E6),
    'Instagram': Color(0xFFC13584),
  };
  BackendApi? api;
  Json? metadata;
  List<Json> options = [];
  int selection = 0;
  String error = '', status = '', output = '', platform = 'YouTube';
  bool busy = false, pasting = false;
  bool get inputLocked => busy || pasting;
  String? job;
  String? detect(String value) {
    final host = Uri.tryParse(value.trim())?.host.toLowerCase() ?? '';
    bool belongs(String domain) => host == domain || host.endsWith('.$domain');
    if (belongs('youtube.com') || belongs('youtu.be')) return 'YouTube';
    if (belongs('facebook.com') || belongs('fb.watch')) return 'Facebook';
    if (belongs('instagram.com')) return 'Instagram';
    return null;
  }

  Uri validated(String value) {
    final u = Uri.parse(value.trim());
    if (u.scheme != 'https' || u.host.isEmpty || u.userInfo.isNotEmpty) {
      throw StateError('Use a public HTTPS URL without credentials.');
    }
    return u;
  }

  void updateUrl(String value, {bool write = false}) {
    if (busy) return;
    setState(() {
      if (write) {
        url.value = TextEditingValue(
            text: value,
            selection: TextSelection.collapsed(offset: value.length));
      }
      platform = detect(value) ?? platform;
      metadata = null;
      options = [];
      selection = 0;
      output = '';
      error = '';
      status = '';
      job = null;
    });
  }

  Future<void> pasteUrl() async {
    if (inputLocked) return;
    setState(() => pasting = true);
    try {
      final data = await Clipboard.getData(Clipboard.kTextPlain);
      if (!mounted || busy) return;
      final value = data?.text?.trim() ?? '';
      if (value.isEmpty) {
        setState(() => error = 'Clipboard has no text to paste.');
      } else {
        updateUrl(value, write: true);
      }
    } catch (_) {
      if (mounted) {
        setState(() =>
            error = 'Unable to read clipboard. Paste into the URL field.');
      }
    } finally {
      if (mounted) setState(() => pasting = false);
    }
  }

  void clearUrl() {
    if (inputLocked) return;
    updateUrl('', write: true);
  }

  Future<void> analyze() async {
    if (inputLocked || url.text.trim().isEmpty) return;
    FocusManager.instance.primaryFocus?.unfocus();
    setState(() {
      busy = true;
      error = '';
      metadata = null;
      options = [];
      output = '';
    });
    try {
      if (detect(url.text) == null) {
        throw StateError('Choose a YouTube, Facebook or Instagram URL.');
      }
      final preferences = await SharedPreferences.getInstance();
      serviceBase = MobileOnlineConfig.resolve(
          savedBase: preferences.getString('mobileOnlineService') ?? '');
      validated(url.text);
      api = connect(serviceBase);
      final r = await api!.request('/downloads/metadata',
          body: {'url': url.text.trim()}, method: 'POST');
      if (r['success'] != true) {
        throw StateError('${r['message'] ?? 'No usable public media.'}');
      }
      final f = (r['availableFormats'] as List? ?? [])
          .whereType<Map>()
          .map((e) => Map<String, dynamic>.from(e))
          .toList();
      if (f.isEmpty) throw StateError('No output options returned.');
      if (mounted) {
        setState(() {
          metadata = r;
          options = f;
          selection = 0;
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() => error = e.toString());
      }
    } finally {
      api?.close();
      api = null;
      if (mounted) setState(() => busy = false);
    }
  }

  Future<void> download() async {
    if (inputLocked || options.isEmpty) return;
    setState(() {
      busy = true;
      error = '';
      output = '';
      status = 'Creating download';
    });
    try {
      api = connect(serviceBase);
      final o = options[selection];
      final format = '${o['format']}'.toLowerCase();
      if (!RegExp(r'^[a-z0-9]{2,5}$').hasMatch(format)) {
        throw StateError('Invalid format.');
      }
      final j = await api!.createJob('/downloads', {
        'url': validated(url.text).toString(),
        'selectedFormat': format,
        'selectedQuality': o['quality'],
        'mediaType': ['mp3', 'm4a', 'wav'].contains(format) ? 'audio' : 'video'
      });
      job = j.id;
      await for (final state in api!.watch(j.id)) {
        if (mounted) {
          setState(() =>
              status = '${state.status} ${state.progress.toStringAsFixed(0)}%');
        }
      }
      final done = await api!.job(j.id);
      if (!done.completed || done.outputFileId == null) {
        throw StateError(done.error ?? 'Download failed.');
      }
      final folder = await getApplicationDocumentsDirectory();
      final path = '${folder.path}/MediaForge_${const Uuid().v4()}.$format';
      await api!.save('/files/${done.outputFileId}/download', path);
      try {
        final media = await widget.engine.probeMedia(path);
        if (['mp4', 'webm', 'mkv', 'mov', 'avi', 'flv'].contains(format) &&
            !media.video) {
          throw StateError('Audio was returned instead of video.');
        }
        if (['m4a', 'mp3', 'wav', 'aac', 'flac', 'ogg'].contains(format) &&
            (!media.audio || media.video)) {
          throw StateError('Invalid audio output.');
        }
      } catch (e) {
        await File(path).delete();
        rethrow;
      }
      if (mounted) setState(() => output = path);
    } catch (e) {
      if (mounted) setState(() => error = e.toString());
    } finally {
      job = null;
      api?.close();
      api = null;
      if (mounted) setState(() => busy = false);
    }
  }

  Future<void> cancel() async {
    if (job != null) {
      try {
        await api?.cancel(job!);
      } catch (_) {}
    }
    api?.close();
  }

  @override
  void dispose() {
    api?.close();
    url.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final accent = accents[platform]!;
    return Theme(
      data: theme.copyWith(
        colorScheme: theme.colorScheme
            .copyWith(primary: accent, onPrimary: Colors.white),
        filledButtonTheme: FilledButtonThemeData(
            style: FilledButton.styleFrom(
                backgroundColor: accent,
                foregroundColor: Colors.white,
                disabledBackgroundColor: accent.withValues(alpha: 0.45),
                disabledForegroundColor: Colors.white,
                minimumSize: const Size(0, 48))),
      ),
      child: ListView(padding: const EdgeInsets.all(16), children: [
        Text('Online Media Downloader',
            style: Theme.of(context).textTheme.headlineMedium),
        const SizedBox(height: 12),
        const Text(
            'Download videos and audio from supported platforms. Internet required; local editors work offline.'),
        const SizedBox(height: 16),
        Wrap(
            spacing: 8,
            runSpacing: 8,
            children: ['YouTube', 'Facebook', 'Instagram']
                .map((name) => ChoiceChip(
                    avatar: SocialPlatformIcon(
                        platform: name,
                        color: platform == name
                            ? Colors.white
                            : theme.colorScheme.onSurfaceVariant),
                    showCheckmark: false,
                    label: Text(name),
                    selected: platform == name,
                    selectedColor: accents[name],
                    labelStyle: TextStyle(
                        color: platform == name
                            ? Colors.white
                            : Theme.of(context).colorScheme.onSurface),
                    onSelected: inputLocked ||
                            detect(url.text) != null && detect(url.text) != name
                        ? null
                        : (_) => setState(() => platform = name)))
                .toList()),
        const SizedBox(height: 16),
        TextField(
            controller: url,
            onChanged: updateUrl,
            enabled: !inputLocked,
            decoration: const InputDecoration(
                labelText: 'Media URL', prefixIcon: Icon(Icons.link)),
            keyboardType: TextInputType.url,
            autocorrect: false),
        const SizedBox(height: 8),
        Wrap(
            alignment: WrapAlignment.end,
            spacing: 8,
            runSpacing: 4,
            children: [
              TextButton.icon(
                  onPressed: inputLocked || url.text.isEmpty ? null : clearUrl,
                  icon: const Icon(Icons.close, size: 18),
                  label: const Text('Clear')),
              OutlinedButton.icon(
                  onPressed: inputLocked ? null : pasteUrl,
                  icon: const Icon(Icons.content_paste_outlined, size: 18),
                  label: Text(pasting ? 'Pasting...' : 'Paste')),
            ]),
        const SizedBox(height: 8),
        FilledButton(
            onPressed: inputLocked || url.text.trim().isEmpty ? null : analyze,
            child: const Text('Analyze')),
        if (busy) ...[
          const LinearProgressIndicator(),
          Text(status),
          TextButton(onPressed: cancel, child: const Text('Cancel'))
        ],
        if (error.isNotEmpty)
          Text(error,
              style: TextStyle(color: Theme.of(context).colorScheme.error)),
        if (metadata != null) ...[
          Text('${metadata!['title'] ?? ''}'),
          DropdownButtonFormField<int>(
              initialValue: selection,
              items: [
                for (var i = 0; i < options.length; i++)
                  DropdownMenuItem(
                      value: i,
                      child: Text(
                          '${options[i]['format']} - ${options[i]['quality']}'))
              ],
              onChanged:
                  inputLocked ? null : (v) => setState(() => selection = v!)),
          FilledButton(
              onPressed: inputLocked ? null : download,
              child: const Text('Download'))
        ],
        if (output.isNotEmpty)
          OutlinedButton(
              onPressed: () => Share.shareXFiles([XFile(output)]),
              child: const Text('Share / Save downloaded media'))
      ]),
    );
  }
}

/// Outline platform marks matching the website, without a font dependency.
class SocialPlatformIcon extends StatelessWidget {
  final String platform;
  final Color color;
  const SocialPlatformIcon(
      {super.key, required this.platform, required this.color});
  @override
  Widget build(BuildContext context) => SizedBox(
      width: 18,
      height: 18,
      child: CustomPaint(painter: _SocialMarkPainter(platform, color)));
}

class _SocialMarkPainter extends CustomPainter {
  final String platform;
  final Color color;
  const _SocialMarkPainter(this.platform, this.color);
  @override
  void paint(Canvas canvas, Size size) {
    canvas.scale(size.width / 24, size.height / 24);
    final stroke = Paint()
      ..color = color
      ..style = PaintingStyle.stroke
      ..strokeWidth = 1.8
      ..strokeCap = StrokeCap.round
      ..strokeJoin = StrokeJoin.round;
    if (platform == 'YouTube') {
      canvas.drawRRect(
          RRect.fromRectAndRadius(
              const Rect.fromLTWH(2, 5, 20, 14), const Radius.circular(4)),
          stroke);
      canvas.drawPath(
          Path()
            ..moveTo(10, 9)
            ..lineTo(16, 12)
            ..lineTo(10, 15)
            ..close(),
          stroke);
    } else if (platform == 'Instagram') {
      canvas.drawRRect(
          RRect.fromRectAndRadius(
              const Rect.fromLTWH(3, 3, 18, 18), const Radius.circular(5)),
          stroke);
      canvas.drawCircle(const Offset(12, 12), 4, stroke);
      canvas.drawCircle(const Offset(17.5, 6.5), 1, Paint()..color = color);
    } else {
      canvas.drawPath(
          Path()
            ..moveTo(16, 3)
            ..lineTo(13, 3)
            ..quadraticBezierTo(9, 3, 9, 7)
            ..lineTo(9, 10)
            ..lineTo(6, 10)
            ..lineTo(6, 14)
            ..lineTo(9, 14)
            ..lineTo(9, 22)
            ..lineTo(13, 22)
            ..lineTo(13, 14)
            ..lineTo(16, 14)
            ..lineTo(17, 10)
            ..lineTo(13, 10)
            ..lineTo(13, 7)
            ..quadraticBezierTo(13, 6, 14, 6)
            ..lineTo(16, 6)
            ..close(),
          stroke);
    }
  }

  @override
  bool shouldRepaint(covariant _SocialMarkPainter old) =>
      old.platform != platform || old.color != color;
}
