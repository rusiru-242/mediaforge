# MediaForge Conversion Engine Security Architecture

## 1. Threat Matrix & Defense Strategy

| Threat Vector | Attack Scenario | MediaForge Defense Implementation |
| :--- | :--- | :--- |
| **Command Injection** | Attacker inputs filename containing `; rm -rf /` or backticks | Process execution uses tokenized arrays via `ProcessBuilder(List<String>)`. Shell concatenation is forbidden. |
| **Executable Upload** | User uploads Windows `.exe` (`MZ`), ELF binary, or bash script disguised as `.mp4` | Magic byte file signature inspection verifies the first 512 bytes. All PE (`4D 5A`), ELF (`7F 45 4C 46`), and script headers (`#!`, `<?php`) are rejected immediately before disk staging. |
| **Path Traversal** | Attacker inputs `../../etc/passwd` or `..\Windows\System32` in filenames | Stored names are sanitized using random UUIDs. Paths are resolved using `toRealPath()` and verified to reside strictly within configured base storage roots. |
| **Decompression Bomb (Zip/Image Bomb)** | Malicious image file declaring 100,000 x 100,000 dimensions causing JVM OutOfMemoryError | Header inspection via `MediaProbeService` verifies pixel dimensions before memory allocation. Images with dimensions > 16,384px or total pixels > 100,000,000 are rejected upfront. |
| **Denial of Service (Infinite Process)** | Malformed video hangs FFmpeg indefinitely consuming 100% CPU | Hard 30-minute execution timeout per process. Unresponsive processes are terminated via `destroyForcibly()`. Worker concurrency is bounded via Spring `ThreadPoolTaskExecutor`. |
| **Disk Exhaustion** | Accumulation of uploaded and converted files filling server storage | Automated scheduled background task reaps media files and scratch artifacts older than 24 hours. |
| **SSRF & Source Abuse** | Attempting conversion of internal host URLs | Downloader URL validation blocks private/loopback IP addresses (`127.0.0.1`, `10.0.0.0/8`, `169.254.0.0/16`). |

## 2. Magic Byte Inspection Implementation
The file upload validator checks byte arrays against verified signatures:
- **JPEG**: `FF D8 FF`
- **PNG**: `89 50 4E 47 0D 0A 1A 0A`
- **GIF**: `47 49 46 38`
- **WEBP**: `52 49 46 46 ... 57 45 42 50`
- **MP4 / MOV**: `... 66 74 79 70`
- **MKV / WEBM**: `1A 45 DF A3`
- **MP3**: `49 44 33` or `FF FB` / `FF F3`
- **WAV**: `52 49 46 46 ... 57 41 56 45`

Rejected header patterns:
- Windows Executables: `4D 5A` (`MZ`)
- Linux Executables: `7F 45 4C 46` (`.ELF`)
- Shell scripts: `23 21` (`#!`)
- PHP scripts: `3C 3F 70 68 70` (`<?php`)

## 3. Storage Isolation
- Scratch storage is partitioned from permanent output storage.
- File system permissions prevent execution (`chmod -R a-x /app/storage`).
- Container runs as non-root user `mediaforge:mediaforge`.
