package com.mediaforge.backend.downloader.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.mediaforge.backend.converter.service.FFmpegProcessExecutor;
import com.mediaforge.backend.downloader.model.DownloadProgress;
import com.mediaforge.backend.downloader.model.DownloadTask;
import com.mediaforge.backend.downloader.model.DownloadedMedia;
import com.mediaforge.backend.downloader.model.MediaFormatOption;
import com.mediaforge.backend.downloader.model.MediaMetadata;
import com.mediaforge.backend.downloader.model.ProgressCallback;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.io.BufferedReader;
import java.io.File;
import java.io.IOException;
import java.io.InputStreamReader;
import java.net.URI;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.TimeUnit;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import java.util.stream.Collectors;
import java.util.stream.Stream;

@Service
public class YtDlpProcessExecutor {

    private static final Logger log = LoggerFactory.getLogger(YtDlpProcessExecutor.class);

    private static final Pattern PROGRESS_PERCENT_PATTERN = Pattern.compile("\\[download\\]\\s+([0-9.]+)%");
    private static final Pattern PROGRESS_SPEED_PATTERN = Pattern.compile("at\\s+([0-9.]+\\S+/s)");
    private static final Pattern PROGRESS_ETA_PATTERN = Pattern.compile("ETA\\s+([0-9:]+)");

    private final ObjectMapper objectMapper;
    private final FFmpegProcessExecutor ffmpegExecutor;
    private final Map<UUID, Process> activeProcesses = new ConcurrentHashMap<>();

    @Value("${app.downloader.ytdlp-path:}")
    private String configuredYtDlpPath;

    @Value("${app.downloader.ytdlp-timeout-seconds:60}")
    private int timeoutSeconds = 60;

    private List<String> resolvedExecutableCommand;

    public YtDlpProcessExecutor(ObjectMapper objectMapper, FFmpegProcessExecutor ffmpegExecutor) {
        this.objectMapper = objectMapper != null ? objectMapper : new ObjectMapper();
        this.ffmpegExecutor = ffmpegExecutor;
    }

    public synchronized List<String> getExecutableCommand() {
        if (resolvedExecutableCommand != null) {
            return resolvedExecutableCommand;
        }

        // 1. Configured custom path
        if (configuredYtDlpPath != null && !configuredYtDlpPath.isBlank()) {
            if (checkCommand(List.of(configuredYtDlpPath, "--version"))) {
                resolvedExecutableCommand = List.of(configuredYtDlpPath);
                return resolvedExecutableCommand;
            }
        }

        // 2. Python user scripts path on Windows
        String userHome = System.getProperty("user.home");
        if (userHome != null) {
            Path winScriptPath = Paths.get(userHome, "AppData", "Roaming", "Python", "Python313", "Scripts", "yt-dlp.exe");
            if (Files.exists(winScriptPath) && checkCommand(List.of(winScriptPath.toString(), "--version"))) {
                resolvedExecutableCommand = List.of(winScriptPath.toString());
                return resolvedExecutableCommand;
            }
        }

        // 3. System PATH yt-dlp
        if (checkCommand(List.of("yt-dlp", "--version"))) {
            resolvedExecutableCommand = List.of("yt-dlp");
            return resolvedExecutableCommand;
        }

        // 4. Python module execution
        if (checkCommand(List.of("python", "-m", "yt_dlp", "--version"))) {
            resolvedExecutableCommand = List.of("python", "-m", "yt_dlp");
            return resolvedExecutableCommand;
        }

        // Default fallback command
        resolvedExecutableCommand = List.of("yt-dlp");
        return resolvedExecutableCommand;
    }

    private boolean checkCommand(List<String> cmd) {
        try {
            ProcessBuilder pb = new ProcessBuilder(cmd);
            Process p = pb.start();
            boolean finished = p.waitFor(4, TimeUnit.SECONDS);
            return finished && p.exitValue() == 0;
        } catch (Exception e) {
            return false;
        }
    }

    public boolean isAvailable() {
        List<String> cmd = new ArrayList<>(getExecutableCommand());
        cmd.add("--version");
        return checkCommand(cmd);
    }

    /**
     * Extracts rich metadata using yt-dlp capability inspection.
     */
    public MediaMetadata extractMetadata(URI uri) {
        List<String> cmd = new ArrayList<>(getExecutableCommand());
        cmd.add("-J");
        cmd.add("--no-playlist");
        cmd.add(uri.toString());

        log.info("Inspecting media stream metadata via extractor: {}", uri);
        StringBuilder stdout = new StringBuilder();
        StringBuilder stderr = new StringBuilder();

        try {
            ProcessBuilder pb = new ProcessBuilder(cmd);
            Process process = pb.start();

            Thread outThread = new Thread(() -> readStream(process.getInputStream(), stdout));
            Thread errThread = new Thread(() -> readStream(process.getErrorStream(), stderr));
            outThread.start();
            errThread.start();

            boolean finished = process.waitFor(timeoutSeconds, TimeUnit.SECONDS);
            if (!finished) {
                process.destroyForcibly();
                log.warn("Extractor inspection timed out after {}s for URL {}", timeoutSeconds, uri);
                MediaMetadata meta = new MediaMetadata();
                meta.setMessage("Media stream inspection timed out while probing source server.");
                return meta;
            }

            outThread.join(2000);
            errThread.join(2000);

            if (process.exitValue() == 0 && stdout.length() > 0) {
                return parseExtractorJson(stdout.toString(), uri);
            } else {
                String cleanError = sanitizeExtractorError(stderr.toString());
                log.warn("Extractor returned exit code {} for {}: {}", process.exitValue(), uri, cleanError);
                MediaMetadata meta = new MediaMetadata();
                meta.setMessage(cleanError);
                return meta;
            }

        } catch (Exception e) {
            log.error("Failed to run media extractor for {}: {}", uri, e.getMessage());
            MediaMetadata meta = new MediaMetadata();
            meta.setMessage("Extraction failure: " + e.getMessage());
            return meta;
        }
    }

    private MediaMetadata parseExtractorJson(String jsonStr, URI uri) {
        try {
            JsonNode root = objectMapper.readTree(jsonStr);

            String title = root.path("title").asText("Media Stream");
            String uploader = root.path("uploader").asText(root.path("channel").asText(null));
            String thumbnail = root.path("thumbnail").asText(null);
            double duration = root.path("duration").asDouble(0.0);
            String ext = root.path("ext").asText("mp4");

            MediaMetadata metadata = new MediaMetadata();
            metadata.setTitle(title);
            metadata.setSourceName(uploader != null ? "YouTube (" + uploader + ")" : "YouTube");
            metadata.setMediaType("VIDEO");
            metadata.setMimeType("video/mp4");
            metadata.setContainerFormat(ext);
            metadata.setThumbnailUri(thumbnail);
            if (duration > 0) {
                metadata.setDurationSeconds(duration);
            }

            JsonNode formatsNode = root.path("formats");
            Set<Integer> availableHeights = new TreeSet<>(Comparator.reverseOrder());
            long maxFilesize = 0;
            boolean hasDrm = false;

            if (formatsNode.isArray()) {
                for (JsonNode fmt : formatsNode) {
                    if (fmt.path("has_drm").asBoolean(false)) {
                        hasDrm = true;
                    }
                    int height = fmt.path("height").asInt(0);
                    if (height > 0) {
                        availableHeights.add(height);
                    }
                    long fs = fmt.path("filesize").asLong(fmt.path("filesize_approx").asLong(0));
                    if (fs > maxFilesize) {
                        maxFilesize = fs;
                    }
                }
            }

            if (maxFilesize > 0) {
                metadata.setFileSize(maxFilesize);
            }

            // DRM check
            if (hasDrm && availableHeights.isEmpty()) {
                metadata.setMessage("This media stream is protected by DRM (Digital Rights Management) and cannot be downloaded directly.");
                return metadata;
            }

            // Default heights if standard YouTube video
            if (availableHeights.isEmpty()) {
                availableHeights.addAll(List.of(1080, 720, 480, 360));
            }

            List<MediaFormatOption> formatOptions = new ArrayList<>();
            List<String> qualityList = new ArrayList<>();

            for (int h : availableHeights) {
                String qualityLabel = h >= 2160 ? h + "p (4K)"
                        : h >= 1440 ? h + "p (2K)"
                        : h >= 1080 ? h + "p (Full HD)"
                        : h >= 720 ? h + "p (HD)"
                        : h >= 480 ? h + "p (SD)"
                        : h + "p";

                qualityList.add(qualityLabel);

                // Add MP4 format option
                formatOptions.add(new MediaFormatOption(
                        "mp4",
                        qualityLabel,
                        h + "p",
                        "video/mp4",
                        null,
                        true,
                        false,
                        "MP4 (" + qualityLabel + ") — Universal Compatibility"
                ));

                // Add WEBM format option for high definitions
                if (h >= 720) {
                    formatOptions.add(new MediaFormatOption(
                        "webm",
                        qualityLabel,
                        h + "p",
                        "video/webm",
                        null,
                        true,
                        false,
                        "WEBM (" + qualityLabel + ") — Modern Web Container"
                    ));
                }
            }

            // Add High Quality MP3 extraction option
            qualityList.add("Audio Only (High Quality)");
            formatOptions.add(new MediaFormatOption(
                    "mp3",
                    "Audio Only (320 kbps)",
                    null,
                    "audio/mpeg",
                    null,
                    true,
                    true,
                    "MP3 Audio Extraction (High Quality)"
            ));

            metadata.setAvailableFormats(formatOptions);
            metadata.setAvailableQualities(qualityList);

            if (!availableHeights.isEmpty()) {
                metadata.setResolution(availableHeights.iterator().next() + "p");
            }

            metadata.setMessage("Media stream inspected successfully — ready for download");
            return metadata;

        } catch (Exception e) {
            log.error("Failed to parse extractor JSON: {}", e.getMessage());
            MediaMetadata fallback = new MediaMetadata();
            fallback.setMessage("Failed to parse media metadata: " + e.getMessage());
            return fallback;
        }
    }

    /**
     * Downloads actual media bytes from authorized stream sources and merges with FFmpeg.
     */
    public DownloadedMedia download(DownloadTask task, ProgressCallback progressCallback) throws IOException {
        UUID jobId = task.getJobId();
        Path scratchDir = task.getOutputPath();
        Files.createDirectories(scratchDir);

        String targetFormat = task.getTargetFormat() != null ? task.getTargetFormat().toLowerCase(Locale.ROOT) : "mp4";
        String targetQuality = task.getTargetQuality();

        List<String> cmd = new ArrayList<>(getExecutableCommand());
        cmd.add("--no-playlist");
        cmd.add("--newline");

        String ffmpegPath = ffmpegExecutor.getFfmpegExecutable();
        if (ffmpegPath != null && !ffmpegPath.isBlank()) {
            cmd.add("--ffmpeg-location");
            cmd.add(ffmpegPath);
        }

        // Quality and format selection
        if ("mp3".equalsIgnoreCase(targetFormat)) {
            cmd.add("-x");
            cmd.add("--audio-format");
            cmd.add("mp3");
            cmd.add("--audio-quality");
            cmd.add("0"); // Best VBR
        } else {
            int maxH = extractHeightFromQuality(targetQuality);
            if (maxH > 0) {
                cmd.add("-f");
                cmd.add(String.format("bestvideo[height<=%d][ext=mp4]+bestaudio[ext=m4a]/bestvideo[height<=%d]+bestaudio/best[height<=%d]/best", maxH, maxH, maxH));
            } else {
                cmd.add("-f");
                cmd.add("bestvideo[ext=mp4]+bestaudio[ext=m4a]/bestvideo+bestaudio/best[ext=mp4]/best");
            }

            cmd.add("--merge-output-format");
            cmd.add(targetFormat);
        }

        Path outputTemplate = scratchDir.resolve(jobId.toString() + ".%(ext)s");
        cmd.add("-o");
        cmd.add(outputTemplate.toString());
        cmd.add(task.getSourceUri().toString());

        log.info("Starting yt-dlp download for job {}: {}", jobId, String.join(" ", cmd));

        ProcessBuilder pb = new ProcessBuilder(cmd);
        Process process = pb.start();
        activeProcesses.put(jobId, process);

        List<String> errorOutput = new ArrayList<>();

        try (BufferedReader reader = new BufferedReader(new InputStreamReader(process.getInputStream()));
             BufferedReader errReader = new BufferedReader(new InputStreamReader(process.getErrorStream()))) {

            // Asynchronously collect stderr
            Thread errThread = new Thread(() -> {
                String line;
                try {
                    while ((line = errReader.readLine()) != null) {
                        errorOutput.add(line);
                    }
                } catch (IOException ignored) {}
            });
            errThread.start();

            String line;
            while ((line = reader.readLine()) != null) {
                if (task.isCancelled()) {
                    process.destroyForcibly();
                    throw new IOException("Download job cancelled by user request.");
                }

                Matcher m = PROGRESS_PERCENT_PATTERN.matcher(line);
                if (m.find()) {
                    try {
                        double percentVal = Double.parseDouble(m.group(1));
                        int intPercent = (int) Math.round(percentVal);
                        if (progressCallback != null) {
                            String speed = null;
                            Matcher sm = PROGRESS_SPEED_PATTERN.matcher(line);
                            if (sm.find()) speed = sm.group(1);

                            progressCallback.onProgress(new DownloadProgress(
                                    jobId,
                                    0L,
                                    0L,
                                    intPercent,
                                    0.0,
                                    com.mediaforge.backend.enums.JobStatus.PROCESSING,
                                    speed != null ? "Downloading at " + speed : "Downloading stream..."
                            ));
                        }
                    } catch (NumberFormatException ignored) {}
                }
            }

            boolean finished = process.waitFor(600, TimeUnit.SECONDS);
            if (!finished) {
                process.destroyForcibly();
                throw new IOException("Media download timed out after 600 seconds.");
            }

            errThread.join(1000);

            if (process.exitValue() != 0) {
                String errorReason = sanitizeExtractorError(String.join("\n", errorOutput));
                throw new IOException("Download engine error: " + errorReason);
            }

        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            throw new IOException("Download interrupted: " + e.getMessage(), e);
        } finally {
            activeProcesses.remove(jobId);
        }

        // Locate resulting media file in scratch directory
        Path resultingFile = findDownloadedFile(scratchDir, jobId.toString());
        if (resultingFile == null || !Files.exists(resultingFile) || Files.size(resultingFile) == 0) {
            throw new IOException("Downloaded media output file was not produced or is 0 bytes.");
        }

        long fileSize = Files.size(resultingFile);
        String fileName = resultingFile.getFileName().toString();
        String fileExt = fileName.contains(".") ? fileName.substring(fileName.lastIndexOf('.') + 1).toLowerCase(Locale.ROOT) : targetFormat;
        String mimeType = resolveMimeType(fileExt);

        log.info("Media download completed for job {}: file={}, size={} bytes, format={}", jobId, fileName, fileSize, fileExt);

        return new DownloadedMedia(
                resultingFile,
                fileName,
                jobId.toString() + "." + fileExt,
                mimeType,
                fileSize,
                fileExt
        );
    }

    public void cancel(UUID jobId) {
        Process p = activeProcesses.remove(jobId);
        if (p != null && p.isAlive()) {
            p.destroyForcibly();
            log.info("Forcefully terminated active media download process for job: {}", jobId);
        }
    }

    private Path findDownloadedFile(Path scratchDir, String jobIdPrefix) {
        try (Stream<Path> files = Files.list(scratchDir)) {
            return files
                    .filter(p -> p.getFileName().toString().startsWith(jobIdPrefix))
                    .filter(p -> !p.getFileName().toString().endsWith(".part"))
                    .filter(p -> !p.getFileName().toString().endsWith(".ytdl"))
                    .findFirst()
                    .orElse(null);
        } catch (IOException e) {
            log.warn("Failed to list files in scratch directory {}: {}", scratchDir, e.getMessage());
            return null;
        }
    }

    private int extractHeightFromQuality(String quality) {
        if (quality == null) return 0;
        Matcher m = Pattern.compile("(\\d{3,4})p").matcher(quality);
        if (m.find()) {
            return Integer.parseInt(m.group(1));
        }
        return 0;
    }

    private String resolveMimeType(String ext) {
        return switch (ext.toLowerCase(Locale.ROOT)) {
            case "mp4" -> "video/mp4";
            case "webm" -> "video/webm";
            case "mkv" -> "video/x-matroska";
            case "mp3" -> "audio/mpeg";
            case "m4a" -> "audio/mp4";
            case "wav" -> "audio/wav";
            default -> "application/octet-stream";
        };
    }

    private void readStream(java.io.InputStream in, StringBuilder sb) {
        try (BufferedReader reader = new BufferedReader(new InputStreamReader(in))) {
            String line;
            while ((line = reader.readLine()) != null) {
                sb.append(line).append("\n");
            }
        } catch (IOException ignored) {}
    }

    private String sanitizeExtractorError(String rawError) {
        if (rawError == null || rawError.isBlank()) {
            return "Video could not be downloaded directly. Media provider did not supply permitted streams.";
        }

        String[] lines = rawError.split("\n");
        List<String> cleanErrors = new ArrayList<>();
        for (String line : lines) {
            line = line.trim();
            if (line.startsWith("ERROR:")) {
                // Strip "ERROR: [youtube] " prefix
                String msg = line.replaceFirst("^ERROR:\\s*(\\[[^\\]]+\\]\\s*)?", "");
                cleanErrors.add(msg);
            }
        }

        if (!cleanErrors.isEmpty()) {
            return String.join("; ", cleanErrors);
        }

        // Return first non-warning line if no explicit ERROR line
        for (String line : lines) {
            line = line.trim();
            if (!line.isEmpty() && !line.startsWith("WARNING:")) {
                return line;
            }
        }

        return "This video is restricted or unavailable from the provider.";
    }
}
