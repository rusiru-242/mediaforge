package com.mediaforge.backend.downloader.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.mediaforge.backend.converter.service.FFmpegProcessExecutor;
import com.mediaforge.backend.converter.service.MediaProbeServiceImpl;
import com.mediaforge.backend.converter.model.MediaProbeResult;
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
import java.io.IOException;
import java.io.InputStreamReader;
import java.net.URI;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.CopyOnWriteArrayList;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.ExecutionException;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.TimeoutException;
import java.util.function.Consumer;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Service
public class YtDlpProcessExecutor {

    private static final Logger log = LoggerFactory.getLogger(YtDlpProcessExecutor.class);

    private static final Pattern PROGRESS_PERCENT_PATTERN = Pattern.compile("\\[download\\]\\s+([0-9.]+)%");

    private final DownloadOutputVerifier outputVerifier;
    private final ObjectMapper objectMapper;
    private final FFmpegProcessExecutor ffmpegExecutor;
    private final Map<UUID, Process> activeProcesses = new ConcurrentHashMap<>();
    @org.springframework.beans.factory.annotation.Autowired
    private com.mediaforge.backend.validation.UrlSecurityValidator urlValidator = new com.mediaforge.backend.validation.UrlSecurityValidator();

    @Value("${app.downloader.ytdlp-path:}")
    private String configuredYtDlpPath;

    @Value("${app.downloader.ytdlp-timeout-seconds:60}")
    private int timeoutSeconds = 60;

    @Value("${app.downloader.download-timeout-seconds:3600}")
    private int downloadTimeoutSeconds = 3600;

    private List<String> resolvedExecutableCommand;

    public YtDlpProcessExecutor(ObjectMapper objectMapper, FFmpegProcessExecutor ffmpegExecutor) {
        this(objectMapper, ffmpegExecutor, new DownloadOutputVerifier(new MediaProbeServiceImpl(objectMapper)));
    }

    @org.springframework.beans.factory.annotation.Autowired
    public YtDlpProcessExecutor(ObjectMapper objectMapper, FFmpegProcessExecutor ffmpegExecutor,
                                DownloadOutputVerifier outputVerifier) {
        this.outputVerifier = outputVerifier;
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
            try {
                boolean finished = p.waitFor(4, TimeUnit.SECONDS);
                return finished && p.exitValue() == 0;
            } finally { if (p.isAlive()) p.destroyForcibly(); }
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
        urlValidator.validateUri(uri);
        List<String> cmd = new ArrayList<>(getExecutableCommand());
        cmd.add("--ignore-config");
        cmd.add("-J");
        cmd.add("--no-playlist");
        cmd.add(uri.toString());

        log.info("Inspecting media metadata for host {}", uri.getHost());
        StringBuilder stdout = new StringBuilder();
        StringBuilder stderr = new StringBuilder();

        try (var network = new ExtractorNetworkProxy(urlValidator)) {
            cmd.addAll(getExecutableCommand().size(), List.of("--proxy", network.address()));
            ProcessBuilder pb = new ProcessBuilder(cmd);
            pb.environment().put("NO_PROXY", ""); pb.environment().put("no_proxy", "");
            Process process = pb.start();

            Thread outThread = new Thread(() -> readStream(process.getInputStream(), stdout));
            Thread errThread = new Thread(() -> readStream(process.getErrorStream(), stderr));
            outThread.start();
            errThread.start();

            boolean finished = process.waitFor(timeoutSeconds, TimeUnit.SECONDS);
            if (!finished) {
                process.destroyForcibly();
                log.warn("Extractor inspection timed out after {}s for URL {}", timeoutSeconds, uri.getHost());
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
                log.warn("Extractor returned exit code {} for host {}: {}", process.exitValue(), uri.getHost(), cleanError);
                MediaMetadata meta = new MediaMetadata();
                meta.setMessage(cleanError);
                return meta;
            }

        } catch (Exception e) {
            log.error("Failed to start media extractor for host {} ({})", uri.getHost(), e.getClass().getSimpleName());
            MediaMetadata meta = new MediaMetadata();
            meta.setMessage(ExtractorErrors.describe(e.getMessage()));
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
            String platform = com.mediaforge.backend.downloader.model.PlatformUrls.platform(uri);
            metadata.setSourceName(uploader != null ? platform + " (" + uploader + ")" : platform);
            metadata.setMediaType(sourceHasStream(root, "vcodec") ? "VIDEO" : "AUDIO");
            metadata.setMimeType(DownloadOutputVerifier.mimeType(ext));
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
                    if (height > 0 && usableStream(fmt, "vcodec")) {
                        availableHeights.add(height);
                    }
                    long fs = fmt.path("filesize").asLong(fmt.path("filesize_approx").asLong(0));
                    if (fs > maxFilesize) {
                        maxFilesize = fs;
                    }
                }
            }

            if (maxFilesize > 0) {
                // Separate streams cannot be represented by the largest single-stream size.
                long exactSize = root.path("filesize").asLong(0);
                if (exactSize > 0) metadata.setFileSize(exactSize);
            }

            // DRM check
            if (hasDrm && availableHeights.isEmpty()) {
                metadata.setMessage("This media stream is protected by DRM (Digital Rights Management) and cannot be downloaded directly.");
                return metadata;
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

            if (!sourceHasStream(root, "acodec")) formatOptions.removeIf(f -> DownloadOutputVerifier.isAudio(f.getFormat()));
            else for (String audioFormat : List.of("m4a", "wav")) formatOptions.add(new MediaFormatOption(
                    audioFormat, "Source Audio", null, DownloadOutputVerifier.mimeType(audioFormat), null, true, true, audioFormat.toUpperCase(Locale.ROOT) + " Audio"));
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
        Path scratch = task.getOutputPath().toAbsolutePath().normalize();
        Files.createDirectories(scratch);
        String format = task.getTargetFormat() == null ? "mp4" : task.getTargetFormat().toLowerCase(Locale.ROOT);
        if (!Set.of("mp4", "webm", "mkv", "mov", "avi", "flv", "mp3", "m4a", "wav").contains(format)) {
            throw new IOException("Unsupported download format: " + format);
        }
        boolean audioOnly = DownloadOutputVerifier.isAudio(format);
        JsonNode source = inspectSource(task);
        validateExtractedUrls(source);
        boolean hasVideo = sourceHasStream(source, "vcodec");
        boolean hasAudio = sourceHasStream(source, "acodec");
        if (!audioOnly && !hasVideo) throw new IOException("This source has no downloadable video stream. Choose an audio format instead.");
        if (audioOnly && !hasAudio) throw new IOException("This source has no downloadable audio stream.");
        if (task.isCancelled()) throw new IOException("Download cancelled.");

        List<String> command = new ArrayList<>(getExecutableCommand());
        command.addAll(List.of("--ignore-config", "--no-playlist", "--newline", "--no-simulate", "--no-warnings"));
        command.addAll(downloadNetworkArguments());
        command.addAll(List.of("--ffmpeg-location", ffmpegExecutor.getFfmpegLocation()));
        command.addAll(List.of("-f", buildFormatSelector(format, task.getTargetQuality(), hasAudio, task.getSourceUri())));
        // A neutral merge container allows fallback codecs. We explicitly normalize after probing.
        if (!audioOnly) command.addAll(List.of("--merge-output-format", "mkv"));
        Path manifest = scratch.resolve("final-path.txt");
        command.addAll(List.of("--print-to-file", "after_move:filepath", manifest.toString()));
        command.addAll(List.of("-o", scratch.resolve("source.%(ext)s").toString()));
        if (task.getMaxSizeBytes() > 0) command.addAll(List.of("--max-filesize", Long.toString(task.getMaxSizeBytes())));
        command.add(task.getSourceUri().toString());
        runExtractorProcess(task, command, Math.max(60, downloadTimeoutSeconds), line -> {
            Matcher matcher = PROGRESS_PERCENT_PATTERN.matcher(line);
            if (matcher.find() && progressCallback != null) {
                int percent = Math.min(80, (int) (Double.parseDouble(matcher.group(1)) * 0.8));
                progressCallback.onProgress(new DownloadProgress(jobId, 0L, 0L, percent, 0.0,
                        com.mediaforge.backend.enums.JobStatus.PROCESSING, "Downloading media streams..."));
            }
        });
        Path downloaded = readFinalOutput(scratch, manifest);
        MediaProbeResult input = outputVerifier.inspect(downloaded);
        if (!audioOnly && (!input.hasVideo() || hasAudio && !input.hasAudio())) {
            throw new IOException("Video/audio stream merging failed: downloaded output is missing required streams.");
        }
        if (audioOnly && !input.hasAudio()) throw new IOException("Downloaded source contains no audio stream.");
        Path output = scratch.resolve(jobId + "." + format);
        List<String> args = normalizationArguments(downloaded, output, format, input, task.getTargetQuality());
        try {
            if (task.isCancelled()) throw new IOException("Download cancelled before processing.");
            boolean success = ffmpegExecutor.execute(jobId, args, input.getDurationSeconds(), progress -> {
                if (task.isCancelled()) ffmpegExecutor.cancelProcess(jobId);
                if (progressCallback != null) progressCallback.onProgress(new DownloadProgress(jobId, 0L, 0L,
                        Math.min(99, 80 + progress.getProgress() / 5), 0.0,
                        com.mediaforge.backend.enums.JobStatus.PROCESSING, "Preparing and verifying " + format.toUpperCase(Locale.ROOT) + " output..."));
            });
            if (!success || task.isCancelled()) throw new IOException("FFmpeg could not create the requested output, or the job was cancelled.");
        } catch (IOException ex) {
            throw ex;
        } catch (Exception ex) {
            throw new IOException("FFmpeg processing failed: " + ex.getMessage(), ex);
        }
        MediaProbeResult verified = outputVerifier.verify(output, format, !audioOnly && hasAudio);
        int requestedHeight = extractHeightFromQuality(task.getTargetQuality());
        if (!audioOnly && requestedHeight > 0 && verified.getHeight() != requestedHeight) {
            throw new IOException("Requested " + requestedHeight + "p video, but output is " + verified.getHeight() + "p.");
        }
        if (task.getMaxSizeBytes() > 0 && Files.size(output) > task.getMaxSizeBytes()) throw new IOException("Output exceeds the download size limit.");
        DownloadedMedia result = new DownloadedMedia(output, downloadFilename(source.path("title").asText(""), format, audioOnly, audioOnly ? 0 : verified.getHeight()),
                output.getFileName().toString(), DownloadOutputVerifier.mimeType(format), Files.size(output), format);
        result.setAudioExpected(!audioOnly && hasAudio);
        result.setSelectionApplied(true);
        return result;
    }

    static List<String> downloadNetworkArguments() {
        return List.of("--socket-timeout", "30", "--retries", "3", "--fragment-retries", "3",
                "--extractor-retries", "2", "--concurrent-fragments", "4", "--abort-on-unavailable-fragments");
    }

    static String downloadFilename(String title, String format, boolean audioOnly) {
        return downloadFilename(title, format, audioOnly, 0);
    }

    static String downloadFilename(String title, String format, boolean audioOnly, int height) {
        String name = title == null ? "" : title.replaceAll("[\\x00-\\x1f\\x7f<>:\"/\\\\|?*]", "_").strip();
        name = name.replaceAll("[. ]+$", "");
        if (name.isBlank()) name = "MediaForge_" + (audioOnly ? "Audio" : "Video");
        // Keep Unicode names within common filesystem byte limits, including extension.
        while (name.getBytes(StandardCharsets.UTF_8).length > 220) {
            name = name.substring(0, name.offsetByCodePoints(name.length(), -1));
        }
        if (name.matches("(?i)^(CON|PRN|AUX|NUL|COM[1-9]|LPT[1-9])(?:\\..*)?$")) name = "_" + name;
        return name + (!audioOnly && height > 0 ? " (" + height + ")" : "") + "." + format;
    }

    JsonNode inspectSource(DownloadTask task) throws IOException {
        urlValidator.validateUri(task.getSourceUri());
        List<String> command = new ArrayList<>(getExecutableCommand());
        command.addAll(List.of("--ignore-config", "--no-playlist", "-J", task.getSourceUri().toString()));
        StringBuilder json = new StringBuilder();
        runExtractorProcess(task, command, Math.max(15, timeoutSeconds), line -> {
            if (json.length() + line.length() > 32_000_000) throw new IllegalStateException("Extractor metadata is too large.");
            json.append(line).append('\n');
        });
        JsonNode source = objectMapper.readTree(json.toString());
        if (source == null || !source.isObject()) throw new IOException("Extractor did not return usable source metadata.");
        return source;
    }

    void validateExtractedUrls(JsonNode node) throws IOException {
        if (node.isArray()) { for (JsonNode item : node) validateExtractedUrls(item); }
        else if (node.isObject()) {
            var fields = node.fields();
            while (fields.hasNext()) {
                var field = fields.next();
                if (Set.of("url", "manifest_url", "fragment_base_url").contains(field.getKey()) && field.getValue().isTextual()) {
                    String value = field.getValue().asText();
                    try {
                        URI uri = URI.create(value);
                        if (uri.isAbsolute()) urlValidator.validateUri(uri);
                    } catch (RuntimeException ex) { throw new IOException("Extractor returned an unsafe or unsupported stream URL."); }
                } else if (field.getValue().isContainerNode() && !Set.of("thumbnails", "subtitles", "automatic_captions").contains(field.getKey())) {
                    validateExtractedUrls(field.getValue());
                }
            }
        }
    }

    static boolean sourceHasStream(JsonNode source, String codec) {
        for (JsonNode format : source.path("formats")) {
            if (usableStream(format, codec)) return true;
        }
        return usableStream(source, codec);
    }

    private static boolean usableStream(JsonNode format, String codec) {
        String value = format.path(codec).asText("none");
        return !value.isBlank() && !"none".equals(value) && !format.path("has_drm").asBoolean(false)
                && !"mhtml".equals(format.path("ext").asText()) && !"images".equals(format.path("protocol").asText());
    }

    static String buildFormatSelector(String format, String quality, boolean sourceHasAudio) {
        if (DownloadOutputVerifier.isAudio(format)) return "bestaudio[acodec!=none]/best[acodec!=none]";
        Matcher height = Pattern.compile("(\\d{2,4})p", Pattern.CASE_INSENSITIVE).matcher(quality == null ? "" : quality);
        String resolution = height.find() ? "[height=" + height.group(1) + "]" : "";
        String preferred = "webm".equals(format) ? "[ext=webm]" : "[ext=mp4]";
        String audio = "webm".equals(format) ? "[ext=webm]" : "[ext=m4a]";
        String video = "bestvideo[vcodec!=none]" + resolution;
        String combined = "best[vcodec!=none]" + resolution;
        if (!sourceHasAudio) return video + preferred + "/" + video + "/" + combined;
        return video + preferred + "+bestaudio[acodec!=none]" + audio + "/"
                + video + "+bestaudio[acodec!=none]/" + combined + "[acodec!=none]";
    }

    static String buildFormatSelector(String format, String quality, boolean sourceHasAudio, URI source) {
        String selector = buildFormatSelector(format, quality, sourceHasAudio);
        String host = source == null || source.getHost() == null ? "" : source.getHost().toLowerCase(Locale.ROOT);
        if (DownloadOutputVerifier.isAudio(format) || !(host.equals("tiktok.com") || host.endsWith(".tiktok.com"))) return selector;
        // TikTok's playback streams are unwatermarked; its download variants can carry a watermark.
        // Apply exclusions to every video fallback so a failed playback selection cannot use them.
        String clean = "[format_id!^=download][format_note!*=?watermarked]";
        return selector.replace("[vcodec!=none]", "[vcodec!=none]" + clean);
    }

    static List<String> normalizationArguments(Path input, Path output, String format, MediaProbeResult probe, String quality) {
        List<String> args = new ArrayList<>(List.of("-i", input.toString()));
        if (DownloadOutputVerifier.isAudio(format)) {
            args.addAll(List.of("-map", "0:a:0", "-vn", "-c:a", switch (format) {
                case "mp3" -> "libmp3lame";
                case "wav" -> "pcm_s16le";
                default -> probe.getAudioStreams().stream().allMatch(a -> "aac".equals(a.getCodecName())) ? "copy" : "aac";
            }));
            if ("mp3".equals(format)) args.addAll(List.of("-b:a", quality != null && quality.matches("\\d{2,3}k") ? quality : "320k"));
        } else {
            args.addAll(List.of("-map", "0:v:0", "-map", "0:a:0?"));
            boolean webm = "webm".equals(format);
            Set<String> videoCodecs = webm ? Set.of("vp8", "vp9", "av1") : Set.of("h264");
            Set<String> audioCodecs = webm ? Set.of("opus", "vorbis") : Set.of("aac");
            boolean copyVideo = !"avi".equals(format) && probe.getVideoStreams().stream().allMatch(v -> videoCodecs.contains(v.getCodecName()));
            boolean copyAudio = !"avi".equals(format) && probe.getAudioStreams().stream().allMatch(a -> audioCodecs.contains(a.getCodecName()));
            args.addAll(List.of("-c:v", copyVideo ? "copy" : webm ? "libvpx-vp9" : "avi".equals(format) ? "msmpeg4v2" : "libx264"));
            args.addAll(List.of("-c:a", copyAudio ? "copy" : webm ? "libopus" : "avi".equals(format) ? "libmp3lame" : "aac"));
            if (!copyVideo) args.addAll(List.of("-pix_fmt", "yuv420p"));
            if (!copyVideo && !webm && !"avi".equals(format)) args.addAll(List.of("-preset", "fast"));
            if (Set.of("mp4", "mov").contains(format)) args.addAll(List.of("-movflags", "+faststart"));
        }
        args.add(output.toString());
        return args;
    }

    private void runExtractorProcess(DownloadTask task, List<String> command, int seconds, Consumer<String> stdout) throws IOException {
        try (var network = new ExtractorNetworkProxy(urlValidator)) {
            List<String> guarded = new ArrayList<>(command);
            guarded.addAll(getExecutableCommand().size(), List.of("--proxy", network.address()));
            runProcess(task, guarded, seconds, stdout);
        }
    }

    void runProcess(DownloadTask task, List<String> command, int seconds, Consumer<String> stdout) throws IOException {
        if (task.isCancelled()) throw new IOException("Download cancelled.");
        ProcessBuilder builder = new ProcessBuilder(command);
        builder.environment().put("NO_PROXY", ""); builder.environment().put("no_proxy", "");
        Process process = builder.start();
        activeProcesses.put(task.getJobId(), process);
        var readers = Executors.newFixedThreadPool(2);
        List<String> errors = new CopyOnWriteArrayList<>();
        Future<?> out = readers.submit(() -> {
            try (var reader = new BufferedReader(new InputStreamReader(process.getInputStream(), StandardCharsets.UTF_8))) {
                String line;
                while ((line = reader.readLine()) != null) stdout.accept(line);
            } catch (IOException ex) { throw new java.io.UncheckedIOException(ex); }
        });
        Future<?> err = readers.submit(() -> {
            try (var reader = new BufferedReader(new InputStreamReader(process.getErrorStream(), StandardCharsets.UTF_8))) {
                String line;
                while ((line = reader.readLine()) != null) {
                    errors.add(line);
                    if (errors.size() > 60) errors.remove(0);
                }
            } catch (IOException ex) { throw new java.io.UncheckedIOException(ex); }
        });
        try {
            long deadline = System.nanoTime() + TimeUnit.SECONDS.toNanos(seconds);
            while (!process.waitFor(250, TimeUnit.MILLISECONDS)) {
                if (task.isCancelled()) throw new IOException("Download cancelled.");
                if (out.isDone()) out.get();
                if (err.isDone()) err.get();
                if (System.nanoTime() >= deadline) break;
            }
            if (process.isAlive()) {
                log.warn("Extractor timed out for job {} after {} seconds. Recent output: {}", task.getJobId(), seconds, sanitizeExtractorError(String.join("\n", errors)));
                throw new IOException("Media download exceeded the " + seconds + " second time limit. The source may be slow or unavailable; retry or choose a lower resolution.");
            }
            out.get(5, TimeUnit.SECONDS);
            err.get(5, TimeUnit.SECONDS);
            if (task.isCancelled()) throw new IOException("Download cancelled.");
            if (process.exitValue() != 0) throw new IOException("Media extractor failed: " + sanitizeExtractorError(String.join("\n", errors)));
        } catch (InterruptedException ex) {
            Thread.currentThread().interrupt();
            throw new IOException("Media extraction interrupted.", ex);
        } catch (ExecutionException | TimeoutException ex) {
            throw new IOException("Failed reading media extractor output.", ex);
        } finally {
            process.descendants().forEach(ProcessHandle::destroyForcibly);
            process.destroyForcibly();
            activeProcesses.remove(task.getJobId(), process);
            readers.shutdownNow();
        }
    }

    public void cancel(UUID jobId) {
        ffmpegExecutor.cancelProcess(jobId);
        Process p = activeProcesses.remove(jobId);
        if (p != null && p.isAlive()) {
            p.descendants().forEach(ProcessHandle::destroyForcibly);
            p.destroyForcibly();
            log.info("Forcefully terminated active media download process for job: {}", jobId);
        }
    }

    static Path readFinalOutput(Path scratch, Path manifest) throws IOException {
        if (!Files.isRegularFile(manifest)) throw new IOException("Extractor did not report a final media file. Merge may have failed.");
        List<String> paths = Files.readAllLines(manifest, StandardCharsets.UTF_8).stream().filter(l -> !l.isBlank()).toList();
        if (paths.size() != 1) throw new IOException("Extractor returned an ambiguous output file list.");
        Path downloaded = Paths.get(paths.get(0)).toAbsolutePath().normalize();
        if (!downloaded.startsWith(scratch.toAbsolutePath().normalize()) || !Files.isRegularFile(downloaded)
                || Files.isSymbolicLink(downloaded) || !downloaded.toRealPath().startsWith(scratch.toRealPath())
                || downloaded.toString().endsWith(".part") || downloaded.toString().endsWith(".ytdl")) {
            throw new IOException("Extractor reported an invalid output path.");
        }
        return downloaded;
    }

    private int extractHeightFromQuality(String quality) {
        if (quality == null) return 0;
        Matcher m = Pattern.compile("(\\d{3,4})p").matcher(quality);
        if (m.find()) {
            return Integer.parseInt(m.group(1));
        }
        return 0;
    }

    private void readStream(java.io.InputStream in, StringBuilder sb) {
        try (BufferedReader reader = new BufferedReader(new InputStreamReader(in))) {
            String line;
            while ((line = reader.readLine()) != null) {
                if (sb.length() + line.length() <= 32_000_000) sb.append(line).append("\n");
            }
        } catch (IOException ignored) {}
    }

    private String sanitizeExtractorError(String rawError) { return ExtractorErrors.describe(rawError); }
}
