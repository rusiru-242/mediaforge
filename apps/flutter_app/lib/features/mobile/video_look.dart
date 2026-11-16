const videoLooks = {
  'original': 'Original',
  'vivid': 'Vivid',
  'vivid-warm': 'Vivid Warm',
  'vivid-cool': 'Vivid Cool',
  'dramatic': 'Dramatic',
  'mono': 'Mono',
};
const clipEffects = {
  'reverb': 'Reverb',
  'echo': 'Echo',
  'bass': 'Bass Boost',
  'treble': 'Treble Boost',
  'warmth': 'Warmth'
};

// Same preset values as web/src/utils/imageFilters.ts. Native export uses a
// normalized 4x4 matrix; Flutter uses this equivalent 0..255 color matrix.
List<double> videoLookMatrix(String name) {
  final p = switch (name) {
    'vivid' => [.03, 1.12, 1.45, 0.0],
    'vivid-warm' => [.03, 1.1, 1.3, .3],
    'vivid-cool' => [.02, 1.1, 1.3, -.3],
    'dramatic' => [-.04, 1.4, .8, 0.0],
    'mono' => [0.0, 1.15, 0.0, 0.0],
    _ => [0.0, 1.0, 1.0, 0.0],
  };
  return imageAdjustmentMatrix(
      brightness: p[0], contrast: p[1], saturation: p[2], warmth: p[3]);
}

List<double> imageAdjustmentMatrix(
    {double brightness = 0,
    double contrast = 1,
    double saturation = 1,
    double warmth = 0}) {
  final p = [brightness, contrast, saturation, warmth];
  final m = List<double>.filled(20, 0);
  m[18] = 1;
  const luma = [.2126, .7152, .0722];
  for (var row = 0; row < 3; row++) {
    final tint = row == 0
        ? 1 + p[3] * .15
        : row == 2
            ? 1 - p[3] * .15
            : 1.0;
    for (var col = 0; col < 3; col++) {
      m[row * 5 + col] =
          (luma[col] * (1 - p[2]) + (row == col ? p[2] : 0)) * p[1] * tint;
    }
    m[row * 5 + 4] = (.5 * (1 - p[1]) + p[0]) * tint * 255;
  }
  return m;
}

const imageLookSettings = {
  'original': [0.0, 1.0, 1.0, 0.0],
  'vivid': [.03, 1.12, 1.45, 0.0],
  'vivid-warm': [.03, 1.1, 1.3, .3],
  'vivid-cool': [.02, 1.1, 1.3, -.3],
  'dramatic': [-.04, 1.4, .8, 0.0],
  'mono': [0.0, 1.15, 0.0, 0.0],
};
