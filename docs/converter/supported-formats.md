# Supported Conversion Formats Matrix

## 1. Video Formats
| Input Formats | Target Output Formats | Available Resolutions | Codecs | Features |
| :--- | :--- | :--- | :--- | :--- |
| `mp4`, `webm`, `mkv`, `mov`, `avi`, `flv`, `wmv` | `mp4`, `webm`, `mkv`, `mov`, `avi` | Source, 1080p, 720p, 480p, 360p | H.264 (`libx264`), VP9 (`libvpx-vp9`), MPEG-4 | Audio track stripping, web streaming faststart, aspect ratio locking |

## 2. Audio Formats & Extraction
| Input Formats | Target Output Formats | Bitrate Options | Sample Rates | Features |
| :--- | :--- | :--- | :--- | :--- |
| `mp3`, `wav`, `flac`, `aac`, `m4a`, `ogg`, `wma` + Video files | `mp3`, `wav`, `flac`, `aac`, `m4a`, `ogg` | 64k, 128k, 192k, 256k, 320k | 44.1 kHz, 48.0 kHz, 96.0 kHz | Direct soundtrack extraction from video (`-vn`), lossless compression |

## 3. Image Formats
| Input Formats | Target Output Formats | Compression Quality | Resizing | Rotation |
| :--- | :--- | :--- | :--- | :--- |
| `png`, `jpg`, `jpeg`, `webp`, `gif`, `bmp`, `tiff`, `avif` | `webp`, `png`, `jpg`, `avif` | 50%, 70%, 85%, 95% | Preset (1080p, 720p, 800x600) or Custom (width x height) | 0°, 90°, 180°, 270° |

## 4. Batch Processing
- Parallel execution of multi-file conversions across video, audio, and image formats.
- Consolidated download as a compressed ZIP archive (`.zip`).
