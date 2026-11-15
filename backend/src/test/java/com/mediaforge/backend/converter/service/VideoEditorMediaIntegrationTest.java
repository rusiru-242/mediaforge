package com.mediaforge.backend.converter.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.mediaforge.backend.converter.model.ConversionOptions;
import org.junit.jupiter.api.*;
import org.junit.jupiter.api.condition.EnabledIfSystemProperty;
import org.junit.jupiter.api.io.TempDir;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import java.nio.file.*;
import java.util.*;
import java.util.concurrent.TimeUnit;
import static org.assertj.core.api.Assertions.*;

@EnabledIfSystemProperty(named = "mediaforge.media-integration", matches = "true")
class VideoEditorMediaIntegrationTest {
    @TempDir Path dir;
    FFmpegProcessExecutor executor;
    MediaProbeServiceImpl probe;
    Path source;

    @BeforeEach void fixture() throws Exception {
        executor = new FFmpegProcessExecutor();
        probe = new MediaProbeServiceImpl(new ObjectMapper());
        source = dir.resolve("source.mp4");
        Path log = dir.resolve("fixture.log");
        Process process = new ProcessBuilder(executor.getFfmpegExecutable(), "-y", "-f", "lavfi", "-i",
                "testsrc2=size=1280x720:rate=25", "-f", "lavfi", "-i", "sine=frequency=440",
                "-t", "1", "-c:v", "libx264", "-preset", "ultrafast", "-c:a", "aac", source.toString())
                .redirectErrorStream(true).redirectOutput(log.toFile()).start();
        assertThat(process.waitFor(30, TimeUnit.SECONDS)).isTrue();
        assertThat(process.exitValue()).withFailMessage("%s", Files.readString(log)).isZero();
    }

    @Test void croppedTrimmedVideoContainsTheRequestedRectangleAndAudio() throws Exception {
        var options = new ConversionOptions();
        options.setCropX(40); options.setCropY(20); options.setCropWidth(160); options.setCropHeight(160);
        options.setStartTime(0.2); options.setEndTime(0.8); options.setTargetResolution("source");
        Path output = dir.resolve("cropped.mp4");
        var result = new VideoConversionServiceImpl(executor, probe).convertVideo(UUID.randomUUID(), source.toFile(), output.toFile(), "mp4", options, null);
        assertThat(result.isSuccess()).isTrue();
        var actual = probe.probe(output.toFile());
        assertThat(actual.getWidth()).isEqualTo(160);
        assertThat(actual.getHeight()).isEqualTo(160);
        assertThat(actual.hasAudio()).isTrue();
        assertThat(actual.getDurationSeconds()).isBetween(0.5, 0.8);
    }

    @ParameterizedTest @ValueSource(strings = {"mp3", "m4a", "wav"})
    void exportsTrimmedAudioFromVideo(String format) throws Exception {
        var options = new ConversionOptions();
        options.setStartTime(0.2); options.setEndTime(0.8); options.setAudioBitrate(192);
        Path output = dir.resolve("audio." + format);
        var result = new AudioConversionServiceImpl(executor, probe).convertAudio(UUID.randomUUID(), source.toFile(), output.toFile(), format, options, null);
        assertThat(result.isSuccess()).isTrue();
        var actual = probe.probe(output.toFile());
        assertThat(actual.hasAudio()).isTrue();
        assertThat(actual.hasVideo()).isFalse();
        assertThat(actual.getDurationSeconds()).isBetween(0.5, 0.8);
    }

    @ParameterizedTest @ValueSource(strings = {"480p", "720p", "1080p", "4k"})
    void selectedResolutionChangesActualOutputDimensions(String resolution) throws Exception {
        var options = new ConversionOptions();
        options.setTargetResolution(resolution);
        options.setStartTime(0.2); options.setEndTime(0.4);
        Path output = dir.resolve("scaled.mp4");
        var result = new VideoConversionServiceImpl(executor, probe).convertVideo(UUID.randomUUID(), source.toFile(), output.toFile(), "mp4", options, null);
        assertThat(result.isSuccess()).isTrue();
        var actual = probe.probe(output.toFile());
        int expected = resolution.equals("4k") ? 2160 : Integer.parseInt(resolution.replace("p", ""));
        assertThat(actual.getHeight()).isEqualTo(expected);
        assertThat(actual.getWidth() % 2).isZero();
        assertThat(actual.hasVideo()).isTrue();
        assertThat(actual.hasAudio()).isTrue();
    }

    @Test void fadesTheTrimmedVideoAndAudioAtBothEnds() throws Exception {
        var options = new ConversionOptions();
        options.setStartTime(0.2); options.setEndTime(0.8); options.setTargetResolution("source");
        options.setFadeInDuration(0.2); options.setFadeOutDuration(0.2);
        options.setVideoFadeInDuration(0.2); options.setVideoFadeOutDuration(0.2);
        Path output = dir.resolve("faded.mp4");
        new VideoConversionServiceImpl(executor, probe).convertVideo(UUID.randomUUID(), source.toFile(), output.toFile(), "mp4", options, null);
        assertThat(probe.probe(output.toFile()).getDurationSeconds()).isBetween(0.5, 0.8);
        double middle = frameMean(output, "0.3");
        assertThat(middle).isGreaterThan(20);
        assertThat(frameMean(output, "0")).isLessThan(middle * 0.1);
        assertThat(frameMean(output, "0.56")).isLessThan(middle * 0.5);
        Path audio = dir.resolve("samples.pcm");
        runDecode(List.of("-i", output.toString(), "-vn", "-ac", "1", "-ar", "8000", "-f", "s16le", audio.toString()));
        byte[] bytes = Files.readAllBytes(audio);
        double center = rms(bytes, 2400, 200);
        assertThat(center).isGreaterThan(100);
        assertThat(rms(bytes, 0, 200)).isLessThan(center * 0.4);
        assertThat(rms(bytes, 4500, 200)).isLessThan(center * 0.4);
    }

    private double frameMean(Path input, String time) throws Exception {
        Path frame = dir.resolve("frame-" + time + ".raw");
        runDecode(List.of("-ss", time, "-i", input.toString(), "-frames:v", "1", "-vf", "scale=32:32", "-pix_fmt", "gray", "-f", "rawvideo", frame.toString()));
        byte[] pixels = Files.readAllBytes(frame);
        assertThat(pixels).isNotEmpty();
        double sum = 0; for (byte pixel : pixels) sum += Byte.toUnsignedInt(pixel);
        return sum / pixels.length;
    }

    @ParameterizedTest @ValueSource(strings = {"reverb", "echo", "bass", "treble", "warmth"})
    void appliesEachNamedEffectToRealAudio(String effect) throws Exception {
        var service = new AudioConversionServiceImpl(executor, probe);
        var options = new ConversionOptions(); options.setAudioEffects(List.of(effect));
        Path clean = dir.resolve("clean.wav"), effected = dir.resolve("effect.wav");
        service.convertAudio(UUID.randomUUID(), source.toFile(), clean.toFile(), "wav", new ConversionOptions(), null);
        service.convertAudio(UUID.randomUUID(), source.toFile(), effected.toFile(), "wav", options, null);
        assertThat(probe.probe(effected.toFile()).hasAudio()).isTrue();
        assertThat(probe.probe(effected.toFile()).getDurationSeconds()).isBetween(0.9, 1.1);
        Path cleanPcm = dir.resolve("clean.pcm"), effectPcm = dir.resolve("effect.pcm");
        runDecode(List.of("-i", clean.toString(), "-ac", "1", "-ar", "8000", "-f", "s16le", cleanPcm.toString()));
        runDecode(List.of("-i", effected.toString(), "-ac", "1", "-ar", "8000", "-f", "s16le", effectPcm.toString()));
        assertThat(Files.readAllBytes(effectPcm)).isNotEqualTo(Files.readAllBytes(cleanPcm));
        byte[] previous = Files.readAllBytes(cleanPcm);
        for (int level : new int[]{0, 25, 100}) {
            options.setAudioEffectLevels(Map.of(effect, level));
            Path scaledOutput = dir.resolve("effect-level-" + level + ".wav");
            Path scaledPcm = dir.resolve("effect-level-" + level + ".pcm");
            service.convertAudio(UUID.randomUUID(), source.toFile(), scaledOutput.toFile(), "wav", options, null);
            runDecode(List.of("-i", scaledOutput.toString(), "-ac", "1", "-ar", "8000", "-f", "s16le", scaledPcm.toString()));
            byte[] actual = Files.readAllBytes(scaledPcm);
            if (level == 0) assertThat(actual).isEqualTo(previous);
            else assertThat(actual).isNotEqualTo(previous);
            previous = actual;
        }
    }

    @Test void zeroClipVolumeExportsSilence() throws Exception {
        var options = new ConversionOptions(); options.setVolume(0.0);
        Path output = dir.resolve("muted.wav"), pcm = dir.resolve("muted.pcm");
        new AudioConversionServiceImpl(executor, probe).convertAudio(UUID.randomUUID(), source.toFile(), output.toFile(), "wav", options, null);
        runDecode(List.of("-i", output.toString(), "-ac", "1", "-ar", "8000", "-f", "s16le", pcm.toString()));
        assertThat(rms(Files.readAllBytes(pcm), 100, 1000)).isZero();
    }

    @ParameterizedTest @ValueSource(strings = {"reverb", "echo", "bass", "treble", "warmth"})
    void videoAudioEffectsRespectLevelsAndKeepVideo(String effect) throws Exception {
        var service = new VideoConversionServiceImpl(executor, probe);
        byte[] previous = null;
        for (int level : new int[]{0, 50, 100}) {
            var options = new ConversionOptions();
            options.setTargetResolution("source");
            options.setAudioEffects(List.of(effect));
            options.setAudioEffectLevels(Map.of(effect, level));
            Path output = dir.resolve("video-effect-" + level + ".mp4");
            assertThat(service.convertVideo(UUID.randomUUID(), source.toFile(), output.toFile(), "mp4", options, null).isSuccess()).isTrue();
            var actual = probe.probe(output.toFile());
            assertThat(actual.hasVideo()).isTrue();
            assertThat(actual.hasAudio()).isTrue();
            assertThat(actual.getDurationSeconds()).isBetween(0.9, 1.15);
            Path pcm = dir.resolve("video-effect-" + level + ".pcm");
            runDecode(List.of("-i", output.toString(), "-vn", "-ac", "1", "-ar", "8000", "-f", "s16le", pcm.toString()));
            byte[] samples = Files.readAllBytes(pcm);
            if (previous != null) assertThat(samples).isNotEqualTo(previous);
            previous = samples;
        }
    }

    private static double rms(byte[] bytes, int start, int count) {
        double sum = 0;
        for (int i = start; i < start + count; i++) {
            short sample = (short) ((bytes[i * 2] & 255) | bytes[i * 2 + 1] << 8);
            sum += (double) sample * sample;
        }
        return Math.sqrt(sum / count);
    }

    private void runDecode(List<String> args) throws Exception {
        List<String> command = new ArrayList<>(List.of(executor.getFfmpegExecutable(), "-y")); command.addAll(args);
        Path log = dir.resolve("decode.log");
        Process process = new ProcessBuilder(command).redirectErrorStream(true).redirectOutput(log.toFile()).start();
        assertThat(process.waitFor(30, TimeUnit.SECONDS)).isTrue();
        assertThat(process.exitValue()).withFailMessage("%s", Files.readString(log)).isZero();
    }
}
