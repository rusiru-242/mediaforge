package com.mediaforge.backend.downloader.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.mediaforge.backend.converter.service.FFmpegProcessExecutor;
import com.mediaforge.backend.downloader.model.DownloadTask;
import com.mediaforge.backend.validation.UrlSecurityValidator;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import org.springframework.test.util.ReflectionTestUtils;
import com.sun.net.httpserver.HttpServer;
import java.net.*;
import java.io.*;
import java.nio.file.*;
import java.nio.charset.StandardCharsets;
import java.util.*;
import java.util.concurrent.*;
import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;

class ExtractorTransportTest {
    @TempDir Path dir;
    public static class Fixture {
        public static void main(String[] args) throws Exception {
            if (args[0].equals("fail")) { System.err.println("ERROR: HTTP 429 https://host/?token=SECRET"); System.exit(1); }
            Files.writeString(Path.of(args[1]), "ready"); Thread.sleep(20_000);
        }
    }
    List<String> command(String mode, Path signal) {
        return List.of(Path.of(System.getProperty("java.home"),"bin","java").toString(), "-cp",
                System.getProperty("surefire.test.class.path",System.getProperty("java.class.path")), Fixture.class.getName(), mode, signal.toString());
    }
    DownloadTask task() { return new DownloadTask(UUID.randomUUID(), URI.create("https://example.com/owned"), "mp4", "720p", 1000000, dir); }
    @Test void extractorTimeoutTerminatesProcessAndRemovesActiveEntry() throws Exception {
        var extractor = new YtDlpProcessExecutor(new ObjectMapper(), new FFmpegProcessExecutor());
        assertThatThrownBy(() -> extractor.runProcess(task(), command("wait",dir.resolve("signal")),1,line -> {}))
                .hasMessageContaining("time limit");
        assertThat((Map<?,?>)ReflectionTestUtils.getField(extractor,"activeProcesses")).isEmpty();
    }
    @Test void cancellationTerminatesActiveProcess() throws Exception {
        var extractor = new YtDlpProcessExecutor(new ObjectMapper(),new FFmpegProcessExecutor());
        var task=task(); Path signal=dir.resolve("signal");
        ExecutorService thread=Executors.newSingleThreadExecutor();
        try {
            Future<?> running=thread.submit(() -> { try { extractor.runProcess(task,command("wait",signal),20,line -> {}); } catch(IOException ex) { throw new UncheckedIOException(ex); } });
            long end=System.nanoTime()+TimeUnit.SECONDS.toNanos(5);
            while(!Files.exists(signal) && System.nanoTime()<end) Thread.sleep(10);
            assertThat(Files.exists(signal)).isTrue(); task.cancel(); extractor.cancel(task.getJobId());
            assertThatThrownBy(() -> running.get(3,TimeUnit.SECONDS)).hasCauseInstanceOf(UncheckedIOException.class);
            assertThat((Map<?,?>)ReflectionTestUtils.getField(extractor,"activeProcesses")).isEmpty();
        } finally { thread.shutdownNow(); }
    }
    @Test void shutdownTerminatesARealActiveProcess() throws Exception {
        var extractor = new YtDlpProcessExecutor(new ObjectMapper(), new FFmpegProcessExecutor());
        var task = task(); Path signal = dir.resolve("shutdown-signal");
        try (var thread = Executors.newSingleThreadExecutor()) {
            var running = thread.submit(() -> {
                try { extractor.runProcess(task, command("wait", signal), 20, line -> {}); }
                catch (IOException expected) { /* Termination is expected. */ }
            });
            long end = System.nanoTime() + TimeUnit.SECONDS.toNanos(5);
            while (!Files.exists(signal) && System.nanoTime() < end) Thread.sleep(10);
            assertThat(Files.exists(signal)).isTrue();
            extractor.shutdown();
            running.get(3, TimeUnit.SECONDS);
            assertThat((Map<?, ?>) ReflectionTestUtils.getField(extractor, "activeProcesses")).isEmpty();
        }
    }
    @Test void networkFailureIsClassifiedWithoutLeakingCredentials() {
        var extractor=new YtDlpProcessExecutor(new ObjectMapper(),new FFmpegProcessExecutor());
        assertThatThrownBy(() -> extractor.runProcess(task(),command("fail",dir.resolve("unused")),5,line -> {}))
                .hasMessageContaining("RATE_LIMITED").hasMessageNotContaining("SECRET");
    }
    @Test void proxyRejectsPrivateDestinations() throws Exception {
        try(var proxy=new ExtractorNetworkProxy(new UrlSecurityValidator())) {
            assertThat(proxyRequest(proxy,"CONNECT 127.0.0.1:8081 HTTP/1.1")).contains("502");
        }
    }
    @Test void expiredOrphansAreRemovedButFreshFilesRemain() throws Exception {
        var repository=mock(com.mediaforge.backend.repository.MediaFileRepository.class);
        when(repository.findAll()).thenReturn(List.of());
        var storage=new LocalStorageServiceImpl(dir.toString(),24,repository);
        Path old=dir.resolve("media/old.mp4"),fresh=dir.resolve("media/new.mp4");
        Files.writeString(old,"old");Files.writeString(fresh,"fresh");
        var time=java.nio.file.attribute.FileTime.from(java.time.Instant.now().minusSeconds(48*3600));
        Files.setLastModifiedTime(old,time);
        UUID job=UUID.randomUUID();Path scratch=storage.getScratchDirectory(job);Path partial=scratch.resolve("source.part");Files.writeString(partial,"partial");
        Files.setLastModifiedTime(partial,time);Files.setLastModifiedTime(scratch,time);
        storage.cleanupExpiredFiles();
        assertThat(Files.exists(old)).isFalse();assertThat(Files.exists(fresh)).isTrue();assertThat(Files.exists(scratch)).isFalse();
    }
    private String proxyRequest(ExtractorNetworkProxy proxy,String line) throws Exception {
        URI endpoint=URI.create(proxy.address());
        try(Socket client=new Socket(endpoint.getHost(),endpoint.getPort())) {
            client.setSoTimeout(3000);
            String auth=Base64.getEncoder().encodeToString(endpoint.getUserInfo().getBytes(StandardCharsets.UTF_8));
            client.getOutputStream().write((line+"\r\nProxy-Authorization: Basic "+auth+"\r\n\r\n").getBytes(StandardCharsets.UTF_8));
            return new BufferedReader(new InputStreamReader(client.getInputStream())).readLine();
        }
    }
    @Test void headFallbackFollowsAndValidatesGetRedirectsAndUsesFullContentRange() throws Exception {
        var validator=mock(UrlSecurityValidator.class);
        HttpServer server=HttpServer.create(new InetSocketAddress("127.0.0.1",0),0);
        server.createContext("/start",e -> { if(e.getRequestMethod().equals("HEAD"))e.sendResponseHeaders(405,-1); else { e.getResponseHeaders().set("Location","/media");e.sendResponseHeaders(302,-1); } e.close(); });
        server.createContext("/media",e -> { e.getResponseHeaders().set("Content-Type","video/mp4"); e.getResponseHeaders().set("Content-Range","bytes 0-1/12345");e.sendResponseHeaders(206,2);try(var out=e.getResponseBody()){out.write(new byte[2]);} });
        server.start();
        try {
            var client=new HttpDownloadClient(validator);
            ReflectionTestUtils.setField(client,"maxRedirects",3);ReflectionTestUtils.setField(client,"connectTimeoutMs",1000);ReflectionTestUtils.setField(client,"readTimeoutMs",1000);
            URI uri=URI.create("http://127.0.0.1:"+server.getAddress().getPort()+"/start");
            var response=client.probeHeaders(uri);
            assertThat(response.getContentLength()).isEqualTo(12345);
            verify(validator,atLeastOnce()).validateUri(uri.resolve("/media"));
        } finally { server.stop(0); }
    }
    @Test void guardedDirectHttpDownloadEnforcesSizeAndCancellation() throws Exception {
        var validator=mock(UrlSecurityValidator.class);
        HttpServer server=HttpServer.create(new InetSocketAddress("127.0.0.1",0),0);
        byte[] bytes=new byte[4096];new Random(7).nextBytes(bytes);
        server.createContext("/clip.mp4",e -> {e.getResponseHeaders().set("Content-Type","video/mp4");e.sendResponseHeaders(200,bytes.length);try(var out=e.getResponseBody()){out.write(bytes);} });server.start();
        try {
            var client=new HttpDownloadClient(validator);
            ReflectionTestUtils.setField(client,"maxRedirects",3);ReflectionTestUtils.setField(client,"connectTimeoutMs",2000);ReflectionTestUtils.setField(client,"readTimeoutMs",2000);
            URI uri=URI.create("http://127.0.0.1:"+server.getAddress().getPort()+"/clip.mp4");
            Path output=Files.createDirectory(dir.resolve("direct"));
            var task=new DownloadTask(UUID.randomUUID(),uri,"mp4","source",10000,output);
            var result=client.download(task,null);assertThat(Files.readAllBytes(result.getFilePath())).isEqualTo(bytes);
            var small=new DownloadTask(UUID.randomUUID(),uri,"mp4","source",10,output);
            assertThatThrownBy(() -> client.download(small,null)).hasMessageContaining("exceeds maximum");
            var cancelled=new DownloadTask(UUID.randomUUID(),uri,"mp4","source",10000,output);cancelled.cancel();
            assertThatThrownBy(() -> client.download(cancelled,null)).hasMessageContaining("cancelled");
        } finally {server.stop(0);}
    }
    @Test void cancellingBlockedHttpTransferClosesSocketsAndRemovesPartialFile() throws Exception {
        var validator=mock(UrlSecurityValidator.class);
        CountDownLatch release=new CountDownLatch(1),received=new CountDownLatch(1);
        HttpServer server=HttpServer.create(new InetSocketAddress("127.0.0.1",0),0);
        server.createContext("/slow.mp4",e -> {
            e.getResponseHeaders().set("Content-Type","video/mp4");e.sendResponseHeaders(200,4096);
            try(var out=e.getResponseBody()){out.write(1);out.flush();release.await(5,TimeUnit.SECONDS);}
            catch(Exception ignored){e.close();}
        });server.start();
        ExecutorService worker=Executors.newSingleThreadExecutor();
        try {
            var client=new HttpDownloadClient(validator);ReflectionTestUtils.setField(client,"maxRedirects",1);
            ReflectionTestUtils.setField(client,"connectTimeoutMs",1000);ReflectionTestUtils.setField(client,"readTimeoutMs",10000);
            URI uri=URI.create("http://127.0.0.1:"+server.getAddress().getPort()+"/slow.mp4");
            Path output=Files.createDirectory(dir.resolve("cancel"));var task=new DownloadTask(UUID.randomUUID(),uri,"mp4","source",10000,output);
            Future<?> running=worker.submit(() -> {try{client.download(task,p -> received.countDown());}catch(IOException ex){throw new UncheckedIOException(ex);}});
            assertThat(received.await(3,TimeUnit.SECONDS)).isTrue();task.cancel();
            assertThatThrownBy(() -> running.get(2,TimeUnit.SECONDS)).hasCauseInstanceOf(UncheckedIOException.class);
            try(var files=Files.list(output)){assertThat(files.count()).isZero();}
        } finally {release.countDown();worker.shutdownNow();server.stop(0);}
    }
}
