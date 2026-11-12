package com.mediaforge.backend.converter.service;

import com.mediaforge.backend.converter.model.ConversionProgress;
import com.mediaforge.backend.enums.JobStatus;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.*;
import java.util.function.Consumer;

@Service
public class FFmpegProcessExecutor {

    private static final Logger log = LoggerFactory.getLogger(FFmpegProcessExecutor.class);

    @Value("${app.converter.ffmpeg-path:ffmpeg}")
    private String configuredFfmpegPath;

    @Value("${app.converter.timeout-seconds:600}")
    private int timeoutSeconds;

    private final Map<UUID, Process> activeProcesses = new ConcurrentHashMap<>();
    private String resolvedFfmpegExecutable;

    public synchronized String getFfmpegExecutable() {
        if (resolvedFfmpegExecutable != null) {
            return resolvedFfmpegExecutable;
        }

        // 1. Configured path directly
        if (checkExecutable(configuredFfmpegPath)) {
            resolvedFfmpegExecutable = configuredFfmpegPath;
            return resolvedFfmpegExecutable;
        }

        // 2. WinGet links path on Windows
        String userHome = System.getProperty("user.home");
        if (userHome != null) {
            Path wingetPath = Paths.get(userHome, "AppData", "Local", "Microsoft", "WinGet", "Links", "ffmpeg.exe");
            if (Files.exists(wingetPath) && Files.isExecutable(wingetPath)) {
                resolvedFfmpegExecutable = wingetPath.toString();
                return resolvedFfmpegExecutable;
            }
        }

        // 3. Fallback
        resolvedFfmpegExecutable = "ffmpeg";
        return resolvedFfmpegExecutable;
    }

    private boolean checkExecutable(String cmd) {
        try {
            ProcessBuilder pb = new ProcessBuilder(cmd, "-version");
            Process p = pb.start();
            boolean finished = p.waitFor(3, TimeUnit.SECONDS);
            return finished && p.exitValue() == 0;
        } catch (Exception e) {
            return false;
        }
    }

    public boolean isAvailable() {
        return checkExecutable(getFfmpegExecutable());
    }

    /**
     * Executes FFmpeg safely with the given argument list and streams progress.
     */
    public boolean execute(UUID jobId, List<String> args, double totalDurationSeconds, Consumer<ConversionProgress> progressConsumer) throws Exception {
        String ffmpeg = getFfmpegExecutable();

        List<String> fullCommand = new ArrayList<>();
        fullCommand.add(ffmpeg);
        fullCommand.add("-y"); // Overwrite output if scratch exists
        fullCommand.addAll(args);
        fullCommand.add("-progress");
        fullCommand.add("pipe:1");
        fullCommand.add("-nostats");

        // The output file path is expected to be the last argument in args
        log.info("Executing FFmpeg for job {}: {}", jobId, String.join(" ", fullCommand));

        ProcessBuilder pb = new ProcessBuilder(fullCommand);
        Process process = pb.start();
        activeProcesses.put(jobId, process);

        long startTimeMs = System.currentTimeMillis();
        List<String> errorLines = new CopyOnWriteArrayList<>();

        // Capture stderr asynchronously for debugging & error inspection
        Thread errThread = new Thread(() -> {
            try (BufferedReader reader = new BufferedReader(new InputStreamReader(process.getErrorStream()))) {
                String line;
                while ((line = reader.readLine()) != null) {
                    errorLines.add(line);
                    if (errorLines.size() > 50) {
                        errorLines.remove(0);
                    }
                }
            } catch (Exception ignored) {
            }
        });
        errThread.setDaemon(true);
        errThread.start();

        // Capture stdout for progress information
        try (BufferedReader reader = new BufferedReader(new InputStreamReader(process.getInputStream()))) {
            String line;
            long outTimeUs = 0;
            long totalSize = 0;

            while ((line = reader.readLine()) != null) {
                if (Thread.currentThread().isInterrupted()) {
                    process.destroyForcibly();
                    throw new InterruptedException("Conversion job was interrupted");
                }

                if (line.startsWith("out_time_us=")) {
                    try {
                        outTimeUs = Long.parseLong(line.substring("out_time_us=".length()).trim());
                    } catch (NumberFormatException ignored) {
                    }
                } else if (line.startsWith("total_size=")) {
                    try {
                        totalSize = Long.parseLong(line.substring("total_size=".length()).trim());
                    } catch (NumberFormatException ignored) {
                    }
                } else if (line.startsWith("progress=")) {
                    String progressStatus = line.substring("progress=".length()).trim();
                    long elapsedSec = (System.currentTimeMillis() - startTimeMs) / 1000;

                    int percent = 0;
                    Long etaSec = null;
                    if (totalDurationSeconds > 0) {
                        double currentSec = outTimeUs / 1_000_000.0;
                        percent = (int) Math.min(99, Math.max(1, (currentSec / totalDurationSeconds) * 100));
                        if (currentSec > 0) {
                            double remainingSec = Math.max(0, totalDurationSeconds - currentSec);
                            double rate = currentSec / Math.max(1, elapsedSec);
                            etaSec = (long) (remainingSec / Math.max(0.1, rate));
                        }
                    } else {
                        // Unknown duration: simulate progress based on elapsed time up to 90%
                        percent = (int) Math.min(90, elapsedSec * 5);
                    }

                    if ("end".equalsIgnoreCase(progressStatus)) {
                        percent = 100;
                    }

                    if (progressConsumer != null) {
                        progressConsumer.accept(new ConversionProgress(
                                jobId,
                                JobStatus.PROCESSING,
                                percent,
                                "Transcoding media stream",
                                elapsedSec,
                                etaSec,
                                totalSize
                        ));
                    }
                }
            }
        } finally {
            activeProcesses.remove(jobId);
        }

        boolean finished = process.waitFor(timeoutSeconds, TimeUnit.SECONDS);
        if (!finished) {
            process.destroyForcibly();
            throw new TimeoutException("FFmpeg execution exceeded timeout limit of " + timeoutSeconds + " seconds");
        }

        int exitCode = process.exitValue();
        if (exitCode != 0) {
            String errorMsg = String.join("\n", errorLines);
            log.error("FFmpeg exited with error code {}: {}", exitCode, errorMsg);
            throw new RuntimeException("FFmpeg conversion failed (exit code " + exitCode + "): " + errorMsg);
        }

        log.info("FFmpeg execution completed successfully for job {}", jobId);
        return true;
    }

    /**
     * Cancels an active FFmpeg process immediately.
     */
    public boolean cancelProcess(UUID jobId) {
        Process process = activeProcesses.remove(jobId);
        if (process != null && process.isAlive()) {
            log.info("Killing active FFmpeg process for job {}", jobId);
            process.destroyForcibly();
            return true;
        }
        return false;
    }

    public boolean isRunning(UUID jobId) {
        Process process = activeProcesses.get(jobId);
        return process != null && process.isAlive();
    }
}
