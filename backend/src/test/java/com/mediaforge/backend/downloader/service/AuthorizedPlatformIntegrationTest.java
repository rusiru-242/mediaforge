package com.mediaforge.backend.downloader.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.mediaforge.backend.converter.service.*;
import com.mediaforge.backend.converter.model.ConversionOptions;
import com.mediaforge.backend.downloader.model.DownloadTask;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfSystemProperty;
import org.junit.jupiter.api.io.TempDir;
import org.springframework.test.util.ReflectionTestUtils;
import java.net.URI;
import java.nio.file.Path;
import java.util.UUID;
import static org.assertj.core.api.Assertions.*;

/** Opt-in only: caller must supply a URL they own or are authorized to download. */
@EnabledIfSystemProperty(named="mediaforge.platform-integration", matches="true")
class AuthorizedPlatformIntegrationTest {
    @TempDir Path dir;
    @Test void downloadsAuthorizedVideoAndProducesVerifiedMp4Mp3AndM4a() throws Exception {
        String url=System.getProperty("mediaforge.authorized-url");
        assertThat(url).isNotBlank();
        var mapper=new ObjectMapper();var ffmpeg=new FFmpegProcessExecutor();
        var probe=new MediaProbeServiceImpl(mapper);var verifier=new DownloadOutputVerifier(probe);
        var extractor=new YtDlpProcessExecutor(mapper,ffmpeg,verifier);
        ReflectionTestUtils.setField(extractor,"timeoutSeconds",30);
        ReflectionTestUtils.setField(extractor,"downloadTimeoutSeconds",120);
        var metadata=extractor.extractMetadata(URI.create(url));
        assertThat(metadata.getAvailableFormats()).withFailMessage("%s",metadata.getMessage()).isNotEmpty();
        var task=new DownloadTask(UUID.randomUUID(),URI.create(url),"mp4","source",100_000_000,dir);
        var output=extractor.download(task,null);
        var actual=verifier.verify(output.getFilePath(),"mp4",true);
        assertThat(actual.hasVideo()).isTrue();assertThat(actual.hasAudio()).isTrue();
        for(String format:new String[]{"mp3","m4a"}) {
            Path audio=dir.resolve("authorized."+format);var options=new ConversionOptions();options.setAudioBitrate(192);
            assertThat(new AudioConversionServiceImpl(ffmpeg,probe).convertAudio(UUID.randomUUID(),output.getFilePath().toFile(),audio.toFile(),format,options,null).isSuccess()).isTrue();
            assertThat(verifier.verify(audio,format,false).hasAudio()).isTrue();
        }
    }
}
