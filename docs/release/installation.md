# MediaForge Installation & Setup Guide

**Version:** 1.0.0  
**Supported Platforms:** Windows, macOS, Linux, Android, iOS, Docker

---

## 1. System Requirements & Prerequisites

### Server & Backend Requirements
- **Operating System:** Linux (Ubuntu 22.04+ / Debian 12+), macOS 13+, or Windows 10/11
- **Java Runtime:** OpenJDK 21 LTS (Temurin, Corretto, or Microsoft Build)
- **Media Engine:** FFmpeg & FFprobe 6.0+ on system `PATH`
- **Memory:** 1 GB minimum, 2 GB+ recommended for concurrent conversions
- **Disk:** Ephemeral scratch space (at least 5 GB recommended for temporary files)

### Desktop Client Requirements
- **Windows:** Windows 10 (Build 19041+) or Windows 11 (64-bit)
- **macOS:** macOS 12 (Monterey) or newer (Apple Silicon or Intel x86_64)
- **Linux:** Ubuntu 20.04+, Fedora 38+, Arch Linux, or Debian 11+ with GTK 3.0+
- **Offline Processing:** FFmpeg on system `PATH` (or configured in app Settings)

### Mobile Requirements
- **Android:** Android 8.0 (Oreo / API Level 26) or newer
- **iOS:** iOS 14.0 or newer

---

## 2. Docker Production Installation (Recommended for Web & API)

MediaForge provides a turnkey production Docker Compose configuration:

```bash
# Clone the repository
git clone https://github.com/rusiru-242/mediaforge.git
cd mediaforge

# Launch backend and web portal with resource limits and healthchecks
docker compose -f docker-compose.prod.yml up -d
```

- **Web Portal:** Access at `http://localhost:3000`
- **Backend Health Check:** Access at `http://localhost:8080/api/v1/health`
- **Swagger OpenAPI Docs:** Access at `http://localhost:8080/swagger-ui.html`

---

## 3. Standalone Backend JAR Execution

```bash
# Build or download mediaforge-backend-1.0.0.jar
java -Dspring.profiles.active=prod \
     -Xms512m -Xmx1536m \
     -jar mediaforge-backend-1.0.0.jar
```

### Environment Configuration
| Variable | Default | Purpose |
| :--- | :--- | :--- |
| `PORT` | `8080` | HTTP listen port |
| `CORS_ALLOWED_ORIGINS` | `http://localhost:3000` | Whitelist for web portal |
| `STORAGE_LOCAL_PATH` | `./uploads` | Ephemeral media directory |
| `STORAGE_RETENTION_HOURS` | `24` | Auto-purge file lifetime |
| `FFMPEG_PATH` | `ffmpeg` | Path to FFmpeg executable |
| `CONVERTER_MAX_CONCURRENT_JOBS`| `4` | Max parallel transcode processes |

---

## 4. Windows Desktop Installation

1. Download `MediaForge-Windows-Portable-1.0.0.zip` from GitHub Releases.
2. Extract the archive to your preferred application directory (e.g., `C:\Program Files\MediaForge` or user folder).
3. Ensure FFmpeg is installed and added to your Windows PATH:
   - Download FFmpeg from [gyan.dev](https://www.gyan.dev/ffmpeg/builds/) or install via winget:
     ```powershell
     winget install Gyan.FFmpeg
     ```
4. Double-click `mediaforge_desktop.exe` to launch.
5. All conversions run 100% offline and outputs are saved to your chosen destination folder.

---

## 5. macOS Desktop Installation

1. Download `MediaForge-macOS-1.0.0.zip`.
2. Extract and drag `MediaForge.app` into your `/Applications` directory.
3. If necessary, allow the application in **System Settings > Privacy & Security**.
4. Install FFmpeg using Homebrew:
   ```bash
   brew install ffmpeg
   ```
5. Launch MediaForge from Spotlight or Launchpad.

---

## 6. Linux Desktop Installation

1. Download `MediaForge-Linux-x64-1.0.0.tar.gz`.
2. Extract the package:
   ```bash
   tar -xzf MediaForge-Linux-x64-1.0.0.tar.gz -C ~/mediaforge
   ```
3. Install required runtime libraries and FFmpeg:
   ```bash
   sudo apt-get update && sudo apt-get install -y ffmpeg libgtk-3-0 liblzma5
   ```
4. Run the executable:
   ```bash
   ~/mediaforge/mediaforge_desktop
   ```

---

## 7. Android Mobile Installation

1. Download `MediaForge-Android-1.0.0.apk` from GitHub Releases.
2. Transfer the APK to your Android device or download directly through a mobile browser.
3. Open the APK and enable "Install from unknown sources" if prompted by Android security settings.
4. Complete installation and grant storage/media permissions when requested.
