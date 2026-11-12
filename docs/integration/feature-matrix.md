# MediaForge Cross-Platform Feature Matrix

This matrix documents the availability, engine source, and capabilities of features across all supported MediaForge target platforms.

| Feature Area | Sub-Feature | Web Client | Windows Desktop | macOS Desktop | Linux Desktop | Android Mobile | iOS Mobile |
| :--- | :--- | :---: | :---: | :---: | :---: | :---: | :---: |
| **Media Downloader** | Direct Stream Download (HTTP/S) | Yes (Backend) | Yes (Local) | Yes (Local) | Yes (Local) | Yes (Local) | Yes (Local) |
| | Stream Metadata Inspection | Yes | Yes | Yes | Yes | Yes | Yes |
| | Real-Time Speed (KB/s, MB/s) | Yes | Yes | Yes | Yes | Yes | Yes |
| | Download ETA & Byte Counter | Yes | Yes | Yes | Yes | Yes | Yes |
| | Download Retry on Failure | Yes | Yes | Yes | Yes | Yes | Yes |
| | Active Stream Cancellation | Yes | Yes | Yes | Yes | Yes | Yes |
| **Video Conversion** | MP4, MKV, WebM, MOV, AVI | Yes | Yes | Yes | Yes | Yes | Yes |
| | Quality Presets (High, Balanced, Small) | Yes | Yes | Yes | Yes | Yes | Yes |
| | Custom Resolutions (1080p, 720p, 480p) | Yes | Yes | Yes | Yes | Yes | Yes |
| | Video Bitrate Control | Yes | Yes | Yes | Yes | Yes | Yes |
| | Audio Track Stripping (`-an`) | Yes | Yes | Yes | Yes | Yes | Yes |
| **Audio Conversion** | MP3, WAV, AAC, FLAC, M4A, OGG | Yes | Yes | Yes | Yes | Yes | Yes |
| | Audio Quality Presets (320k, 192k, 128k) | Yes | Yes | Yes | Yes | Yes | Yes |
| | Sample Rate (48kHz, 44.1kHz, etc.) | Yes | Yes | Yes | Yes | Yes | Yes |
| | Audio Extraction from Video | Yes | Yes | Yes | Yes | Yes | Yes |
| **Image Conversion** | WebP, JPG, PNG, AVIF | Yes | Yes | Yes | Yes | Yes | Yes |
| | Image Quality Presets (90%, 75%, 50%) | Yes | Yes | Yes | Yes | Yes | Yes |
| | Image Resizing & Dimensions | Yes | Yes | Yes | Yes | Yes | Yes |
| | Image Rotation | Yes | Yes | Yes | Yes | Yes | Yes |
| **Batch Processing** | Multi-File Drag & Drop | Yes | Yes | Yes | Yes | Yes (Picker) | Yes (Picker) |
| | Per-File Compatible Output Formats | Yes | Yes | Yes | Yes | Yes | Yes |
| | Quick Apply: Extract All to MP3 | Yes | Yes | Yes | Yes | Yes | Yes |
| | Quick Apply: All Images to WebP | Yes | Yes | Yes | Yes | Yes | Yes |
| | Individual Item Progress Tracking | Yes | Yes | Yes | Yes | Yes | Yes |
| | Per-Item Retry on Failure | Yes | Yes | Yes | Yes | Yes | Yes |
| | ZIP Archive Bundle Download | Yes | N/A (Direct) | N/A (Direct) | N/A (Direct) | N/A (Direct) | N/A (Direct) |
| **File Safety** | Filename Collision Avoidance | Yes | Yes | Yes | Yes | Yes | Yes |
| | Partial File Cleanup on Cancel | Yes | Yes | Yes | Yes | Yes | Yes |
| | Ephemeral / Zero-Retention Policy | Yes (24h) | Local Only | Local Only | Local Only | Local Only | Local Only |
| **Offline Independence** | Zero Spring Boot Dependency | No (Uses API) | Yes (100% Offline) | Yes (100% Offline) | Yes (100% Offline) | Yes (100% Offline) | Yes (100% Offline) |
| | Zero Database Dependency | Yes | Yes | Yes | Yes | Yes | Yes |
| | Zero User Account Dependency | Yes | Yes | Yes | Yes | Yes | Yes |
