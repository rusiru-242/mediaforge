package com.mediaforge.backend.downloader.service;
import org.junit.jupiter.api.Test;
import static org.assertj.core.api.Assertions.*;
class DownloadFilenameTest {
    @Test void appendsVerifiedVideoResolutionBeforeExtension() {
        assertThat(YtDlpProcessExecutor.downloadFilename("Video Title", "mp4", false, 720)).isEqualTo("Video Title (720).mp4");
        assertThat(YtDlpProcessExecutor.downloadFilename("Video Title", "webm", false, 1080)).isEqualTo("Video Title (1080).webm");
        assertThat(YtDlpProcessExecutor.downloadFilename("Audio Title", "mp3", true, 720)).isEqualTo("Audio Title.mp3");
    }
    @Test void preservesUnicodeTitleAndUsesSelectedExtension() {
        assertThat(YtDlpProcessExecutor.downloadFilename("Dulan ARX - රැප් මල්සරා", "mp3", true))
                .isEqualTo("Dulan ARX - රැප් මල්සරා.mp3");
    }
    @Test void sanitizesUnsafeCharactersAndHandlesMissingTitles() {
        assertThat(YtDlpProcessExecutor.downloadFilename("A/B:clip\r\n", "mp4", false)).isEqualTo("A_B_clip__.mp4");
        assertThat(YtDlpProcessExecutor.downloadFilename("...", "wav", true)).isEqualTo("MediaForge_Audio.wav");
        assertThat(YtDlpProcessExecutor.downloadFilename("CON", "mp4", false)).isEqualTo("_CON.mp4");
        assertThat(YtDlpProcessExecutor.downloadFilename("අ".repeat(200), "mp3", true).getBytes(java.nio.charset.StandardCharsets.UTF_8).length).isLessThan(256);
    }
}
