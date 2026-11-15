package com.mediaforge.backend.downloader;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.mediaforge.backend.converter.service.FFmpegProcessExecutor;
import com.mediaforge.backend.downloader.service.YtDlpProcessExecutor;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import java.nio.file.Files;
import java.nio.file.Path;
import static org.assertj.core.api.Assertions.assertThat;

class DownloadOutputSelectionTest {
    @TempDir Path scratch;

    @Test
    void selectsReportedFinalOutputInsteadOfIntermediateAudio() throws Exception {
        var executor = new YtDlpProcessExecutor(new ObjectMapper(), new FFmpegProcessExecutor());
        var method = YtDlpProcessExecutor.class.getDeclaredMethod(
                "readFinalOutput", Path.class, Path.class);
        method.setAccessible(true);
        Files.writeString(scratch.resolve("job.f140.m4a"), "audio");
        Files.writeString(scratch.resolve("job.f137.mp4"), "video only");
        var merged = Files.writeString(scratch.resolve("job.mp4"), "merged video and audio");
        Path manifest = Files.writeString(scratch.resolve("final-path.txt"), merged.toAbsolutePath().toString());
        assertThat(method.invoke(executor, scratch, manifest)).isEqualTo(merged);
    }
}
