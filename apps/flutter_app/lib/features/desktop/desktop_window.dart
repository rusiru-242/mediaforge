import 'dart:ui';

/// Work-area measurements are logical pixels, already adjusted for Windows DPI.
Size initialDesktopSize(Size workArea) => Size(
      (workArea.width - 48).clamp(320, 1280),
      (workArea.height - 48).clamp(320, 800),
    );
