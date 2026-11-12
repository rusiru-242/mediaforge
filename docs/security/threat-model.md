# MediaForge STRIDE Threat Model

**Phase:** Phase 09 — Security Hardening, Testing & CI/CD  
**Architecture:** Zero-Database Ephemeral Architecture  
**Scope:** Backend (REST API), Web Portal (Next.js), Desktop (Flutter), Mobile (Flutter)

---

## 1. System Architecture Overview & Trust Boundaries

MediaForge is designed with an ephemeral, zero-database architecture. Data exists only during the active lifecycle of a download or conversion job:

```
+---------------------------------------------------------------------------------+
|                                 TRUST BOUNDARIES                                |
+---------------------------------------------------------------------------------+
|                                                                                 |
|  [External Internet]                                                            |
|          | (Media URLs)                                                         |
|          v                                                                      |
|  +--------------------+      HTTP/REST      +---------------------------------+ |
|  | Web Browser Client | ------------------> | MediaForge Spring Boot API      | |
|  +--------------------+                     +---------------------------------+ |
|                                                             |                   |
|                                                     [Process Boundary]          |
|                                                             v                   |
|                                                     +-----------------+         |
|                                                     | FFmpeg CLI Subp |         |
|                                                     +-----------------+         |
|                                                             |                   |
|                                                    [Storage Boundary]           |
|                                                             v                   |
|                                                     +-----------------+         |
|                                                     | Ephemeral Disk  |         |
|                                                     +-----------------+         |
|                                                                                 |
|  [Isolated Client Devices]                                                      |
|  +---------------------------------------------------------------------------+  |
|  | Desktop / Mobile Flutter Apps (100% Offline Capable)                      |  |
|  |   - Direct local file picker                                              |  |
|  |   - In-process / native bundled FFmpeg engine                             |  |
|  |   - Local sandbox / documents directory                                   |  |
|  +---------------------------------------------------------------------------+  |
+---------------------------------------------------------------------------------+
```

### Trust Zones
1. **Zone 1: Public Internet / Untrusted Input:** Remote media URLs provided by end-users.
2. **Zone 2: Client Web Browser:** Runs in the user's browser; potentially untrusted or compromised environment.
3. **Zone 3: API Gateway & Backend Application:** Spring Boot service running in a container or VM.
4. **Zone 4: Local Native Environment:** Flutter desktop and mobile apps running in user/sandbox context.

---

## 2. STRIDE Threat Analysis

### 2.1 Spoofing (Identity & Origin)
| Threat ID | Target | Description | Risk | Mitigation | Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **S-01** | Backend API | Attacker spoofs internal service IPs in media download requests to probe internal microservices. | High | `UrlSecurityValidator` blocks loopback, link-local, private RFC 1918 addresses, and cloud metadata (`169.254.169.254`). | **Mitigated** |
| **S-02** | Web Portal | Attacker attempts DNS rebinding to access local development servers via browser scripts. | Medium | Next.js CSP and Spring Boot CORS restrict origin and allowed headers. | **Mitigated** |
| **S-03** | User Identity | Account spoofing or session hijacking. | N/A | **Zero Accounts Policy:** The app has no login, no cookies, and no persistent user records. | **By Design** |

---

### 2.2 Tampering (Data Integrity)
| Threat ID | Target | Description | Risk | Mitigation | Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **T-01** | FFmpeg Process | Attacker injects arbitrary commands or flags via format names, codecs, or file paths. | Critical | Strict regex whitelist (`^[a-zA-Z0-9_-]{1,32}$`) on custom codecs; process arguments passed as arrays (`ProcessBuilder`), never through a shell. | **Mitigated** |
| **T-02** | File System | Path traversal (`../../etc/passwd`) via malicious uploaded filenames. | High | Files saved using generated UUID keys in isolated ephemeral directories. Download filenames stripped of directory separators. | **Mitigated** |
| **T-03** | Media Streams | In-transit tampering of media files during download. | Medium | Enforced HTTPS-only for sensitive destinations; SHA-256 verification supported where provided. | **Mitigated** |

---

### 2.3 Repudiation (Accountability)
| Threat ID | Target | Description | Risk | Mitigation | Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **R-01** | System Operations | Inability to track system failures or abuse patterns. | Low | Structured in-memory logs (correlation IDs, job IDs) without logging sensitive user URLs or query parameters. | **Mitigated** |
| **R-02** | User Activity Logging | User disputes historical actions or conversions. | N/A | **Privacy by Design:** No persistent user history is retained. Once temporary files expire (24h), all traces are eradicated. | **By Design** |

---

### 2.4 Information Disclosure (Confidentiality)
| Threat ID | Target | Description | Risk | Mitigation | Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **I-01** | Media Metadata | Uploaded/converted media leaks sensitive EXIF data (GPS location, device serial numbers, owner names). | High | Media processing automatically strips all metadata using `-map_metadata -1` by default. | **Mitigated** |
| **I-02** | HTTP Headers | Attacker reads server stack versions or error stack traces to fingerprint infrastructure. | Medium | Spring Boot `GlobalExceptionHandler` sanitizes all responses into standard RFC-7807 error structures; stack traces omitted in production. | **Mitigated** |
| **I-03** | Local Client Files | Flutter app stores temporary files in publicly readable system locations. | Medium | Mobile files stored in application-sandboxed directories (`getApplicationDocumentsDirectory`); desktop files saved strictly to explicit user-chosen directories. | **Mitigated** |

---

### 2.5 Denial of Service (Availability)
| Threat ID | Target | Description | Risk | Mitigation | Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **D-01** | Disk Exhaustion | Massive media uploads fill backend disk storage, bringing down the server. | High | 500 MB maximum file size limit enforced at stream level; scheduled 24-hour cleanup purge deletes orphaned files. | **Mitigated** |
| **D-02** | CPU / RAM Exhaustion | Processing complex media conversions monopolizes all system cores. | High | In-memory queue limits concurrent conversions; FFmpeg sub-processes spawned with execution timeouts and CPU priority constraints. | **Mitigated** |
| **D-03** | Decompression Bombs | Malicious images with huge canvas dimensions (e.g. 100,000 x 100,000) exhaust memory when decoded. | High | Strict pre-validation: `MAX_DIMENSION = 16384` px, `MAX_PIXELS = 100,000,000L`. Fails fast before memory allocation. | **Mitigated** |

---

### 2.6 Elevation of Privilege (Authorization)
| Threat ID | Target | Description | Risk | Mitigation | Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **E-01** | Process Subshell | Exploit in FFmpeg or parser leads to root execution on host container. | High | Backend runs under an unprivileged user (`nonroot`/`appuser`) in container; process executes with minimal required capabilities. | **Mitigated** |
| **E-02** | Flutter Native Bridges | Flutter desktop app executes native shell scripts with administrative privileges. | Medium | No elevated privileges requested in desktop manifests; file operations restricted to user-authorized file picker paths. | **Mitigated** |

---

## 3. Threat Modeling Summary Matrix

| Threat Category | Pre-Mitigation Risk | Post-Mitigation Risk | Primary Control |
| :--- | :--- | :--- | :--- |
| **Spoofing** | Medium | **Low** | Strict URI parsing & IP address validation |
| **Tampering** | Critical | **Low** | Parameterized process execution & regex whitelists |
| **Repudiation** | Low | **Low** | Ephemeral job correlation |
| **Information Disclosure** | High | **Low** | Automatic metadata stripping & zero-db storage |
| **Denial of Service** | High | **Low** | Stream size caps, dimension caps, process timeouts |
| **Elevation of Privilege** | High | **Low** | Unprivileged runtime & OS container isolation |
