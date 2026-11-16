import 'dart:async';
import 'dart:io';
import 'dart:math' as math;
import 'package:file_picker/file_picker.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:media_kit/media_kit.dart';
import 'package:media_kit_video/media_kit_video.dart';
import 'package:path/path.dart' as p;
import '../../core/config/app_config.dart';
import '../../core/services/bundled_tools.dart';
import '../../core/services/media_api.dart';
import '../../core/services/preview_probe.dart';
import 'crop_surface.dart';
import 'desktop_task.dart';
import 'desktop_widgets.dart';
import 'task_panel.dart';
import 'video_export_options.dart';

class DesktopEditor extends ConsumerStatefulWidget {
  final String kind;
  const DesktopEditor({super.key, required this.kind});
  @override
  ConsumerState<DesktopEditor> createState() => DesktopEditorState();
}

class DesktopEditorState extends ConsumerState<DesktopEditor> {
  final task = DesktopTask();
  PreviewProbe? probe;
  Player? player;
  VideoController? video;
  final subscriptions = <StreamSubscription<dynamic>>[];
  Timer? effectTimer;
  String? path;
  String format = '',
      quality = '1080p',
      error = '',
      tool = 'Select Range',
      ratio = 'Original',
      filter = 'Original';
  String exportMode = 'Video';
  Json? info;
  List<double> peaks = [];
  List<Json> cuts = [];
  double start = 0,
      end = 0,
      position = 0,
      duration = 0,
      volume = 100,
      fadeIn = 0,
      fadeOut = 0;
  double brightness = 0,
      contrast = 1,
      saturation = 1,
      warmth = 0,
      imageQuality = 85,
      scale = 1,
      speed = 1;
  int width = 0,
      height = 0,
      rotation = 0,
      bitrate = 192,
      sampleRate = 48000,
      channels = 2;
  bool importing = false,
      dirty = false,
      playing = false,
      cropEnabled = false,
      flipH = false,
      flipV = false,
      mute = false;
  Rect crop = const Rect.fromLTWH(0, 0, 1, 1);
  Map<String, int> effects = {};
  bool get isImage => widget.kind == 'image';
  bool get isAudio => widget.kind == 'audio';
  bool get editable => path != null && !importing && !task.busy;
  bool get needsGuard =>
      importing ||
      task.busy ||
      dirty ||
      task.job?.completed == true && task.savedPath == null;
  List<String> get inputExtensions => isImage
      ? AppConfig.imageInputFormats
      : isAudio
          ? [...AppConfig.audioInputFormats, ...AppConfig.videoInputFormats]
          : AppConfig.videoInputFormats;
  List<String> get outputFormats => isImage
      ? ['webp', 'avif', 'jpg', 'png']
      : isAudio || exportMode == 'Audio'
          ? ['mp3', 'wav', 'aac', 'flac', 'ogg', 'm4a']
          : ['mp4', 'webm', 'mov', 'mkv', 'avi'];
  @override
  void initState() {
    super.initState();
    format = isImage
        ? 'webp'
        : isAudio
            ? 'mp3'
            : 'mp4';
    task.addListener(refresh);
  }

  void refresh() {
    if (mounted) setState(() {});
  }

  Future<void> pause() async {
    await player?.pause();
  }

  void change(VoidCallback update) {
    if (!editable) return;
    setState(() {
      update();
      dirty = true;
    });
    task.invalidate();
    effectTimer?.cancel();
    effectTimer = Timer(const Duration(milliseconds: 180), applyPreviewEffects);
  }

  @override
  void dispose() {
    effectTimer?.cancel();
    probe?.close();
    for (final subscription in subscriptions) {
      subscription.cancel();
    }
    player?.dispose();
    task.dispose();
    super.dispose();
  }

  Future<void> applyPreviewEffects() async {
    final native = player?.platform;
    if (native is! NativePlayer || !mounted) return;
    final filters = <String>[];
    for (final name in ['reverb', 'echo', 'bass', 'treble', 'warmth']) {
      final level = (effects[name] ?? 0) / 100;
      if (level == 0) continue;
      filters.add(switch (name) {
        'reverb' =>
          'aecho=${1 - .2 * level}:${1 - .12 * level}:40|70|100:${.25 * level}|${.18 * level}|${.12 * level}',
        'echo' => 'aecho=${1 - .2 * level}:${1 - .1 * level}:180:${.3 * level}',
        'bass' => 'bass=g=${6 * level}:f=200',
        'treble' => 'treble=g=${5 * level}:f=3000',
        _ => 'lowpass=f=${20000 - 15000 * level}',
      });
    }
    try {
      await native.setProperty(
          'af', filters.isEmpty ? '' : 'lavfi=[${filters.join(',')}]');
    } catch (e) {
      if (mounted) {
        setState(() => error = 'Audio effect preview unavailable: $e');
      }
    }
  }

  Future<void> pick() async {
    final result = await FilePicker.platform
        .pickFiles(type: FileType.custom, allowedExtensions: inputExtensions);
    if (result?.files.single.path != null) {
      await importFile(result!.files.single.path!);
    }
  }

  Future<void> importFile(String selected) async {
    if (importing || task.busy) return;
    if (!inputExtensions
        .contains(p.extension(selected).replaceFirst('.', '').toLowerCase())) {
      setState(() => error = 'Choose a supported ${widget.kind} file.');
      return;
    }
    if (!await FileSystemEntity.isFile(selected)) {
      if (mounted) {
        setState(() => error = 'Choose a media file, rather than a folder.');
      }
      return;
    }
    if (await File(selected).length() > 2 * 1024 * 1024 * 1024) {
      setState(() => error = 'Files must be smaller than 2 GB.');
      return;
    }
    if (!mounted) return;
    setState(() {
      importing = true;
      error = '';
    });
    probe?.close();
    probe = PreviewProbe();
    await pause();
    task.invalidate();
    try {
      final tools = BundledTools();
      final data = await probe!.inspect(selected, tools.ffprobe);
      final streams = (data['streams'] as List).whereType<Map>().toList();
      final visual =
          streams.where((s) => s['codec_type'] == 'video').firstOrNull;
      final sourceDuration =
          double.tryParse('${(data['format'] as Map?)?['duration']}') ?? 0;
      if (!isImage && sourceDuration <= 0) {
        throw const BackendException(
            'The imported clip has no playable duration.');
      }
      if (!isAudio && visual == null) {
        throw const BackendException(
            'The imported file does not contain an image/video stream.');
      }
      if (isAudio && !streams.any((s) => s['codec_type'] == 'audio')) {
        throw const BackendException('The imported file has no audio stream.');
      }
      if (!mounted) return;
      setState(() {
        path = selected;
        info = data;
        duration = sourceDuration;
        start = 0;
        end = duration;
        position = 0;
        width = (visual?['width'] as num? ?? 0).toInt();
        height = (visual?['height'] as num? ?? 0).toInt();
        crop = const Rect.fromLTWH(0, 0, 1, 1);
        ratio = 'Original';
        cropEnabled = false;
        cuts = [];
        peaks = [];
        dirty = true;
        effects = {};
        fadeIn = 0;
        fadeOut = 0;
        rotation = 0;
        flipH = false;
        flipV = false;
        brightness = 0;
        contrast = 1;
        saturation = 1;
        warmth = 0;
        filter = 'Original';
      });
      if (!isImage) {
        player ??= Player();
        if (subscriptions.isEmpty) {
          subscriptions.add(player!.stream.position.listen((value) {
            final seconds = value.inMicroseconds / 1000000;
            if (player!.state.playing && seconds >= end && end > start) {
              player!.pause();
              player!.seek(Duration(microseconds: (start * 1000000).round()));
            }
            if (mounted) setState(() => position = seconds.clamp(start, end));
            final gain = _fadeGain(seconds);
            player!.setVolume((mute ? 0.0 : volume * gain).clamp(0, 200));
          }));
          subscriptions.add(player!.stream.playing.listen((value) {
            if (mounted) setState(() => playing = value);
          }));
          subscriptions.add(player!.stream.error.listen((value) {
            if (mounted) setState(() => error = 'Preview: $value');
          }));
        }
        if (!isAudio) video ??= VideoController(player!);
        await player!.open(Media(File(selected).uri.toString()), play: false);
        await player!.setRate(speed);
        unawaited(_loadWaveform(selected, tools.ffmpeg));
      }
    } catch (e) {
      if (mounted) {
        setState(() => error =
            'Import failed: $e. Repair or reinstall the app if a bundled processing tool is missing.');
      }
    } finally {
      if (mounted) setState(() => importing = false);
    }
  }

  Future<void> _loadWaveform(String selected, String executable) async {
    try {
      final values = await probe!.waveform(selected, duration, executable);
      if (mounted && path == selected) setState(() => peaks = values);
    } catch (_) {
      /* Playback remains available if local waveform decoding is unavailable. */
    }
  }

  double _fadeGain(double time) {
    double ramp(double x) => math.sin(x.clamp(0, 1) * math.pi / 2);
    return (fadeIn > 0 ? ramp((time - start) / fadeIn) : 1) *
        (fadeOut > 0 ? ramp((end - time) / fadeOut) : 1);
  }

  Future<void> playPause() async {
    if (!editable || player == null) return;
    if (playing) {
      await player!.pause();
      return;
    }
    if (player!.state.position.inMicroseconds / 1000000 < start ||
        player!.state.position.inMicroseconds / 1000000 >= end - .03) {
      await seek(start);
    }
    await player!.play();
  }

  Future<void> seek(double value) async => player?.seek(
      Duration(microseconds: (value.clamp(start, end) * 1000000).round()));
  void setRange(RangeValues value) {
    if (value.end - value.start < .05) return;
    change(() {
      start = value.start;
      end = value.end;
      fadeIn = fadeIn.clamp(0, end - start);
      fadeOut = fadeOut.clamp(0, end - start);
    });
    if (position < start || position >= end) seek(start);
  }

  void setRatio(String value) {
    change(() {
      ratio = value;
      cropEnabled = value != 'Original';
      if (value == 'Original') {
        crop = const Rect.fromLTWH(0, 0, 1, 1);
        return;
      }
      if (value == 'Custom') return;
      final parts = value.split(':').map(double.parse).toList();
      final normalizedRatio = parts[0] / parts[1] / (width / height);
      final w = normalizedRatio < 1 ? normalizedRatio : 1.0,
          h = normalizedRatio < 1 ? 1.0 : 1 / normalizedRatio;
      crop = Rect.fromLTWH((1 - w) / 2, (1 - h) / 2, w, h);
    });
  }

  Json payload(String inputId) {
    final result = <String, dynamic>{
      'inputFileId': inputId,
      'inputFormat': p.extension(path!).substring(1),
      'outputFormat': format,
      'mediaType': isImage
          ? 'image'
          : isAudio || exportMode == 'Audio'
              ? 'audio'
              : 'video'
    };
    if (!isImage) {
      result.addAll({
        'startTime': start,
        'endTime': end,
        'volume': volume / 100,
        'audioBitrate': bitrate,
        'sampleRate': sampleRate,
        'audioChannels': channels,
        'fadeInDuration': fadeIn,
        'fadeOutDuration': fadeOut,
        'audioEffects': effects.keys.toList(),
        'audioEffectLevels': effects,
        'removeSegments': cuts
      });
      if (!isAudio && exportMode == 'Video') {
        result['removeAudio'] = mute;
        result.addAll({
          'brightness': brightness,
          'contrast': contrast,
          'saturation': saturation,
          'warmth': warmth
        });
        if (quality != 'Original') result['targetResolution'] = quality;
      }
    } else {
      result.addAll({
        'imageQuality': imageQuality.round(),
        'imageRotation': rotation,
        'flipHorizontal': flipH,
        'flipVertical': flipV,
        'brightness': brightness,
        'contrast': contrast,
        'saturation': saturation,
        'warmth': warmth
      });
      if (scale != 1) {
        result['imageWidth'] = ((cropEnabled ? crop.width : 1) * width * scale)
            .round()
            .clamp(2, 16384);
        result['imageHeight'] =
            ((cropEnabled ? crop.height : 1) * height * scale)
                .round()
                .clamp(2, 16384);
      }
    }
    if (cropEnabled && !isAudio && width > 0 && height > 0) {
      int even(double v) => math.max(2, (v / 2).floor() * 2);
      result.addAll({
        'cropX': (crop.left * width).floor() ~/ 2 * 2,
        'cropY': (crop.top * height).floor() ~/ 2 * 2,
        'cropWidth': even(crop.width * width),
        'cropHeight': even(crop.height * height)
      });
    }
    return result;
  }

  Future<void> export() async {
    await pause();
    await task.run((api) async {
      final upload = await api.upload(path!, onProgress: task.uploading);
      return api.createJob('/conversions',
          payload((upload['fileId'] ?? upload['id']).toString()));
    });
    if (mounted && task.job?.completed == true) setState(() => dirty = false);
  }

  Widget colorPreview(Widget child) {
    final s = saturation,
        c = contrast,
        b = brightness * 255 + 128 * (1 - contrast),
        w = warmth * 18;
    final r = .2126 * (1 - s), g = .7152 * (1 - s), bl = .0722 * (1 - s);
    return ColorFiltered(
        colorFilter: ColorFilter.matrix([
          c * (r + s),
          c * g,
          c * bl,
          0,
          b + w,
          c * r,
          c * (g + s),
          c * bl,
          0,
          b,
          c * r,
          c * g,
          c * (bl + s),
          0,
          b - w,
          0,
          0,
          0,
          1,
          0
        ]),
        child: child);
  }

  Widget preview() {
    if (path == null) {
      return StudioDropZone(
          title:
              'Click or Drag ${isImage ? 'Image' : isAudio ? 'Audio' : 'Video'} to Import',
          description: inputExtensions.map((f) => f.toUpperCase()).join(', '),
          onPick: pick,
          enabled: !importing,
          onDrop: (paths) {
            if (paths.isNotEmpty) importFile(paths.first);
          });
    }
    if (isAudio) {
      return StudioCard(
          child: Column(children: [
        Row(children: [
          const Icon(Icons.graphic_eq),
          const SizedBox(width: 10),
          Expanded(
              child: Text('Audio Waveform',
                  style: Theme.of(context).textTheme.titleMedium)),
          Text('Selection: ${timeLabel(end - start)}')
        ]),
        const SizedBox(height: 18),
        SizedBox(
            height: 180,
            width: double.infinity,
            child: CustomPaint(
                painter: _WavePainter(
                    peaks,
                    Theme.of(context).colorScheme.primary,
                    duration > 0 ? start / duration : 0,
                    duration > 0 ? end / duration : 1,
                    duration > 0 ? position / duration : 0,
                    duration > 0 ? fadeIn / duration : 0,
                    duration > 0 ? fadeOut / duration : 0))),
      ]));
    }
    Widget child;
    if (isImage) {
      child = Image.file(File(path!),
          fit: BoxFit.contain,
          errorBuilder: (_, __, ___) => const Center(
              child: Text(
                  'Native preview unavailable for this format. Export remains available.')));
      child = colorPreview(child);
      if (tool != 'Crop Canvas') {
        child = Transform.flip(
            flipX: flipH,
            flipY: flipV,
            child: RotatedBox(quarterTurns: rotation ~/ 90, child: child));
      }
    } else {
      child = video == null
          ? const SizedBox()
          : colorPreview(Video(controller: video!, controls: NoVideoControls));
    }
    final aspect = width > 0 && height > 0 ? width / height : 16 / 9;
    return LayoutBuilder(
        builder: (context, box) => ClipRRect(
            borderRadius: BorderRadius.circular(24),
            child: Container(
                alignment: Alignment.center,
                color: Theme.of(context).colorScheme.surfaceContainerLow,
                child: SizedBox(
                    width: math.min(box.maxWidth, 440 * aspect),
                    child: CropSurface(
                        aspect: aspect,
                        crop: crop,
                        onChanged: tool == 'Crop Canvas' && editable
                            ? (value) => change(() {
                                  cropEnabled = true;
                                  ratio = 'Custom';
                                  crop = value;
                                })
                            : null,
                        child: child)))));
  }

  Widget trimTools() =>
      Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
        if (!isImage) ...[
          Row(children: [
            IconButton(
                tooltip: 'Go to trim start',
                onPressed: editable ? () => seek(start) : null,
                icon: const Icon(Icons.skip_previous)),
            IconButton.filled(
                tooltip: playing ? 'Pause' : 'Play selected range',
                onPressed: editable ? playPause : null,
                icon: Icon(playing ? Icons.pause : Icons.play_arrow)),
            IconButton(
                tooltip: 'Go to trim end',
                onPressed: editable ? () => seek(end) : null,
                icon: const Icon(Icons.skip_next)),
            const SizedBox(width: 10),
            Expanded(
                child: Text('${timeLabel(position)} / ${timeLabel(duration)}',
                    overflow: TextOverflow.ellipsis)),
          ]),
          Slider(
              value: position.clamp(start, math.max(start, end)),
              min: start,
              max: end > start ? end : start + 1,
              onChanged: editable ? seek : null),
        ],
        if (!isAudio)
          Wrap(spacing: 8, runSpacing: 8, children: [
            for (final value in isImage
                ? ['Light & Color', 'Crop Canvas']
                : ['Select Range', 'Crop Canvas'])
              ChoiceChip(
                  label: Text(value),
                  selected: tool == value,
                  onSelected: (_) => setState(() => tool = value))
          ]),
        const SizedBox(height: 16),
        if (!isImage && tool != 'Crop Canvas') ...[
          Text('Trim • ${timeLabel(start)} — ${timeLabel(end)}'),
          RangeSlider(
              values: RangeValues(start, end),
              min: 0,
              max: duration > 0 ? duration : 1,
              labels: RangeLabels(timeLabel(start), timeLabel(end)),
              onChanged: editable ? setRange : null),
          Wrap(spacing: 10, children: [
            OutlinedButton(
                onPressed: editable
                    ? () =>
                        setRange(RangeValues(position.clamp(0, end - .05), end))
                    : null,
                child: const Text('Set start at playhead')),
            OutlinedButton(
                onPressed: editable
                    ? () => setRange(RangeValues(
                        start, position.clamp(start + .05, duration)))
                    : null,
                child: const Text('Set end at playhead'))
          ]),
          const SizedBox(height: 12),
          if (!isAudio)
            ExpansionTile(
                title: const Text('Cut intervals'),
                tilePadding: EdgeInsets.zero,
                children: [
                  TextButton.icon(
                      onPressed: editable && end - start > .1
                          ? () => change(
                              () => cuts.add({'start': start, 'end': end}))
                          : null,
                      icon: const Icon(Icons.content_cut),
                      label: const Text('Exclude current selection')),
                  for (var i = 0; i < cuts.length; i++)
                    ListTile(
                        title: Text(
                            '${timeLabel((cuts[i]['start'] as num).toDouble())} – ${timeLabel((cuts[i]['end'] as num).toDouble())}'),
                        trailing: IconButton(
                            tooltip: 'Remove cut',
                            onPressed: editable
                                ? () => change(() => cuts.removeAt(i))
                                : null,
                            icon: const Icon(Icons.close))),
                  const Text(
                      'After adding a cut, expand the trim range to include the material you want to keep.'),
                ]),
        ],
        if (!isAudio && tool == 'Crop Canvas') ...[
          Text('Crop Dimensions & Placement',
              style: Theme.of(context).textTheme.titleMedium),
          const SizedBox(height: 12),
          Wrap(
              spacing: 6,
              runSpacing: 6,
              children: [
                'Original',
                '16:9',
                '9:16',
                '1:1',
                '4:3',
                '3:4',
                '4:5',
                '3:2',
                '2:3',
                '21:9',
                'Custom'
              ]
                  .map((r) => ChoiceChip(
                      label: Text(r),
                      selected: ratio == r,
                      onSelected: editable ? (_) => setRatio(r) : null))
                  .toList()),
          const SizedBox(height: 12),
          const Text(
              'Drag the crop frame to reposition it. Drag any corner or edge to resize freely.'),
          StudioSlider(
              label: 'Zoom crop',
              value: 1 / crop.width,
              min: 1,
              max: 8,
              suffix: '${(100 / crop.width).round()}%',
              onChanged: editable
                  ? (value) => change(() {
                        final aspect = crop.height / crop.width;
                        final w = 1 / value;
                        crop = clampCrop(Rect.fromCenter(
                            center: crop.center,
                            width: w,
                            height: (w * aspect).clamp(.03, 1)));
                        cropEnabled = true;
                        ratio = 'Custom';
                      })
                  : null),
          Text(
              '${(crop.width * width).round()} × ${(crop.height * height).round()} px'),
        ],
        if (isImage && tool != 'Crop Canvas') imageTools(),
      ]);

  Widget filterTools() =>
      Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Text(isImage ? 'Photo Filters' : 'Video Filters',
            style: Theme.of(context).textTheme.titleMedium),
        const SizedBox(height: 12),
        Wrap(
            spacing: 8,
            runSpacing: 8,
            children: [
              'Original',
              'Vivid',
              'Vivid Warm',
              'Vivid Cool',
              'Dramatic',
              'Mono'
            ]
                .map((value) => ChoiceChip(
                    label: Text(value),
                    selected: filter == value,
                    onSelected: editable
                        ? (_) => change(() {
                              filter = value;
                              final values = {
                                'Original': [0.0, 1.0, 1.0, 0.0],
                                'Vivid': [.03, 1.12, 1.45, 0.0],
                                'Vivid Warm': [.03, 1.1, 1.3, .3],
                                'Vivid Cool': [.02, 1.1, 1.3, -.3],
                                'Dramatic': [-.04, 1.4, .8, 0.0],
                                'Mono': [0.0, 1.15, 0.0, 0.0]
                              }[value]!;
                              brightness = values[0];
                              contrast = values[1];
                              saturation = values[2];
                              warmth = values[3];
                            })
                        : null))
                .toList()),
      ]);

  Widget imageTools() =>
      Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        filterTools(),
        const SizedBox(height: 18),
        StudioSlider(
            label: 'Brightness',
            value: brightness,
            min: -1,
            max: 1,
            onChanged: editable ? (v) => change(() => brightness = v) : null),
        StudioSlider(
            label: 'Contrast',
            value: contrast,
            max: 2,
            onChanged: editable ? (v) => change(() => contrast = v) : null),
        StudioSlider(
            label: 'Saturation',
            value: saturation,
            max: 2,
            onChanged: editable ? (v) => change(() => saturation = v) : null),
        StudioSlider(
            label: 'Warmth',
            value: warmth,
            min: -1,
            max: 1,
            onChanged: editable ? (v) => change(() => warmth = v) : null),
        Wrap(spacing: 8, children: [
          TextButton.icon(
              onPressed: editable
                  ? () => change(() => rotation = (rotation + 270) % 360)
                  : null,
              icon: const Icon(Icons.rotate_left),
              label: const Text('Rotate left')),
          TextButton.icon(
              onPressed: editable
                  ? () => change(() => rotation = (rotation + 90) % 360)
                  : null,
              icon: const Icon(Icons.rotate_right),
              label: const Text('Rotate right')),
          FilterChip(
              label: const Text('Flip horizontal'),
              selected: flipH,
              onSelected: editable ? (v) => change(() => flipH = v) : null),
          FilterChip(
              label: const Text('Flip vertical'),
              selected: flipV,
              onSelected: editable ? (v) => change(() => flipV = v) : null)
        ]),
      ]);

  Widget audioTools() =>
      Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        StudioSlider(
            label: 'Clip volume',
            value: volume,
            max: 200,
            suffix: '${volume.round()}%',
            onChanged: editable
                ? (v) {
                    change(() => volume = v);
                    player?.setVolume(v);
                  }
                : null),
        if (isAudio) ...[
          StudioSlider(
              label: 'Fade In',
              value: fadeIn,
              max: math.max(.1, end - start),
              suffix: '${fadeIn.toStringAsFixed(1)}s',
              onChanged: editable ? (v) => change(() => fadeIn = v) : null),
          StudioSlider(
              label: 'Fade Out',
              value: fadeOut,
              max: math.max(.1, end - start),
              suffix: '${fadeOut.toStringAsFixed(1)}s',
              onChanged: editable ? (v) => change(() => fadeOut = v) : null),
        ],
        Text('Audio Effects', style: Theme.of(context).textTheme.titleMedium),
        const SizedBox(height: 12),
        Wrap(
            spacing: 6,
            runSpacing: 6,
            children: {
              'reverb': 'Reverb',
              'echo': 'Echo',
              'bass': 'Bass Boost',
              'treble': 'Treble Boost',
              'warmth': 'Warmth'
            }
                .entries
                .map((e) => FilterChip(
                    label: Text(e.value),
                    selected: effects.containsKey(e.key),
                    onSelected: editable
                        ? (selected) => change(() {
                              if (selected) {
                                effects[e.key] = 50;
                              } else {
                                effects.remove(e.key);
                              }
                            })
                        : null))
                .toList()),
        for (final effect in effects.keys)
          StudioSlider(
              label: '${effect[0].toUpperCase()}${effect.substring(1)} level',
              value: effects[effect]!.toDouble(),
              suffix: '${effects[effect]}%',
              onChanged: editable
                  ? (v) => change(() => effects[effect] = v.round())
                  : null),
        if (effects.isNotEmpty)
          const Text('Effects are applied to playback and the exported audio.'),
      ]);

  @override
  Widget build(BuildContext context) {
    final title =
        '${widget.kind[0].toUpperCase()}${widget.kind.substring(1)} Editor';
    return Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
      Row(children: [
        Expanded(
            child:
                Text(title, style: Theme.of(context).textTheme.headlineMedium)),
        OutlinedButton.icon(
            onPressed: importing || task.busy ? null : pick,
            icon: const Icon(Icons.add, size: 18),
            label: const Text('Import'))
      ]),
      if (path != null)
        Padding(
            padding: const EdgeInsets.symmetric(vertical: 12),
            child: Text(p.basename(path!), overflow: TextOverflow.ellipsis)),
      const SizedBox(height: 16),
      if (importing) const LinearProgressIndicator(),
      if (error.isNotEmpty) StudioNotice(error, error: true),
      StudioPanels(
          main:
              Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
            ConstrainedBox(
                constraints: const BoxConstraints(maxHeight: 440),
                child: preview()),
            const SizedBox(height: 20),
            StudioCard(child: trimTools()),
            if (!isImage) ...[
              const SizedBox(height: 20),
              StudioCard(child: audioTools())
            ],
          ]),
          settings: StudioCard(
              child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                Row(children: [
                  Icon(Icons.tune,
                      color: Theme.of(context).colorScheme.primary),
                  const SizedBox(width: 10),
                  Expanded(
                      child: Text('Export Settings',
                          style: Theme.of(context).textTheme.titleLarge))
                ]),
                const SizedBox(height: 22),
                if (!isImage && !isAudio)
                  StudioSelect(
                      label: 'Export',
                      value: exportMode,
                      values: const ['Video', 'Audio'],
                      onChanged: editable
                          ? (v) => change(() {
                                exportMode = v;
                                format = outputFormats.first;
                              })
                          : null),
                StudioSelect(
                    label: 'Container Format',
                    value: format,
                    values: outputFormats,
                    onChanged:
                        editable ? (v) => change(() => format = v) : null),
                if (!isImage && !isAudio && exportMode == 'Video') ...[
                  StudioSelect(
                      label: 'Output Resolution',
                      value: quality,
                      values: videoOutputResolutions,
                      onChanged:
                          editable ? (v) => change(() => quality = v) : null),
                  Text(
                      '2160p = 4K. Aspect ratio is preserved; enlarging a source does not restore detail.',
                      style: Theme.of(context).textTheme.labelSmall),
                  const SizedBox(height: 16),
                  filterTools(),
                  const SizedBox(height: 16),
                  SwitchListTile(
                      contentPadding: EdgeInsets.zero,
                      title: const Text('Mute audio'),
                      value: mute,
                      onChanged:
                          editable ? (v) => change(() => mute = v) : null),
                ],
                if (isImage) ...[
                  StudioSlider(
                      label: 'Quality Level',
                      value: imageQuality,
                      min: 10,
                      suffix: '${imageQuality.round()}%',
                      onChanged: editable
                          ? (v) => change(() => imageQuality = v)
                          : null),
                  StudioSlider(
                      label: 'Resolution Scaling',
                      value: scale * 100,
                      min: 10,
                      suffix: '${(scale * 100).round()}%',
                      onChanged: editable
                          ? (v) => change(() => scale = v / 100)
                          : null),
                ] else ...[
                  StudioSelect(
                      label: 'Audio Bitrate (kbps)',
                      value: '$bitrate',
                      values: const ['128', '192', '256', '320'],
                      onChanged: editable
                          ? (v) => change(() => bitrate = int.parse(v))
                          : null),
                  StudioSelect(
                      label: 'Channels',
                      value: '$channels',
                      values: const ['1', '2'],
                      onChanged: editable
                          ? (v) => change(() => channels = int.parse(v))
                          : null),
                  StudioSelect(
                      label: 'Sample Rate (Hz)',
                      value: '$sampleRate',
                      values: const ['44100', '48000'],
                      onChanged: editable
                          ? (v) => change(() => sampleRate = int.parse(v))
                          : null),
                ],
                const SizedBox(height: 10),
                TaskPanel(
                    task: task,
                    format: format,
                    exportLabel:
                        'Export ${isImage ? 'Processed Image' : isAudio || exportMode == 'Audio' ? 'Audio' : 'Trimmed Video'}',
                    onExport: editable ? export : null),
              ]))),
    ]);
  }
}

class _WavePainter extends CustomPainter {
  final List<double> peaks;
  final Color color;
  final double start, end, position, fadeIn, fadeOut;
  _WavePainter(this.peaks, this.color, this.start, this.end, this.position,
      this.fadeIn, this.fadeOut);
  @override
  void paint(Canvas canvas, Size size) {
    final line = Paint()
      ..color = color.withValues(alpha: .45)
      ..strokeWidth = 1;
    canvas.drawLine(
        Offset(0, size.height / 2), Offset(size.width, size.height / 2), line);
    if (peaks.isEmpty) return;
    canvas.drawRect(
        Rect.fromLTRB(start * size.width, 0, end * size.width, size.height),
        Paint()..color = color.withValues(alpha: .1));
    final paint = Paint()
      ..color = color
      ..strokeWidth = math.max(1, size.width / peaks.length - 1);
    for (var i = 0; i < peaks.length; i++) {
      final x = i / peaks.length * size.width, h = peaks[i] * size.height * .45;
      canvas.drawLine(Offset(x, size.height / 2 - h),
          Offset(x, size.height / 2 + h), paint);
    }
    final envelope = Path();
    for (var i = 0; i <= 100; i++) {
      final x = start + (end - start) * i / 100;
      final gain = (fadeIn > 0
              ? math.sin(((x - start) / fadeIn).clamp(0, 1) * math.pi / 2)
              : 1) *
          (fadeOut > 0
              ? math.sin(((end - x) / fadeOut).clamp(0, 1) * math.pi / 2)
              : 1);
      final y = size.height * (.95 - gain * .9);
      if (i == 0) {
        envelope.moveTo(x * size.width, y);
      } else {
        envelope.lineTo(x * size.width, y);
      }
    }
    canvas.drawPath(
        envelope,
        Paint()
          ..color = Colors.cyan
          ..strokeWidth = 2
          ..style = PaintingStyle.stroke);
    canvas.drawLine(
        Offset(position * size.width, 0),
        Offset(position * size.width, size.height),
        Paint()
          ..color = Colors.pink
          ..strokeWidth = 2);
  }

  @override
  bool shouldRepaint(covariant _WavePainter old) => true;
}
