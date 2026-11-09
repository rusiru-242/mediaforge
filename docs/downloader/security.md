# MediaForge Downloader — Security Architecture & Hardening

The MediaForge Downloader handles untrusted input (arbitrary URLs supplied by users) and downloads external streams into server storage. To prevent security vulnerabilities such as Server-Side Request Forgery (SSRF), Denial of Service (DoS), Remote Code Execution (RCE), and Path Traversal, MediaForge enforces defense-in-depth security controls.

---

## 1. Multi-Hop SSRF Defense

Attackers often attempt to exploit downloader endpoints to access internal private networks, cloud metadata, or internal administration interfaces.

### 1.1 IP and Subnet Filtering (`UrlSecurityValidator`)
Before any network connection is initiated, the target URI hostname is resolved to all IP addresses (`InetAddress.getAllByName(host)`). Every resolved IP address is verified against the following blocked CIDR ranges:
- **Loopback**: `127.0.0.0/8`, `::1`
- **RFC 1918 Private IPv4**: `10.0.0.0/8`, `172.16.0.0/12`, `192.168.0.0/16`
- **Link-Local & Cloud Metadata**: `169.254.0.0/16`, `fe80::/10`, `169.254.169.254` (AWS, GCP, Azure metadata services)
- **Carrier-Grade NAT & Testnets**: `100.64.0.0/10`, `198.51.100.0/24`, `203.0.113.0/24`
- **Multicast & Reserved**: `224.0.0.0/4`, `ff00::/8`

### 1.2 Disabled Automatic Redirects
A common SSRF bypass occurs when an initial public URL returns an HTTP 301/302 redirect pointing to an internal IP (e.g., `http://169.254.169.254/latest/meta-data`).

To mitigate this, `HttpDownloadClient`:
1. Configures `setInstanceFollowRedirects(false)`.
2. Inspects HTTP redirect codes (`301`, `302`, `303`, `307`, `308`).
3. Extracts the `Location` header and resolves relative URIs.
4. Passes the new redirect URI through `UrlSecurityValidator.validateUri(newUri)`.
5. Limits total redirects to 5 hops to prevent redirect loops.

---

## 2. Resource Limit & DoS Prevention

### 2.1 Enforced File Size Caps
- Downloader requests check `Content-Length` headers during probe and streaming.
- While writing to scratch storage, the engine counts bytes read in real-time. If the total exceeds `app.downloader.max-file-size` (500 MB by default), the download is immediately aborted, the connection closed, and the scratch file purged.

### 2.2 Socket & Connection Timeouts
- Connect timeout: `10,000 ms`
- Read timeout: `30,000 ms`
- Prevents slowloris-style resource exhaustion from unresponsive remote endpoints.

### 2.3 Cooperative Task Cancellation
- Active download tasks register their cancellation handle in `MediaDownloadService`.
- If a client or administrator requests `/api/v1/jobs/{id}/cancel`, the stream loop stops immediately, marks the task `CANCELLED`, and deletes partial files.

---

## 3. Storage & Path Traversal Protections

### 3.1 Filename Sanitization
- Filenames extracted from `Content-Disposition` or URL paths are stripped of path separators (`/`, `\`), null bytes (`%00`), control characters, and parent directory traversal (`..`).
- Safe fallback filenames (`media_<uuid>.<ext>`) are assigned if the filename cannot be safely extracted.

### 3.2 Canonical Storage Isolation
- Every temporary and permanent storage operation calls `toRealPath()` / `normalize()` to ensure the final path begins strictly with the configured root directory (`mediaforge_data/downloads`).
- Any attempt to escape the directory root throws `SecurityException`.

### 3.3 Ephemeral File Lifecycle & 24h Retention
- Files are kept for a maximum retention period (default: 24 hours).
- A scheduled cron task (`@Scheduled(cron = "0 0 * * * *")`) scans the storage directory and purges files older than 24 hours to prevent disk saturation.

