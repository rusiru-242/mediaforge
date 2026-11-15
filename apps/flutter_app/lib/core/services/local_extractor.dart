part of 'local_media_engine.dart';

Future<Uri> _publicUrl(String value) async {
  final uri = Uri.tryParse(value.trim());
  if (uri == null ||
      !['http', 'https'].contains(uri.scheme) ||
      uri.host.isEmpty ||
      uri.userInfo.isNotEmpty ||
      (uri.hasPort && ![80, 443].contains(uri.port))) {
    throw const BackendException('Enter a public HTTP or HTTPS media URL.');
  }
  final addresses = await InternetAddress.lookup(uri.host)
      .timeout(const Duration(seconds: 15));
  if (addresses.isEmpty) {
    throw const BackendException(
        'The source host could not be reached. Check your internet connection.');
  }
  for (final address in addresses) {
    final b = address.rawAddress;
    final s = address.address.toLowerCase();
    final blocked = address.isLoopback ||
        address.isLinkLocal ||
        address.isMulticast ||
        s == '::' ||
        s.startsWith('fc') ||
        s.startsWith('fd') ||
        s.startsWith('::ffff:') ||
        (b.length == 4 &&
            (b[0] == 0 ||
                b[0] == 10 ||
                b[0] == 127 ||
                b[0] >= 224 ||
                b[0] == 169 && b[1] == 254 ||
                b[0] == 172 && b[1] >= 16 && b[1] <= 31 ||
                b[0] == 192 && b[1] == 168 ||
                b[0] == 100 && b[1] >= 64 && b[1] <= 127));
    if (blocked) {
      throw const BackendException(
          'Private or internal network URLs are not supported.');
    }
  }
  if (uri.host == 'youtu.be' ||
      uri.host.endsWith('.youtube.com') ||
      uri.host == 'youtube.com') {
    final query = Map<String, String>.from(uri.queryParameters)
      ..remove('list')
      ..remove('index')
      ..remove('start_radio');
    return uri.replace(
        queryParameters: query.isEmpty ? null : query, fragment: '');
  }
  return uri.replace(fragment: '');
}

List<String> _extractorArguments(LocalMediaEngine engine) => [
      '--ignore-config',
      '--no-playlist',
      '--no-cookies',
      '--no-cache-dir',
      '--no-plugin-dirs',
      '--no-warnings',
      '--max-filesize',
      '2G',
      '--socket-timeout',
      '20',
      '--retries',
      '2',
      '--extractor-retries',
      '1',
      '--ffmpeg-location',
      engine.tools.directory
    ];

Future<Json> analyzeSource(
    LocalMediaEngine engine, String value, LocalMediaJob owner) async {
  final uri = await _publicUrl(value);
  final text = await engine.run(
      engine.tools.extractor,
      [
        ..._extractorArguments(engine),
        '--skip-download',
        '--dump-single-json',
        '--',
        uri.toString()
      ],
      job: owner,
      timeout: const Duration(seconds: 90));
  final source = jsonDecode(text) as Map;
  if (source['has_drm'] == true || source['is_live'] == true) {
    throw const BackendException(
        'DRM-protected media and live streams are not supported.');
  }
  final formats =
      (source['formats'] as List? ?? [source]).whereType<Map>().toList();
  final video = formats
      .where((f) => f['vcodec'] != null && f['vcodec'] != 'none')
      .toList();
  final hasAudio =
      formats.any((f) => f['acodec'] != null && f['acodec'] != 'none');
  final heights = video
      .map((f) => f['height'])
      .whereType<num>()
      .map((n) => n.toInt())
      .where((n) => n > 0)
      .toSet();
  final maxHeight = heights.isEmpty ? 0 : heights.reduce(math.max);
  final qualities = <String>{
    if (maxHeight > 0) '${maxHeight}p',
    for (final h in [2160, 1440, 1080, 720, 480, 360, 240])
      if (maxHeight >= h) '${h}p'
  };
  if (qualities.isEmpty && video.isNotEmpty) qualities.add('source');
  final options = <Json>[
    for (final f in LocalMediaEngine.videoFormats)
      if (video.isNotEmpty)
        for (final q in qualities)
          {
            'format': f,
            'quality': q,
            'label': '$q • processed output',
            'nativeStream': false,
            'requiresConversion': true
          },
    for (final f in ['mp3', 'm4a', 'wav'])
      if (hasAudio)
        for (final q in f == 'mp3'
            ? ['320 kbps', '256 kbps', '192 kbps', '128 kbps']
            : ['Source audio'])
          {
            'format': f,
            'quality': q,
            'label': 'Audio only',
            'nativeStream': false,
            'requiresConversion': true
          },
  ];
  if (options.isEmpty) {
    throw const BackendException(
        'The source did not expose usable public media streams. It may require login or be unavailable.');
  }
  return {
    'success': true,
    'url': uri.toString(),
    'platform': source['extractor_key'] ?? source['extractor'],
    'title': source['title'] ?? 'MediaForge media',
    'duration': source['duration'],
    'thumbnail': source['thumbnail'],
    'hasAudio': hasAudio,
    'mediaType': video.isEmpty ? 'AUDIO' : 'VIDEO',
    'resolution': source['width'] != null && source['height'] != null
        ? '${source['width']}x${source['height']}'
        : null,
    'fileSize': source['filesize'],
    'availableFormats': options,
    'availableQualities': qualities.toList(),
    'directDownloadSupported': true
  };
}

Future<Json> extractorDownload(
    LocalMediaEngine engine, LocalMediaJob job, Directory directory) async {
  final metadata = await analyzeSource(engine, '${job.options['url']}', job);
  final video =
      LocalMediaEngine.videoFormats.contains(job.options['outputFormat']);
  final quality =
      '${job.options['targetResolution'] ?? job.options['selectedQuality'] ?? 'source'}';
  final match = RegExp(r'^(\d{2,4})p').firstMatch(quality);
  final heightFilter = match == null ? '' : '[height<=${match.group(1)}]';
  if (video && match != null) {
    job.options['targetResolution'] = '${match.group(1)}p';
  }
  final selector = video
      ? 'bestvideo$heightFilter+bestaudio/best[vcodec!=none]$heightFilter'
      : 'bestaudio/best[acodec!=none]';
  job.stage = 'Downloading media';
  await engine.run(
      engine.tools.extractor,
      [
        ..._extractorArguments(engine),
        '--newline',
        '--progress',
        '--progress-template',
        'download:MF:%(progress.downloaded_bytes)s:%(progress.total_bytes_estimate)s',
        '-f',
        selector,
        '--merge-output-format',
        'mkv',
        '-o',
        p.join(directory.path, 'source.%(ext)s'),
        '--',
        '${metadata['url']}'
      ],
      job: job,
      timeout: const Duration(hours: 1), onLine: (line) {
    if (line.startsWith('MF:')) {
      final parts = line.split(':');
      final downloaded = double.tryParse(parts.elementAtOrNull(1) ?? ''),
          total = double.tryParse(parts.elementAtOrNull(2) ?? '');
      if (downloaded != null && total != null && total > 0) {
        job.progress =
            math.max(job.progress, (downloaded / total).clamp(0, 1) * 50);
      }
    }
  });
  final sources = await directory
      .list()
      .where((f) =>
          f is File &&
          p.basename(f.path).startsWith('source.') &&
          !f.path.endsWith('.part') &&
          !f.path.endsWith('.ytdl') &&
          !RegExp(r'\.f\d+\.').hasMatch(f.path))
      .toList();
  if (sources.length != 1) {
    throw const BackendException(
        'The extractor did not produce one complete media file.');
  }
  final path = sources.single.path;
  final probe = await engine.probe(path, job: job);
  final streams = (probe['streams'] as List).cast<Map>();
  if (video && !streams.any((s) => s['codec_type'] == 'video')) {
    throw const BackendException(
        'The source returned audio only for a video request.');
  }
  if (metadata['hasAudio'] == true &&
      !streams.any((s) => s['codec_type'] == 'audio')) {
    throw const BackendException(
        'The source audio stream could not be downloaded or merged.');
  }
  return {'path': path, 'title': metadata['title']};
}
