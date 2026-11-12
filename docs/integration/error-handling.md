# MediaForge Error Handling & Fault Recovery

## 1. Error Taxonomy & Standardized Codes

MediaForge classifies all runtime faults into distinct deterministic categories across both frontend and backend layers:

| Code / Category | Description | Recovery Strategy |
| :--- | :--- | :--- |
| `INVALID_MEDIA_URL` | Malformed URL or non-HTTP/HTTPS protocol | Immediate client-side validation; clear user feedback |
| `SSRF_REJECTED` | Target IP resolves to loopback, private, or metadata range | Rejected with HTTP 400; logged for security audit |
| `UNSUPPORTED_FORMAT` | File format not supported by transcode engine | Intelligent UI filter prevents selection; API validation |
| `CORRUPT_MEDIA_HEADER`| File fails FFprobe header parsing or magic-byte check | Job marked FAILED; error message surfaces file corruption |
| `NETWORK_STREAM_TIMEOUT`| Upstream CDN or server drops connection during download | Partial file purged; UI offers one-click retry |
| `PROCESS_TIMEOUT` | Transcode takes longer than permitted threshold | Subprocess destroyed forcefully (`SIGKILL`); job aborted |
| `JOB_CANCELLED` | User requested job cancellation | Subprocess terminated immediately; temp files unlinked |

---

## 2. Collision Avoidance & File Preservation
To avoid overwriting user files on desktop and mobile platforms:
```dart
static String getUniqueOutputPath(String directory, String baseName, String extension) {
  final cleanExt = extension.startsWith('.') ? extension.substring(1) : extension;
  String targetPath = p.join(directory, '$baseName.$cleanExt');
  int counter = 1;
  while (File(targetPath).existsSync()) {
    targetPath = p.join(directory, '$baseName ($counter).$cleanExt');
    counter++;
  }
  return targetPath;
}
```
This guarantees that existing user files are never clobbered, even in repeated batch conversions.

---

## 3. Transient Failure Recovery
1. **Network Retries**: If a transient network glitch interrupts a download stream, the download UI exposes a "Retry" button that re-establishes the HTTP stream without re-entering the URL.
2. **Batch Item Retries**: When one file in a batch encounters a corrupted block, remaining files continue executing unaffected. The failed item displays a detailed error message with individual retry capability.
3. **Partial File Deletion**: Any cancelled or failed download immediately unlinks partial binary artifacts, ensuring zero lingering incomplete files.
