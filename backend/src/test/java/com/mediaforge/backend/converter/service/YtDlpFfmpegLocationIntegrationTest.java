package com.mediaforge.backend.converter.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfSystemProperty;
import org.junit.jupiter.api.io.TempDir;
import org.springframework.test.util.ReflectionTestUtils;
import java.nio.file.*;
import java.util.List;
import java.util.concurrent.TimeUnit;
import static org.assertj.core.api.Assertions.*;

@EnabledIfSystemProperty(named = "mediaforge.media-integration", matches = "true")
class YtDlpFfmpegLocationIntegrationTest {
    @TempDir Path dir;
    @Test void resolvesPathCommandAndRunsRealYtDlpMp3Postprocessing() throws Exception {
        var executor = new FFmpegProcessExecutor();
        ReflectionTestUtils.setField(executor, "configuredFfmpegPath", "ffmpeg");
        Path location = Path.of(executor.getFfmpegLocation());
        assertThat(location.isAbsolute()).isTrue();
        assertThat(Files.isDirectory(location)).isTrue();
        Path wav = dir.resolve("tone.wav");
        run(List.of(executor.getFfmpegExecutable(), "-y", "-f", "lavfi", "-i", "sine=frequency=440:duration=1", wav.toString()));
        String script = "import sys; from yt_dlp import YoutubeDL; from yt_dlp.postprocessor.ffmpeg import FFmpegExtractAudioPP; "
                + "y=YoutubeDL({'ffmpeg_location':sys.argv[1]}); "
                + "p=FFmpegExtractAudioPP(y,preferredcodec='mp3',preferredquality='192'); "
                + "assert p.available; "
                + "p.run({'filepath':sys.argv[2],'ext':'wav','vcodec':'none','acodec':'pcm_s16le'})";
        run(List.of("python", "-c", script, location.toString(), wav.toString()));
        var result = new MediaProbeServiceImpl(new ObjectMapper()).probe(dir.resolve("tone.mp3").toFile());
        assertThat(result.hasAudio()).isTrue();
        assertThat(result.hasVideo()).isFalse();
        assertThat(result.getDurationSeconds()).isBetween(0.9, 1.2);
    }
    private void run(List<String> command) throws Exception {
        Path log = dir.resolve("command.log");
        Process process = new ProcessBuilder(command).redirectErrorStream(true).redirectOutput(log.toFile()).start();
        assertThat(process.waitFor(30, TimeUnit.SECONDS)).isTrue();
        assertThat(process.exitValue()).withFailMessage("%s", Files.readString(log)).isZero();
    }
}
