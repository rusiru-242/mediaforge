# MediaForge Performance & Resource Optimization

## 1. Concurrency Model & Resource Safeguards
Media processing (especially video transcoding) is CPU- and I/O-intensive. To prevent resource starvation, MediaForge enforces strict concurrency bounds across server, desktop, and mobile environments:

| Environment | Default Concurrency | Memory Headroom | Throttling Mechanism |
| :--- | :--- | :--- | :--- |
| **Spring Boot Backend** | 3 Concurrent Jobs | 1024 MB per JVM thread pool | ThreadPoolExecutor with ArrayBlockingQueue |
| **Flutter Desktop** | Sequential or 2 Parallel | Native OS memory limits | Riverpod AsyncQueue & worker isolation |
| **Flutter Mobile** | Sequential (1 Job) | Native Android/iOS Low-Memory guard | Foreground processing only |

---

## 2. Server-Side Process & Memory Optimization
1. **Thread Pooling**: `ConversionJobServiceImpl` uses a dedicated `ExecutorService` configured with `Runtime.getRuntime().availableProcessors()` capped at 4 concurrent tasks.
2. **Asynchronous Stream Gobblers**: FFmpeg process streams (`stdout`, `stderr`) are consumed concurrently by dedicated daemon threads to prevent pipe buffer deadlocks.
3. **Atomic File Writes**: Outputs are written to unique temp files before final atomic move.
4. **Scheduled Housekeeping**: Ephemeral files older than 24 hours are automatically purged by a Spring `@Scheduled` cron routine.

---

## 3. Client-Side (Desktop & Mobile) Optimization
1. **Zero-IPC Overhead for Offline Processing**: Desktop and mobile run FFmpeg commands directly against local filesystem paths, eliminating network upload/download delays.
2. **Streamed Chunk Downloads**: HTTP client streams binary chunks directly into local file sinks using `openWrite()`, maintaining negligible RAM usage (< 25MB) regardless of file size.
3. **Progress Calculation Throttling**: Download progress and speed updates are throttled to a 500ms cadence, preventing excessive UI repaints and frame drops.

---

## 4. Preset Efficiency Comparison

| Video Preset | Encoding Speed | Output Size (approx.) | Target Usage |
| :--- | :---: | :---: | :--- |
| **Original** | Ultra-Fast | 95-100% of source | Format container repacking / remuxing |
| **High** | Fast | ~18 MB / min | 1080p high-fidelity archival |
| **Balanced** | Fast | ~9 MB / min | Standard 720p web streaming & sharing |
| **Small** | Very Fast | ~4.5 MB / min | 480p low-bandwidth messaging |
