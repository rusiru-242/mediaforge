package com.mediaforge.backend.downloader.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.mediaforge.backend.controller.FileController;
import com.mediaforge.backend.converter.service.*;
import com.mediaforge.backend.downloader.adapter.*;
import com.mediaforge.backend.downloader.model.*;
import com.mediaforge.backend.entity.*;
import com.mediaforge.backend.enums.*;
import com.mediaforge.backend.exception.ResourceNotFoundException;
import com.mediaforge.backend.repository.*;
import com.mediaforge.backend.service.FileService;
import com.sun.net.httpserver.HttpServer;
import org.junit.jupiter.api.*;
import org.junit.jupiter.api.condition.EnabledIfSystemProperty;
import org.junit.jupiter.api.io.TempDir;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import java.net.*;
import java.nio.file.*;
import java.util.*;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.ConcurrentHashMap;
import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/** Real binaries and HTTP fixture downloads; no third-party copyrighted media or external network needed. */
@EnabledIfSystemProperty(named = "mediaforge.media-integration", matches = "true")
class DownloaderMediaIntegrationTest {
    @TempDir static Path root;
    static HttpServer server;
    static URI fixture;
    static FFmpegProcessExecutor ffmpeg;
    static DownloadOutputVerifier verifier;
    static YtDlpProcessExecutor extractor;

    @BeforeAll static void prepareOwnedMedia() throws Exception {
        ObjectMapper mapper = new ObjectMapper();
        ffmpeg = new FFmpegProcessExecutor();
        ReflectionTestUtils.setField(ffmpeg, "timeoutSeconds", 60);
        verifier = new DownloadOutputVerifier(new MediaProbeServiceImpl(mapper));
        extractor = new YtDlpProcessExecutor(mapper, ffmpeg, verifier);
        assertThat(ffmpeg.isAvailable()).isTrue();
        assertThat(extractor.isAvailable()).isTrue();
        Path media = Files.createDirectories(root.resolve("fixture"));
        run(List.of(ffmpeg.getFfmpegExecutable(), "-y", "-f", "lavfi", "-i", "testsrc2=size=1920x1080:rate=10",
                "-f", "lavfi", "-i", "sine=frequency=440:sample_rate=44100", "-t", "1.2",
                "-map", "0:v", "-map", "0:v", "-map", "0:v", "-map", "1:a",
                "-filter:v:0", "scale=640:360", "-filter:v:1", "scale=1280:720", "-filter:v:2", "scale=1920:1080",
                "-c:v", "libx264", "-preset", "ultrafast", "-threads", "2", "-g", "10", "-c:a", "aac",
                "-adaptation_sets", "id=0,streams=v id=1,streams=a", "-f", "dash", media.resolve("fixture.mpd").toString()));
        run(List.of(ffmpeg.getFfmpegExecutable(), "-y", "-f", "lavfi", "-i", "sine=frequency=440", "-t", "1", "-c:a", "aac", media.resolve("audio.m4a").toString()));
        server = HttpServer.create(new InetSocketAddress("127.0.0.1", 0), 0);
        server.createContext("/", exchange -> {
            Path file = media.resolve(exchange.getRequestURI().getPath().substring(1)).normalize();
            if (!file.startsWith(media) || !Files.isRegularFile(file)) { exchange.sendResponseHeaders(404, -1); exchange.close(); return; }
            byte[] bytes = Files.readAllBytes(file);
            String name = file.getFileName().toString();
            exchange.getResponseHeaders().set("Content-Type", name.endsWith(".mpd") ? "application/dash+xml" : name.endsWith(".m4a") ? "audio/mp4" : "video/mp4");
            exchange.sendResponseHeaders(200, bytes.length);
            try (var body = exchange.getResponseBody()) { body.write(bytes); }
        });
        server.start();
        fixture = URI.create("http://127.0.0.1:" + server.getAddress().getPort() + "/fixture.mpd");
    }

    @AfterAll static void stop() { if (server != null) server.stop(0); }

    @ParameterizedTest
    @CsvSource({"mp4,360p", "mp4,720p", "mp4,1080p", "webm,360p", "mp3,192k", "m4a,source", "wav,lossless",
            "avi,360p", "mkv,360p", "mov,360p", "flv,360p"})
    void downloadsMergesVerifiesStoresAndServesRequestedMedia(String format, String quality) throws Exception {
        var registry = mock(MediaSourceAdapterRegistry.class);
        var adapter = mock(MediaSourceAdapter.class);
        when(registry.getAdapter(fixture)).thenReturn(adapter);
        when(adapter.download(any(), any())).thenAnswer(call -> extractor.download(call.getArgument(0), call.getArgument(1)));
        var jobs = mock(MediaJobRepository.class);
        var files = mock(MediaFileRepository.class);
        Map<UUID, MediaFile> saved = new ConcurrentHashMap<>();
        when(files.save(any())).thenAnswer(call -> { MediaFile file = call.getArgument(0); saved.put(file.getId(), file); return file; });
        when(files.findById(any())).thenAnswer(call -> Optional.ofNullable(saved.get(call.getArgument(0))));
        var storage = new LocalStorageServiceImpl(root.resolve(UUID.randomUUID().toString()).toString(), 24, files);
        UUID id = UUID.randomUUID();
        MediaJob job = new MediaJob(id, null, JobType.DOWNLOAD, SourceType.URL, null, format);
        when(jobs.findById(id)).thenReturn(Optional.of(job));
        when(jobs.save(any())).thenAnswer(call -> call.getArgument(0));
        var worker = new MediaDownloadServiceImpl(registry, storage, jobs, mock(JobEventRepository.class), 2, extractor, null, verifier);
        try {
            var options = new com.mediaforge.backend.converter.model.ConversionOptions();
            if (!DownloadOutputVerifier.isAudio(format)) options.setTargetResolution(quality);
            if ("mp3".equals(format)) options.setAudioBitrate(192);
            worker.submitDownloadJob(id, fixture, format, quality, options);
            for (int i = 0; i < 1200 && worker.isJobActive(id); i++) Thread.sleep(50);
            assertThat(worker.isJobActive(id)).as("job timeout").isFalse();
            assertThat(job.getStatus()).withFailMessage("Job failed: %s", job.getErrorMessage()).isEqualTo(JobStatus.COMPLETED);
            assertThat(job.getOutputFormat()).isEqualTo(format);
            MediaFile file = storage.getMediaFile(job.getOutputFileId());
            var resource = storage.loadAsResource(file.getId());
            var probe = verifier.verify(resource.getFile().toPath(), format, !DownloadOutputVerifier.isAudio(format));
            if (!DownloadOutputVerifier.isAudio(format)) assertThat(probe.getHeight()).isEqualTo(Integer.parseInt(quality.replace("p", "")));
            assertThat(file.getOriginalFilename()).endsWith("." + format);
            var conversions = mock(ConversionStorageService.class);
            when(conversions.getMediaFile(file.getId())).thenThrow(new ResourceNotFoundException("Not a conversion file"));
            var mvc = MockMvcBuilders.standaloneSetup(new FileController(mock(FileService.class), storage, conversions)).build();
            mvc.perform(get("/api/v1/files/{id}/download", file.getId()))
                    .andExpect(status().isOk()).andExpect(content().contentType(DownloadOutputVerifier.mimeType(format)))
                    .andExpect(header().string("Content-Disposition", "attachment; filename=\"MediaForge_" + (DownloadOutputVerifier.isAudio(format) ? "Audio" : "Video") + "." + format + "\""))
                    .andExpect(content().bytes(Files.readAllBytes(resource.getFile().toPath())));
        } finally { worker.shutdown(); }
    }

    @Test void rejectsAudioOnlySourceForVideoAndRejectsRenamedAudio() throws Exception {
        URI audio = fixture.resolve("audio.m4a");
        var task = new DownloadTask(UUID.randomUUID(), audio, "mp4", "360p", 5_000_000, root.resolve("no-video"));
        assertThatThrownBy(() -> extractor.download(task, null)).hasMessageContaining("no downloadable video");
        Path disguised = Files.copy(root.resolve("fixture/audio.m4a"), root.resolve("disguised.mp4"));
        assertThatThrownBy(() -> verifier.verify(disguised, "mp4", true)).hasMessageContaining("no video stream");
    }

    static void run(List<String> command) throws Exception {
        Path log = root.resolve("fixture-ffmpeg.log");
        Process p = new ProcessBuilder(command).directory(root.resolve("fixture").toFile())
                .redirectErrorStream(true).redirectOutput(log.toFile()).start();
        assertThat(p.waitFor(60, TimeUnit.SECONDS)).as("fixture generation timeout").isTrue();
        assertThat(p.exitValue()).withFailMessage("%s", Files.readString(log)).isZero();
    }
}
