package com.mediaforge.backend.downloader.service;

import com.mediaforge.backend.converter.model.*;
import com.mediaforge.backend.converter.service.MediaProbeService;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import java.nio.file.*;
import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;

class DownloadOutputVerifierTest {
    @TempDir Path dir;

    @Test void rejectsAudioRenamedToMp4AndMissingExpectedAudio() throws Exception {
        Path output = Files.writeString(dir.resolve("fake.mp4"), "bytes");
        MediaProbeService probe = mock(MediaProbeService.class);
        MediaProbeResult info = new MediaProbeResult();
        info.setFormatName("mov,mp4,m4a,3gp,3g2,mj2");
        info.setDurationSeconds(1);
        info.setSizeBytes(Files.size(output));
        info.getAudioStreams().add(new AudioStreamInfo());
        when(probe.probe(output.toFile())).thenReturn(info);
        var verifier = new DownloadOutputVerifier(probe);
        assertThatThrownBy(() -> verifier.verify(output, "mp4", true)).hasMessageContaining("no video stream");
        info.getAudioStreams().clear();
        info.getVideoStreams().add(new VideoStreamInfo());
        assertThatThrownBy(() -> verifier.verify(output, "mp4", true)).hasMessageContaining("missing its audio");
        assertThat(verifier.verify(output, "mp4", false)).isSameAs(info);
        info.setFormatName("matroska,webm");
        assertThatThrownBy(() -> verifier.verify(output, "mp4", false)).hasMessageContaining("container");
    }
}
