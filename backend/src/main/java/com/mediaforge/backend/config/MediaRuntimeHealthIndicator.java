package com.mediaforge.backend.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.actuate.health.Health;
import org.springframework.boot.actuate.health.HealthIndicator;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Component;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.concurrent.TimeUnit;

/** Readiness checks actual local tools/storage; paths/versions are not public. */
@Component("mediaRuntime")
@Profile("prod")
public class MediaRuntimeHealthIndicator implements HealthIndicator {
    private final Path storage;
    private final long minimumFreeBytes;
    private final String ffmpeg, ffprobe, extractor;
    private final boolean checkTools;
    private long checkedAt;
    private boolean toolsAvailable;
    public MediaRuntimeHealthIndicator(@Value("${app.storage.base-path:./uploads}") String storage,
            @Value("${app.storage.minimum-free-bytes:1073741824}") long minimumFreeBytes,
            @Value("${app.converter.ffmpeg-path:ffmpeg}") String ffmpeg,
            @Value("${app.converter.ffprobe-path:ffprobe}") String ffprobe,
            @Value("${app.downloader.ytdlp-path:yt-dlp}") String extractor,
            @Value("${app.runtime-checks.tools-enabled:true}") boolean checkTools) {
        this.storage = Path.of(storage).toAbsolutePath().normalize();
        this.minimumFreeBytes = Math.max(0, minimumFreeBytes);
        this.ffmpeg = ffmpeg; this.ffprobe = ffprobe; this.extractor = extractor;
        this.checkTools = checkTools;
    }
    public boolean storageAvailable() {
        try {
            return Files.isDirectory(storage) && Files.isWritable(storage)
                    && Files.getFileStore(storage).getUsableSpace() >= minimumFreeBytes;
        } catch (Exception ex) { return false; }
    }
    @Override public synchronized Health health() {
        if (!storageAvailable()) return Health.down().build();
        if (checkTools && System.currentTimeMillis() - checkedAt > 30000) {
            toolsAvailable = executable(ffmpeg, "-version") && executable(ffprobe, "-version")
                    && executable(extractor.isBlank() ? "yt-dlp" : extractor, "--version");
            checkedAt = System.currentTimeMillis();
        }
        return !checkTools || toolsAvailable ? Health.up().build() : Health.down().build();
    }
    private boolean executable(String file, String argument) {
        Process process = null;
        try {
            process = new ProcessBuilder(file, argument).redirectOutput(ProcessBuilder.Redirect.DISCARD)
                    .redirectError(ProcessBuilder.Redirect.DISCARD).start();
            return process.waitFor(3, TimeUnit.SECONDS) && process.exitValue() == 0;
        } catch (InterruptedException ex) { Thread.currentThread().interrupt(); return false; }
        catch (Exception ex) { return false; }
        finally { if (process != null && process.isAlive()) process.destroyForcibly(); }
    }
}
