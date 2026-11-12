# FFmpeg Desktop Integration & Licensing Guide

## 1. Overview

MediaForge Desktop uses native `ffmpeg` and `ffprobe` processes to execute offline video transcoding, audio conversion, audio extraction from video, and image manipulation.

---

## 2. Binary Detection & Configuration

1. **Automatic Resolution**: By default, `FfmpegService` searches for `ffmpeg` and `ffprobe` within the system `PATH`.
2. **Custom Executable Paths**: Users can override the binary location via the GUI in **Settings -> FFmpeg & FFprobe Engine**.
   - Example (Windows): `C:\Tools\ffmpeg\bin\ffmpeg.exe`
   - Example (macOS): `/opt/homebrew/bin/ffmpeg`
   - Example (Linux): `/usr/bin/ffmpeg`
3. **Startup Verification**: The Settings interface offers a **Test Executable Paths** button to verify connectivity and exit code 0 execution (`-version`).

---

## 3. Progress Tracking Architecture

FFmpeg writes its encoding diagnostics and frame statistics to standard error (`stderr`). MediaForge tracks encoding progress in real time by scanning stderr chunks using regular expressions:

```dart
final timeMatch = RegExp(r'time=(\d+):(\d+):(\d+\.\d+)').firstMatch(line);
if (timeMatch != null && totalDuration != null && totalDuration > 0) {
  final h = int.parse(timeMatch.group(1)!);
  final m = int.parse(timeMatch.group(2)!);
  final s = double.parse(timeMatch.group(3)!);
  final elapsed = h * 3600 + m * 60 + s;
  final progress = (elapsed / totalDuration).clamp(0.0, 1.0);
  onProgress(progress);
}
```

---

## 4. Supported Formats & Codecs

| Processing Suite | Input Formats | Target Formats | Primary Codecs |
|---|---|---|---|
| **Video Conversion** | MP4, MKV, WEBM, MOV, AVI, FLV, WMV, M4V | MP4, WEBM, MKV, MOV, AVI | `libx264`, `libvpx-vp9`, `mpeg4`, `aac`, `libopus`, `mp3` |
| **Audio Conversion** | MP3, WAV, AAC, FLAC, M4A, OGG, WMA, OPUS | MP3, WAV, AAC, FLAC, M4A, OGG | `libmp3lame`, `pcm_s16le`, `aac`, `flac`, `libvorbis` |
| **Video-to-Audio** | MP4, MKV, MOV, WEBM | MP3, WAV, AAC, FLAC | `-vn` extraction with `libmp3lame` or target codec |
| **Image Conversion** | JPG, JPEG, PNG, WEBP, GIF, BMP, TIFF, AVIF | JPG, PNG, WEBP, AVIF | `png`, `libaom-av1`, JPEG quality scaling |

---

## 5. Licensing Obligations & Distribution

- FFmpeg is licensed under the **LGPL version 2.1+** or **GPL version 2+** (depending on compiled dependencies like `libx264`, `libx265`).
- MediaForge executes FFmpeg as an independent external process via standard input/output streams and does not link directly with FFmpeg C libraries.
- If distributing bundled binaries, distributors must comply with FFmpeg's license by providing build configurations, license texts, or source code for the FFmpeg build used.

