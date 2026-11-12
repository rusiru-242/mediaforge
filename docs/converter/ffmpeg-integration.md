# MediaForge FFmpeg & FFprobe Integration Guide

## 1. Executive Overview
MediaForge executes native FFmpeg and FFprobe binaries as child operating system processes via Java's `ProcessBuilder`. All process arguments are passed as discrete token arrays—never concatenated into a shell invocation string—eliminating command injection vulnerabilities.

## 2. Binary Discovery & Configuration
Binary paths are configured in Spring Boot configuration (`application.yml`):
```yaml
app:
  converter:
    ffmpeg-path: ${FFMPEG_PATH:ffmpeg}
    ffprobe-path: ${FFPROBE_PATH:ffprobe}
    storage-dir: ${CONVERTER_STORAGE_DIR:storage/conversions}
    scratch-dir: ${CONVERTER_SCRATCH_DIR:storage/scratch}
    max-file-size-mb: 500
    timeout-minutes: 30
    worker-concurrency: 4
```
On Windows environments, the path automatically resolves to `C:\Users\REDTECH\AppData\Local\Microsoft\WinGet\Links\ffmpeg.exe` or PATH.
In Linux / Docker containers, it executes `/usr/bin/ffmpeg` installed via Alpine or Debian packages.

## 3. Real-Time Progress Protocol
MediaForge uses FFmpeg's `-progress pipe:1 -nostats` protocol to capture progress metrics directly from the process stdout without parsing complex log formatting.

Example stdout stream:
```text
frame=120
fps=29.97
stream_0_0_q=28.0
bitrate=2450.0kbits/s
total_size=843920
out_time_us=4003200
out_time_ms=4003200
out_time=00:00:04.003200
dup_frames=0
drop_frames=0
speed=1.82x
progress=continue
```

### Progress Calculation Formula
$$\text{Progress \%} = \min\left(99.0, \frac{\text{out\_time\_seconds}}{\text{totalDurationSeconds}} \times 100.0\right)$$
Upon receiving `progress=end`, the job is marked at 100%.

## 4. Video Transcoding Strategies
### Aspect-Ratio-Preserving Resolution Scaling
When downscaling video (e.g. from 1080p to 720p), MediaForge ensures:
1. No upscaling: If source resolution is smaller than target, scaling is bypassed.
2. Even dimension constraint: Video codecs like H.264 require dimensions divisible by 2.
MediaForge applies the filter:
```text
-vf scale=-2:720
```
This forces FFmpeg to compute width while preserving aspect ratio and rounding to the nearest multiple of 2.

### Codec Mapping Table
| Target Format | Video Codec | Audio Codec | Web Optimization Flags |
| :--- | :--- | :--- | :--- |
| **MP4** | `libx264` (`-preset medium -crf 23`) | `aac` (`-b:a 192k`) | `-movflags +faststart` |
| **WEBM** | `libvpx-vp9` (`-crf 30 -b:v 0`) | `libopus` (`-b:a 128k`) | Native web streaming |
| **MKV** | `libx264` / copy | `aac` / `flac` | Multi-track preserved |
| **MOV** | `libx264` | `aac` | QuickTime compatible |
| **AVI** | `mpeg4` | `mp3` | Legacy compatibility |

## 5. Audio Transcoding & Extraction
When converting audio files or extracting soundtracks from video files:
- Video stripping flag `-vn` removes video streams.
- Codecs: `libmp3lame` (MP3), `pcm_s16le` (WAV), `flac` (FLAC), `aac` (AAC), `libopus` (OGG).
- Configurable audio bitrates: 64k to 320k.
- Configurable sample rates: 44.1 kHz, 48.0 kHz, 96.0 kHz.

## 6. Process Cancellation & Resource Reclamation
1. Each active process is tracked by Job UUID in `FFmpegProcessExecutor`.
2. When a cancellation request arrives (`POST /api/v1/jobs/{id}/cancel`):
   - `process.destroyForcibly()` is invoked immediately.
   - Any incomplete scratch files (`.tmp.mp4`, `.tmp.mp3`) are securely wiped.
   - Database record transitions to `CANCELLED`.
