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

    @ParameterizedTest @ValueSource(strings = {"144p", "240p", "360p", "480p", "720p", "1080p", "1440p", "2160p", "4k"})
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

    @ParameterizedTest @ValueSource(strings = {"vivid", "vivid-warm", "vivid-cool", "dramatic", "mono"})
    void photoFiltersChangeDecodedVideoFrames(String filter) throws Exception {
        var options = new ConversionOptions();
        switch (filter) {
            case "vivid" -> { options.setBrightness(.03); options.setContrast(1.12); options.setSaturation(1.45); }
            case "vivid-warm" -> { options.setBrightness(.03); options.setContrast(1.1); options.setSaturation(1.3); options.setWarmth(.3); }
            case "vivid-cool" -> { options.setBrightness(.02); options.setContrast(1.1); options.setSaturation(1.3); options.setWarmth(-.3); }
            case "dramatic" -> { options.setBrightness(-.04); options.setContrast(1.4); options.setSaturation(.8); }
            case "mono" -> { options.setBrightness(0.); options.setContrast(1.15); options.setSaturation(0.); }
        }
        options.setStartTime(.2); options.setEndTime(.6); options.setTargetResolution("360p");
        var service = new VideoConversionServiceImpl(executor, probe);
        Path output = dir.resolve("filtered.mp4"), clean = dir.resolve("clean.mp4");
        assertThat(service.convertVideo(UUID.randomUUID(), source.toFile(), output.toFile(), "mp4", options, null).isSuccess()).isTrue();
        var plain = new ConversionOptions(); plain.setStartTime(.2); plain.setEndTime(.6); plain.setTargetResolution("360p");
        assertThat(service.convertVideo(UUID.randomUUID(), source.toFile(), clean.toFile(), "mp4", plain, null).isSuccess()).isTrue();
        var actual = probe.probe(output.toFile());
        assertThat(actual.hasVideo()).isTrue(); assertThat(actual.hasAudio()).isTrue(); assertThat(actual.getHeight()).isEqualTo(360);
        Path filteredPixels = dir.resolve("filtered.rgb"), cleanPixels = dir.resolve("clean.rgb");
        for (var entry : Map.of(output, filteredPixels, clean, cleanPixels).entrySet()) {
            runDecode(List.of("-i", entry.getKey().toString(), "-frames:v", "1", "-vf", "scale=32:32", "-pix_fmt", "rgb24", "-f", "rawvideo", entry.getValue().toString()));
        }
        byte[] filtered = Files.readAllBytes(filteredPixels), original = Files.readAllBytes(cleanPixels);
        double difference = 0;
        for (int i = 0; i < filtered.length; i++) difference += Math.abs(Byte.toUnsignedInt(filtered[i]) - Byte.toUnsignedInt(original[i]));
        assertThat(difference / filtered.length).isGreaterThan(.25);
        if (filter.equals("mono")) {
            double chroma = 0, sourceChroma = 0;
            for (int i = 0; i < filtered.length; i += 3) {
                chroma += Math.abs(Byte.toUnsignedInt(filtered[i]) - Byte.toUnsignedInt(filtered[i + 1]));
                sourceChroma += Math.abs(Byte.toUnsignedInt(original[i]) - Byte.toUnsignedInt(original[i + 1]));
            }
            // RGB decoding/encoding rounding can leave tiny channel differences.
            assertThat(chroma).isLessThan(sourceChroma * .1);
        }
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

    @ParameterizedTest @ValueSource(booleans = {true, false})
    void sourceResolutionExportsRejectMissingRequiredStreams(boolean audioOnly) throws Exception {
        Path invalid = dir.resolve(audioOnly ? "audio-only.m4a" : "missing-audio.mp4");
        runDecode(audioOnly
                ? List.of("-i", source.toString(), "-vn", "-c:a", "copy", invalid.toString())
                : List.of("-i", source.toString(), "-an", "-c:v", "copy", invalid.toString()));
        // Simulate an encoder producing a valid media file with the wrong streams.
        var wrongEncoder = org.mockito.Mockito.mock(FFmpegProcessExecutor.class);
        org.mockito.Mockito.when(wrongEncoder.execute(org.mockito.ArgumentMatchers.any(),
                org.mockito.ArgumentMatchers.anyList(), org.mockito.ArgumentMatchers.anyDouble(),
                org.mockito.ArgumentMatchers.any())).thenAnswer(invocation -> {
                    List<String> args = invocation.getArgument(1);
                    Files.copy(invalid, Path.of(args.get(args.size() - 1)), StandardCopyOption.REPLACE_EXISTING);
                    return true;
                });
        var options = new ConversionOptions(); options.setTargetResolution("source");
        assertThatThrownBy(() -> new VideoConversionServiceImpl(wrongEncoder, probe).convertVideo(
                UUID.randomUUID(), source.toFile(), dir.resolve("output.mp4").toFile(), "mp4", options, null))
                .isInstanceOf(IllegalStateException.class).hasMessageContaining("stream verification");
    }

    private void runDecode(List<String> args) throws Exception {
        List<String> command = new ArrayList<>(List.of(executor.getFfmpegExecutable(), "-y")); command.addAll(args);
        Path log = dir.resolve("decode.log");
        Process process = new ProcessBuilder(command).redirectErrorStream(true).redirectOutput(log.toFile()).start();
        assertThat(process.waitFor(30, TimeUnit.SECONDS)).isTrue();
        assertThat(process.exitValue()).withFailMessage("%s", Files.readString(log)).isZero();
    }
}
