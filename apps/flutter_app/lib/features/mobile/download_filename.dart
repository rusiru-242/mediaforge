import 'dart:convert';

/// Filesystem-safe names retain Unicode titles and the selected output quality.
String downloadFilename(String? title, String? quality, String format) {
  String clean(String value, int maxBytes) {
    var text = value
        .replaceAll(RegExp(r'[\x00-\x1f\x7f<>:"/\\|?*]'), '_')
        .replaceAll(RegExp(r'\s+'), ' ')
        .trim()
        .replaceAll(RegExp(r'^[. ]+|[. ]+$'), '');
    final runes = text.runes.toList();
    while (utf8.encode(String.fromCharCodes(runes)).length > maxBytes) {
      runes.removeLast();
    }
    return String.fromCharCodes(runes).trim();
  }

  var name = clean(title ?? '', 160);
  if (name.isEmpty) name = 'MediaForge Video';
  if (RegExp(r'^(CON|PRN|AUX|NUL|COM[1-9]|LPT[1-9])(?:\.|$)',
          caseSensitive: false)
      .hasMatch(name)) {
    name = 'MediaForge_$name';
  }
  final rawQuality = quality ?? '';
  final resolution = RegExp(r'\d{2,4}p', caseSensitive: false)
      .firstMatch(rawQuality)
      ?.group(0)
      ?.toLowerCase();
  final suffix = resolution ?? clean(rawQuality, 32);
  if (!RegExp(r'^[a-z0-9]{2,5}$').hasMatch(format)) {
    throw ArgumentError('Invalid output extension.');
  }
  return '$name${suffix.isEmpty ? '' : ' ($suffix)'}.$format';
}
