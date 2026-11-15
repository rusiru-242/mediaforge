package com.mediaforge.backend.downloader.service;

import com.mediaforge.backend.validation.UrlSecurityValidator;
import java.io.*;
import java.net.*;
import java.nio.charset.StandardCharsets;
import java.util.*;
import java.util.concurrent.*;

/** Per-extraction loopback proxy. Validates and pins every outbound connection, including redirects/CDNs. */
final class ExtractorNetworkProxy implements AutoCloseable {
    private final ServerSocket listener;
    private final UrlSecurityValidator validator;
    private final Set<Socket> sockets = ConcurrentHashMap.newKeySet();
    private final String password = UUID.randomUUID().toString();
    private final boolean requireAuth;
    private final ExecutorService workers = new ThreadPoolExecutor(0, 32, 10, TimeUnit.SECONDS,
            new SynchronousQueue<>(), r -> { Thread t = new Thread(r, "extractor-egress"); t.setDaemon(true); return t; });
    private volatile boolean closed;

    ExtractorNetworkProxy(UrlSecurityValidator validator) throws IOException {
        this(validator, true);
    }

    ExtractorNetworkProxy(UrlSecurityValidator validator, boolean requireAuth) throws IOException {
        this.validator = validator;
        this.requireAuth = requireAuth;
        listener = new ServerSocket(0, 16, InetAddress.getByName("127.0.0.1"));
        Thread accept = new Thread(() -> {
            while (!closed) {
                try {
                    Socket client = listener.accept(); sockets.add(client);
                    try { workers.submit(() -> handle(client)); }
                    catch (RejectedExecutionException ex) { sockets.remove(client); client.close(); }
                } catch (IOException ex) { if (closed) return; }
            }
        }, "extractor-egress-accept");
        accept.setDaemon(true); accept.start();
    }

    String address() { return "http://mediaforge:" + password + "@127.0.0.1:" + listener.getLocalPort(); }

    private void handle(Socket client) {
        Socket remote = null;
        try {
            client.setSoTimeout(30_000);
            InputStream input = client.getInputStream();
            String request = line(input);
            String[] parts = request.split(" ", 3);
            if (parts.length != 3) throw new IOException("Invalid proxy request.");
            List<String> headers = new ArrayList<>();
            String auth = ""; int total = 0;
            for (String header; !(header = line(input)).isEmpty();) {
                total += header.length(); if (total > 65536) throw new IOException("Headers too large.");
                if (header.toLowerCase(Locale.ROOT).startsWith("proxy-authorization:")) auth = header.substring(header.indexOf(':')+1).trim();
                else if (!header.toLowerCase(Locale.ROOT).startsWith("proxy-connection:")) headers.add(header);
            }
            String expected = "Basic " + Base64.getEncoder().encodeToString(("mediaforge:"+password).getBytes(StandardCharsets.UTF_8));
            if (requireAuth && !expected.equals(auth)) { respond(client, "407 Proxy Authentication Required", "Proxy-Authenticate: Basic realm=\"MediaForge\"\r\n"); return; }
            boolean tunnel = "CONNECT".equals(parts[0]);
            URI destination = URI.create(tunnel ? "https://" + parts[1] : parts[1]);
            validator.validateUri(destination);
            InetAddress[] addresses = InetAddress.getAllByName(destination.getHost());
            for (InetAddress address : addresses) validator.validateAddress(address, destination.getHost());
            int port = destination.getPort() > 0 ? destination.getPort() : "https".equalsIgnoreCase(destination.getScheme()) ? 443 : 80;
            remote = new Socket(); sockets.add(remote);
            remote.connect(new InetSocketAddress(addresses[0], port), 10_000); remote.setSoTimeout(30_000);
            if (tunnel) respond(client, "200 Connection Established", "");
            else {
                if (!Set.of("GET", "HEAD", "POST").contains(parts[0])) throw new IOException("Unsupported HTTP method.");
                String path = destination.getRawPath(); if (path == null || path.isEmpty()) path = "/";
                if (destination.getRawQuery() != null) path += "?" + destination.getRawQuery();
                OutputStream output = remote.getOutputStream();
                output.write((parts[0]+" "+path+" "+parts[2]+"\r\n"+String.join("\r\n",headers)+"\r\n\r\n").getBytes(StandardCharsets.ISO_8859_1)); output.flush();
            }
            Socket upstream = remote;
            Future<?> upload = workers.submit(() -> copy(input, upstream, true));
            try { remote.getInputStream().transferTo(client.getOutputStream()); client.getOutputStream().flush(); }
            finally { upload.cancel(true); }
        } catch (Exception ex) {
            try { respond(client, "502 Bad Gateway", ""); } catch (IOException ignored) {}
        } finally {
            sockets.remove(client); try { client.close(); } catch (IOException ignored) {}
            if (remote != null) { sockets.remove(remote); try { remote.close(); } catch (IOException ignored) {} }
        }
    }

    private static void copy(InputStream input, Socket remote, boolean shutdown) {
        try { input.transferTo(remote.getOutputStream()); remote.getOutputStream().flush(); if (shutdown) remote.shutdownOutput(); }
        catch (IOException ignored) {}
    }
    private static String line(InputStream input) throws IOException {
        ByteArrayOutputStream bytes = new ByteArrayOutputStream();
        for (int ch; (ch = input.read()) != -1;) {
            if (ch == '\n') return bytes.toString(StandardCharsets.ISO_8859_1).replace("\r", "");
            if (bytes.size() >= 8192) throw new IOException("Line too large."); bytes.write(ch);
        }
        throw new EOFException();
    }
    private static void respond(Socket socket, String status, String headers) throws IOException {
        socket.getOutputStream().write(("HTTP/1.1 "+status+"\r\n"+headers+"\r\n").getBytes(StandardCharsets.ISO_8859_1)); socket.getOutputStream().flush();
    }
    @Override public void close() {
        closed = true; try { listener.close(); } catch (IOException ignored) {}
        for (Socket socket : sockets) try { socket.close(); } catch (IOException ignored) {}
        workers.shutdownNow();
    }
}
