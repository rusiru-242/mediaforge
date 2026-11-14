package com.mediaforge.backend.converter.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.mediaforge.backend.converter.model.*;
import com.mediaforge.backend.dto.request.SizeEstimationRequest;
import com.mediaforge.backend.dto.request.TimeRangeDto;
import com.mediaforge.backend.dto.response.SizeEstimationResponse;
import com.mediaforge.backend.repository.InMemoryMediaFileRepository;
import com.mediaforge.backend.repository.InMemoryMediaJobRepository;
import org.junit.jupiter.api.*;
import org.junit.jupiter.api.io.TempDir;

import java.io.File;
import java.nio.file.Path;
import java.util.List;
import java.util.UUID;
import java.util.concurrent.TimeUnit;

import static org.junit.jupiter.api.Assertions.*;

@TestMethodOrder(MethodOrderer.OrderAnnotation.class)
public class AdvancedMediaEditingIntegrationTest {

    private static FFmpegProcessExecutor ffmpegExecutor;
    private static MediaProbeServiceImpl probeService;
    private static VideoConversionServiceImpl videoService;
    private static AudioConversionServiceImpl audioService;
    private static ImageConversionServiceImpl imageService;
    private static OutputSizeEstimationServiceImpl estimationService;

    private static File testVideo1080p;
    private static File testAudio;
    private static File testImage;

    @TempDir
    static Path sharedTempDir;

    @BeforeAll
    static void initSuite() throws Exception {
        ffmpegExecutor = new FFmpegProcessExecutor();
        probeService = new MediaProbeServiceImpl(new ObjectMapper());
        videoService = new VideoConversionServiceImpl(ffmpegExecutor, probeService);
        audioService = new AudioConversionServiceImpl(ffmpegExecutor, probeService);
        imageService = new ImageConversionServiceImpl(ffmpegExecutor, probeService);

        InMemoryMediaFileRepository fileRepo = new InMemoryMediaFileRepository();
        InMemoryMediaJobRepository jobRepo = new InMemoryMediaJobRepository();
        ConversionStorageServiceImpl storageService = new ConversionStorageServiceImpl(fileRepo, jobRepo);
        storageService.init();
        estimationService = new OutputSizeEstimationServiceImpl(
                fileRepo,
                storageService,
                probeService
        );

        // Generate synthetic 5-second 1080p test video with audio using FFmpeg
        testVideo1080p = sharedTempDir.resolve("test_1080p_5s.mp4").toFile();
        ProcessBuilder pb = new ProcessBuilder(
                ffmpegExecutor.getFfmpegExecutable(),
                "-y",
                "-f", "lavfi", "-i", "testsrc=duration=5:size=1920x1080:rate=25",
                "-f", "lavfi", "-i", "sine=frequency=1000:duration=5",
                "-c:v", "libx264", "-preset", "ultrafast", "-pix_fmt", "yuv420p",
                "-c:a", "aac",
                testVideo1080p.getAbsolutePath()
        );
        pb.redirectError(ProcessBuilder.Redirect.DISCARD);
        pb.redirectOutput(ProcessBuilder.Redirect.DISCARD);
        Process p = pb.start();
        boolean ok = p.waitFor(15, TimeUnit.SECONDS);
        assertTrue(ok && p.exitValue() == 0, "Failed to generate test 1080p video");

        // Generate test audio file (5-second sine wave)
        testAudio = sharedTempDir.resolve("test_audio_5s.wav").toFile();
        ProcessBuilder pba = new ProcessBuilder(
                ffmpegExecutor.getFfmpegExecutable(),
                "-y",
                "-f", "lavfi", "-i", "sine=frequency=440:duration=5",
                "-c:a", "pcm_s16le",
                testAudio.getAbsolutePath()
        );
        pba.redirectError(ProcessBuilder.Redirect.DISCARD);
        pba.redirectOutput(ProcessBuilder.Redirect.DISCARD);
        Process pa = pba.start();
        boolean oka = pa.waitFor(10, TimeUnit.SECONDS);
        assertTrue(oka && pa.exitValue() == 0, "Failed to generate test audio");

        // Generate test image (640x480 solid color)
        testImage = sharedTempDir.resolve("test_image.jpg").toFile();
        ProcessBuilder pbi = new ProcessBuilder(
                ffmpegExecutor.getFfmpegExecutable(),
                "-y",
                "-f", "lavfi", "-i", "color=c=blue:s=640x480:d=1",
                "-vframes", "1",
                testImage.getAbsolutePath()
        );
        pbi.redirectError(ProcessBuilder.Redirect.DISCARD);
        pbi.redirectOutput(ProcessBuilder.Redirect.DISCARD);
        Process pi = pbi.start();
        boolean oki = pi.waitFor(10, TimeUnit.SECONDS);
        assertTrue(oki && pi.exitValue() == 0, "Failed to generate test image");
    }

    @Test
    @Order(1)
    @DisplayName("1. MP4 Trim — Trim video to 1.0s - 3.5s duration")
    void testMp4Trim() throws Exception {
        File output = sharedTempDir.resolve("trimmed_2_5s.mp4").toFile();
        ConversionOptions options = new ConversionOptions();
        options.setStartTime(1.0);
        options.setEndTime(3.5);
        options.setQualityPreset("ultrafast");

        ConversionResult result = videoService.convertVideo(UUID.randomUUID(), testVideo1080p, output, "mp4", options, null);
        assertTrue(result.isSuccess());
        assertTrue(output.exists() && output.length() > 0);

        MediaProbeResult probe = probeService.probe(output);
        assertEquals(2.5, probe.getDurationSeconds(), 0.5, "Output duration should be approx 2.5 seconds");
    }

    @Test
    @Order(2)
    @DisplayName("2. MP4 Cut and Concatenate — Remove segments [1.0-2.0s] and [3.0-4.0s]")
    void testMp4CutAndConcat() throws Exception {
        File output = sharedTempDir.resolve("cut_concat.mp4").toFile();
        ConversionOptions options = new ConversionOptions();
        options.setRemoveSegments(List.of(
                new TimeRange(1.0, 2.0),
                new TimeRange(3.0, 4.0)
        ));
        options.setQualityPreset("ultrafast");

        ConversionResult result = videoService.convertVideo(UUID.randomUUID(), testVideo1080p, output, "mp4", options, null);
        assertTrue(result.isSuccess());
        assertTrue(output.exists() && output.length() > 0);

        MediaProbeResult probe = probeService.probe(output);
        // Original 5s - 1.0s - 1.0s = 3.0s
        assertEquals(3.0, probe.getDurationSeconds(), 0.5, "Output duration should be approx 3.0 seconds");
    }

    @Test
    @Order(3)
    @DisplayName("3. MP4 Crop — Crop 1920x1080 video to 800x600")
    void testMp4Crop() throws Exception {
        File output = sharedTempDir.resolve("cropped.mp4").toFile();
        ConversionOptions options = new ConversionOptions();
        options.setCropX(100);
        options.setCropY(100);
        options.setCropWidth(800);
        options.setCropHeight(600);
        options.setQualityPreset("ultrafast");

        ConversionResult result = videoService.convertVideo(UUID.randomUUID(), testVideo1080p, output, "mp4", options, null);
        assertTrue(result.isSuccess());
        assertTrue(output.exists() && output.length() > 0);

        MediaProbeResult probe = probeService.probe(output);
        assertEquals(800, probe.getWidth());
        assertEquals(600, probe.getHeight());
    }

    @Test
    @Order(4)
    @DisplayName("4. MP4 1080p to 720p Resolution Scaling")
    void testMp4ResolutionScaling() throws Exception {
        File output = sharedTempDir.resolve("scaled_720p.mp4").toFile();
        ConversionOptions options = new ConversionOptions();
        options.setTargetResolution("720p");
        options.setQualityPreset("ultrafast");

        ConversionResult result = videoService.convertVideo(UUID.randomUUID(), testVideo1080p, output, "mp4", options, null);
        assertTrue(result.isSuccess());
        assertTrue(output.exists() && output.length() > 0);

        MediaProbeResult probe = probeService.probe(output);
        assertEquals(720, probe.getHeight());
        assertEquals(1280, probe.getWidth());
    }

    @Test
    @Order(5)
    @DisplayName("5. MP4 Quality Control — Compare low bitrate vs high bitrate")
    void testMp4QualityReduction() throws Exception {
        File outLow = sharedTempDir.resolve("quality_low.mp4").toFile();
        ConversionOptions optLow = new ConversionOptions();
        optLow.setVideoBitrate("300k");
        optLow.setQualityPreset("ultrafast");
        videoService.convertVideo(UUID.randomUUID(), testVideo1080p, outLow, "mp4", optLow, null);

        File outHigh = sharedTempDir.resolve("quality_high.mp4").toFile();
        ConversionOptions optHigh = new ConversionOptions();
        optHigh.setVideoBitrate("3000k");
        optHigh.setQualityPreset("ultrafast");
        videoService.convertVideo(UUID.randomUUID(), testVideo1080p, outHigh, "mp4", optHigh, null);

        assertTrue(outLow.exists() && outHigh.exists());
        assertTrue(outHigh.length() > outLow.length(), "Higher bitrate output should be noticeably larger than lower bitrate output");
    }

    @Test
    @Order(6)
    @DisplayName("6. MP3 Trim — Trim audio to 1.5s - 3.5s")
    void testMp3Trim() throws Exception {
        File output = sharedTempDir.resolve("trimmed_audio.mp3").toFile();
        ConversionOptions options = new ConversionOptions();
        options.setStartTime(1.5);
        options.setEndTime(3.5);

        ConversionResult result = audioService.convertAudio(UUID.randomUUID(), testAudio, output, "mp3", options, null);
        assertTrue(result.isSuccess());
        assertTrue(output.exists() && output.length() > 0);

        MediaProbeResult probe = probeService.probe(output);
        assertEquals(2.0, probe.getDurationSeconds(), 0.3, "Audio duration should be approx 2 seconds");
    }

    @Test
    @Order(7)
    @DisplayName("7. MP3 Bitrate Conversion — Encode to 128 kbps")
    void testMp3BitrateConversion() throws Exception {
        File output = sharedTempDir.resolve("bitrate_128k.mp3").toFile();
        ConversionOptions options = new ConversionOptions();
        options.setAudioBitrate(128);

        ConversionResult result = audioService.convertAudio(UUID.randomUUID(), testAudio, output, "mp3", options, null);
        assertTrue(result.isSuccess());
        assertTrue(output.exists() && output.length() > 0);

        MediaProbeResult probe = probeService.probe(output);
        assertTrue(probe.getBitRate() >= 120_000 && probe.getBitRate() <= 135_000, "Bitrate should be near 128kbps");
    }

    @Test
    @Order(8)
    @DisplayName("8. JPG Crop — Crop image to 300x200")
    void testJpgCrop() throws Exception {
        File output = sharedTempDir.resolve("cropped_image.jpg").toFile();
        ConversionOptions options = new ConversionOptions();
        options.setCropX(50);
        options.setCropY(50);
        options.setCropWidth(300);
        options.setCropHeight(200);

        ConversionResult result = imageService.convertImage(UUID.randomUUID(), testImage, output, "jpg", options, null);
        assertTrue(result.isSuccess());
        assertTrue(output.exists() && output.length() > 0);

        MediaProbeResult probe = probeService.probe(output);
        assertEquals(300, probe.getWidth());
        assertEquals(200, probe.getHeight());
    }

    @Test
    @Order(9)
    @DisplayName("9. PNG Resize — Resize image to 320x240")
    void testPngResize() throws Exception {
        File output = sharedTempDir.resolve("resized_image.png").toFile();
        ConversionOptions options = new ConversionOptions();
        options.setImageWidth(320);
        options.setImageHeight(240);
        options.setPreserveAspectRatio(false);

        ConversionResult result = imageService.convertImage(UUID.randomUUID(), testImage, output, "png", options, null);
        assertTrue(result.isSuccess());
        assertTrue(output.exists() && output.length() > 0);

        MediaProbeResult probe = probeService.probe(output);
        assertEquals(320, probe.getWidth());
        assertEquals(240, probe.getHeight());
    }

    @Test
    @Order(10)
    @DisplayName("10. JPG to WebP Transcode")
    void testJpgToWebp() throws Exception {
        File output = sharedTempDir.resolve("converted_image.webp").toFile();
        ConversionOptions options = new ConversionOptions();
        options.setImageQuality(80);

        ConversionResult result = imageService.convertImage(UUID.randomUUID(), testImage, output, "webp", options, null);
        assertTrue(result.isSuccess());
        assertTrue(output.exists() && output.length() > 0);
        assertEquals("image/webp", result.getMimeType());
    }

    @Test
    @Order(11)
    @DisplayName("11. Output Size Estimation — Mathematical and range precision")
    void testOutputSizeEstimation() {
        SizeEstimationRequest req = new SizeEstimationRequest();
        req.setMediaType("video");
        req.setOutputFormat("mp4");
        req.setSourceDuration(60.0);
        req.setVideoBitrate("2000k");
        req.setAudioBitrate(192);
        req.setStartTime(10.0);
        req.setEndTime(50.0); // 40s effective
        req.setRemoveSegments(List.of(new TimeRangeDto(20.0, 30.0))); // 10s removed -> 30s effective

        SizeEstimationResponse res = estimationService.estimateSize(req);
        assertNotNull(res);
        assertEquals(30.0, res.getEffectiveDurationSeconds(), 0.01);
        // (30s * (2000k + 192k) bps / 8) * 1.015 = ~8,335,000 bytes
        assertTrue(res.getEstimatedBytes() > 7_000_000 && res.getEstimatedBytes() < 10_000_000);
        assertTrue(res.getMinBytes() < res.getEstimatedBytes());
        assertTrue(res.getMaxBytes() > res.getEstimatedBytes());
        assertTrue(res.getFormattedEstimate().contains("MB"));
        assertTrue(res.getFormattedRange().contains("–"));
    }

    @Test
    @Order(12)
    @DisplayName("12. Invalid Editing Parameters — Rejection with informative errors")
    void testInvalidEditingParameters() {
        // 1. Trim start >= end
        ConversionOptions badTrim = new ConversionOptions();
        badTrim.setStartTime(15.0);
        badTrim.setEndTime(5.0);
        assertThrows(IllegalArgumentException.class, () ->
                videoService.convertVideo(UUID.randomUUID(), testVideo1080p, new File("out.mp4"), "mp4", badTrim, null));

        // 2. Crop area exceeding source dimensions
        ConversionOptions badCrop = new ConversionOptions();
        badCrop.setCropX(1900);
        badCrop.setCropWidth(200); // 1900 + 200 = 2100 > 1920
        badCrop.setCropHeight(100);
        assertThrows(IllegalArgumentException.class, () ->
                videoService.convertVideo(UUID.randomUUID(), testVideo1080p, new File("out.mp4"), "mp4", badCrop, null));

        // 3. Negative cut time
        ConversionOptions badCut = new ConversionOptions();
        badCut.setRemoveSegments(List.of(new TimeRange(-2.0, 5.0)));
        assertThrows(IllegalArgumentException.class, () ->
                audioService.convertAudio(UUID.randomUUID(), testAudio, new File("out.mp3"), "mp3", badCut, null));
    }

    @Test
    @Order(13)
    @DisplayName("13. Process Cancellation — Interruption during processing")
    void testCancelDuringProcessing() throws Exception {
        UUID jobId = UUID.randomUUID();
        File output = sharedTempDir.resolve("cancelled.mp4").toFile();
        ConversionOptions options = new ConversionOptions();
        options.setQualityPreset("veryslow"); // ensure it takes time

        Thread worker = new Thread(() -> {
            try {
                videoService.convertVideo(jobId, testVideo1080p, output, "mp4", options, null);
            } catch (Exception ignored) {
            }
        });
        worker.start();

        Thread.sleep(200); // allow FFmpeg to start
        ffmpegExecutor.cancel(jobId);
        worker.interrupt();
        worker.join(2000);

        assertFalse(ffmpegExecutor.isRunning(jobId));
    }

    @Test
    @Order(14)
    @DisplayName("14. Failed Execution Handling — Non-existent input file")
    void testFailedExecution() {
        File badFile = new File(sharedTempDir.toFile(), "non_existent_file.mp4");
        File output = sharedTempDir.resolve("fail_out.mp4").toFile();
        ConversionOptions options = new ConversionOptions();

        assertThrows(Exception.class, () ->
                videoService.convertVideo(UUID.randomUUID(), badFile, output, "mp4", options, null));
    }

    @Test
    @Order(15)
    @DisplayName("15. Final Output File Integrity — Stream analysis with FFprobe")
    void testFinalOutputFileIntegrity() throws Exception {
        File output = sharedTempDir.resolve("integrity_check.mp4").toFile();
        ConversionOptions options = new ConversionOptions();
        options.setTargetResolution("480p");
        options.setQualityPreset("ultrafast");

        ConversionResult result = videoService.convertVideo(UUID.randomUUID(), testVideo1080p, output, "mp4", options, null);
        assertTrue(result.isSuccess());

        MediaProbeResult probe = probeService.probe(output);
        assertTrue(probe.hasVideo());
        assertTrue(probe.hasAudio());
        assertEquals(480, probe.getHeight());
        assertTrue(probe.getDurationSeconds() > 4.0);
        assertTrue(output.length() > 5000, "Output file must be non-empty and well-formed");
    }
}
