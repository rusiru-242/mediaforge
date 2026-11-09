# MediaForge — Mermaid Diagrams

**Document Version:** 1.0.0
**Phase:** 01 — Foundation & Architecture
**Last Updated:** 2026-11-09

> All diagrams are written in [Mermaid](https://mermaid.js.org/) syntax and can be rendered in GitHub, the Mermaid Live Editor, or any compatible Markdown viewer.

---

## Diagram 1 — Overall System Architecture

```mermaid
flowchart TD
    subgraph CLIENTS["Client Layer"]
        WEB["Next.js Web App\n(Browser)"]
        DESK["Flutter Desktop\n(Win / macOS / Linux)"]
        MOB["Flutter Mobile\n(Android / iOS)"]
    end

    subgraph GATEWAY["API Gateway / Reverse Proxy"]
        NGINX["Nginx / Cloud Load Balancer\n(TLS Termination · Rate Limiting · CORS)"]
    end

    subgraph BACKEND["Backend Layer — Spring Boot 3 / Java 21"]
        AUTH["AuthController\nSpring Security + JWT"]
        DL["DownloadController\nURL Analysis + Download Jobs"]
        CV["ConversionController\nFile Upload + Conversion Jobs"]
        JOB["JobController\nProgress + Cancellation"]
        ADM["AdminController\nSystem Metrics + User Mgmt"]
        SRVC["Service Layer\nBusiness Logic"]
        ADAPT["Source Adapter Registry\nPluggable URL Adapters"]
    end

    subgraph DATA["Data Layer"]
        PG[("PostgreSQL 16\nUsers · Jobs · History")]
        REDIS[("Redis 7\nJob Queue · Cache · Pub/Sub")]
    end

    subgraph WORKERS["Worker Layer"]
        W1["media-processor Worker 1"]
        W2["media-processor Worker 2"]
        WN["media-processor Worker N"]
        FFMPEG["FFmpeg / FFprobe\nMedia Processing Engine"]
    end

    subgraph STORAGE["Storage Layer"]
        LOCAL["Local Filesystem\n(Dev / Self-hosted)"]
        S3["S3-Compatible\n(AWS S3 · MinIO · R2)"]
    end

    WEB -->|HTTPS + WSS| NGINX
    DESK -->|HTTPS| NGINX
    MOB -->|HTTPS| NGINX

    NGINX --> AUTH
    NGINX --> DL
    NGINX --> CV
    NGINX --> JOB
    NGINX --> ADM

    AUTH --> SRVC
    DL --> SRVC
    CV --> SRVC
    JOB --> SRVC
    ADM --> SRVC

    SRVC --> ADAPT
    SRVC --> PG
    SRVC --> REDIS

    REDIS -->|BRPOP| W1
    REDIS -->|BRPOP| W2
    REDIS -->|BRPOP| WN

    W1 --> FFMPEG
    W2 --> FFMPEG
    WN --> FFMPEG

    W1 -->|Pub/Sub Progress| REDIS
    W2 -->|Pub/Sub Progress| REDIS
    WN -->|Pub/Sub Progress| REDIS

    FFMPEG --> LOCAL
    FFMPEG --> S3

    W1 --> PG
    W2 --> PG
    WN --> PG

    DESK -->|Offline Mode| FFMPEG_LOCAL["Bundled FFmpeg\n(Local Device)"]
    MOB -->|Offline Mode| FFMPEG_LOCAL
```

---

## Diagram 2 — Social Media Downloader Workflow

```mermaid
sequenceDiagram
    actor User
    participant UI as Web / Mobile UI
    participant API as Backend API
    participant AR as Adapter Registry
    participant SA as Source Adapter
    participant Q as Redis Queue
    participant W as Worker
    participant ST as Storage

    User->>UI: Paste URL
    UI->>API: POST /api/v1/download/analyze { url }
    API->>AR: findAdapter(url)
    AR->>SA: supports(url)
    SA-->>AR: true
    AR-->>API: adapter found
    API->>SA: extractInfo(url)
    SA-->>API: MediaInfo { title, thumbnail, qualities[] }
    API-->>UI: 200 OK { mediaInfo }
    UI-->>User: Display quality options

    User->>UI: Select quality + format → Click Download
    UI->>API: POST /api/v1/download/start { url, qualityId, format }
    API->>Q: LPUSH job { jobId, url, quality, format }
    API-->>UI: 202 Accepted { jobId }

    UI->>API: WS /ws/jobs/{jobId}
    Note over UI,API: WebSocket connection established

    W->>Q: BRPOP (blocking)
    Q-->>W: job { jobId, url, quality, format }
    W->>SA: startDownload(url, quality)
    SA-->>W: stream

    loop Download Progress
        W->>Q: PUBLISH progress { jobId, percent, speed, eta }
        Q-->>API: progress event
        API-->>UI: WS push { percent, speed, eta }
        UI-->>User: Update progress bar
    end

    W->>ST: upload(outputFile, key)
    W->>API: PATCH /jobs/{jobId} { status: COMPLETED, fileKey }
    API-->>UI: WS push { status: COMPLETED, downloadUrl }
    UI-->>User: Show download link
    User->>UI: Click Download
    UI->>API: GET /api/v1/files/{id}/download
    API-->>UI: 302 Redirect to signed URL
    UI-->>User: File downloaded
```

---

## Diagram 3 — Online Media Converter Workflow

```mermaid
sequenceDiagram
    actor User
    participant UI as Web / Mobile UI
    participant API as Backend API
    participant ST as Storage
    participant Q as Redis Queue
    participant W as Worker
    participant FF as FFmpeg

    User->>UI: Select file + output format
    UI->>API: POST /api/v1/convert/upload (multipart)
    Note over UI,API: File streamed to backend
    API->>ST: upload(inputFile, inputKey)
    ST-->>API: inputKey stored
    API-->>UI: 201 Created { uploadId, metadata }

    UI->>API: POST /api/v1/convert/start { uploadId, outputFormat, options }
    API->>Q: LPUSH job { jobId, inputKey, outputFormat, options }
    API-->>UI: 202 Accepted { jobId }

    UI->>API: WS /ws/jobs/{jobId}

    W->>Q: BRPOP job
    W->>ST: download(inputKey) → temp file
    W->>FF: ffmpeg -i input.ext [options] output.ext -progress pipe:1

    loop FFmpeg Progress
        FF-->>W: progress=N out_time=... speed=...
        W->>Q: PUBLISH { jobId, percent }
        Q-->>API: event
        API-->>UI: WS { percent, eta }
        UI-->>User: Progress bar update
    end

    FF-->>W: return code 0 (success)
    W->>ST: upload(outputFile, outputKey)
    W->>API: PATCH /jobs/{jobId} { status: COMPLETED, outputKey, expiresAt }
    API->>ST: generatePresignedUrl(outputKey, 1h)
    ST-->>API: signedUrl
    API-->>UI: WS { status: COMPLETED, downloadUrl, expiresAt }
    UI-->>User: "Conversion complete! Download available for 1 hour"
```

---

## Diagram 4 — Offline Media Converter Workflow

```mermaid
flowchart TD
    A["User opens Flutter Desktop / Mobile App"] --> B["Select 'Convert' tab"]
    B --> C["User picks input file from device"]
    C --> D["App reads file metadata\n(ffprobe or file headers)"]
    D --> E["Display file info:\nformat · duration · size · codec"]
    E --> F["User selects output format\n+ optional parameters"]
    F --> G["User clicks 'Convert'"]
    G --> H["Validate parameters"]
    H -->|Invalid| I["Show validation error"]
    I --> F
    H -->|Valid| J["Spawn Dart Isolate"]
    J --> K["Build FFmpeg command string"]
    K --> L["Process.start() bundled FFmpeg binary"]
    L --> M["Parse stdout for progress tokens\n'frame= fps= time= bitrate= speed='"]
    M --> N["StreamController.add(ProgressEvent)"]
    N --> O["UI rebuilds: BlocBuilder updates progress bar"]
    O --> P{FFmpeg exit code}
    P -->|0 = success| Q["Move output file to\nuser-selected destination"]
    Q --> R["Show success notification\nOpen file location button"]
    P -->|non-zero| S["Parse stderr for error message"]
    S --> T["Display human-readable error\nSuggested fix + Retry button"]
    T --> F
```

---

## Diagram 5 — Website / Mobile / Desktop Communication

```mermaid
flowchart LR
    subgraph WEB["Web App (Next.js)"]
        WAPI["API Client\n(Axios/Fetch)"]
        WSC["WebSocket Client"]
    end

    subgraph MOB["Mobile App (Flutter)"]
        MAPI["HTTP Client\n(Dio)"]
        MWSC["WebSocket Client"]
        MFFMPEG["Bundled FFmpeg\n(limited — audio/image)"]
    end

    subgraph DESK["Desktop App (Flutter)"]
        DAPI["HTTP Client\n(Dio)"]
        DWSC["WebSocket Client"]
        DFFMPEG["Bundled FFmpeg\n(full — video/audio/image)"]
    end

    subgraph BACKEND["Backend API\n(Spring Boot)"]
        REST["REST Endpoints\n/api/v1/**"]
        WS["WebSocket\n/ws/jobs/**"]
        EVENTS["SSE / Pub-Sub\nProgress Events"]
    end

    WAPI -->|HTTPS POST/GET| REST
    WSC -->|WSS| WS
    WS --> EVENTS

    MAPI -->|HTTPS| REST
    MWSC -->|WSS| WS
    MFFMPEG -->|Local Process| MFFMPEG

    DAPI -->|HTTPS| REST
    DWSC -->|WSS| WS
    DFFMPEG -->|Local Process| DFFMPEG

    style MFFMPEG fill:#e8f5e9,stroke:#43a047
    style DFFMPEG fill:#e8f5e9,stroke:#43a047
```

---

## Diagram 6 — GitHub Branching Workflow

```mermaid
flowchart LR
    MAIN["main\n(stable releases)"]
    DEV["develop\n(integration)"]
    PH01["chore/phase-01-foundation"]
    PH02["chore/phase-02-backend"]
    FEAT1["feat/video-download-engine"]
    FEAT2["feat/conversion-job-service"]
    FIX1["fix/ffmpeg-timeout"]
    HOTFIX["hotfix/security-patch"]

    PH01 -->|PR + Merge| DEV
    PH02 -->|PR + Merge| DEV
    FEAT1 -->|PR + Merge| DEV
    FEAT2 -->|PR + Merge| DEV
    FIX1 -->|PR + Merge| DEV
    DEV -->|Release PR + Merge| MAIN
    HOTFIX -->|Direct PR| MAIN
    MAIN -->|Cherry-pick| DEV

    style MAIN fill:#1a73e8,color:#fff,stroke:#1565c0
    style DEV fill:#34a853,color:#fff,stroke:#2e7d32
    style PH01 fill:#ff9800,color:#fff,stroke:#e65100
    style PH02 fill:#ff9800,color:#fff,stroke:#e65100
    style HOTFIX fill:#ea4335,color:#fff,stroke:#c62828
```

---

## Diagram 7 — High-Level Use Case Diagram

```mermaid
flowchart TD
    GUEST["👤 Guest User"]
    USER["👤 Registered User"]
    ADMIN["👤 Administrator"]
    SYSTEM["⚙️ System\n(Scheduled Tasks)"]

    subgraph DOWNLOAD["Download Features"]
        UC1["Paste & Analyze URL"]
        UC2["Select Quality & Format"]
        UC3["Download Media File"]
        UC4["Track Download Progress"]
        UC5["Cancel Download"]
    end

    subgraph CONVERT["Conversion Features"]
        UC6["Upload File Online"]
        UC7["Configure Conversion Options"]
        UC8["Start Online Conversion"]
        UC9["Convert Offline (Desktop/Mobile)"]
        UC10["Track Conversion Progress"]
        UC11["Download Converted File"]
    end

    subgraph BATCH["Batch & Queue"]
        UC12["Create Batch Job"]
        UC13["Manage Job Queue"]
        UC14["Retry Failed Job"]
    end

    subgraph ACCOUNT["Account Features"]
        UC15["Register Account"]
        UC16["Login / Logout"]
        UC17["View History"]
        UC18["Save Preferences"]
        UC19["Delete Account"]
    end

    subgraph ADMIN_FEATURES["Admin Features"]
        UC20["View System Metrics"]
        UC21["Manage Users"]
        UC22["Configure Adapters"]
    end

    subgraph SYS_TASKS["System Tasks"]
        UC23["Clean Up Expired Files"]
        UC24["Retry Stalled Jobs"]
        UC25["Send Notifications"]
    end

    GUEST --> UC1
    GUEST --> UC2
    GUEST --> UC3
    GUEST --> UC4
    GUEST --> UC5
    GUEST --> UC6
    GUEST --> UC7
    GUEST --> UC8
    GUEST --> UC9
    GUEST --> UC10
    GUEST --> UC11
    GUEST --> UC15

    USER --> UC1
    USER --> UC2
    USER --> UC3
    USER --> UC4
    USER --> UC5
    USER --> UC6
    USER --> UC7
    USER --> UC8
    USER --> UC9
    USER --> UC10
    USER --> UC11
    USER --> UC12
    USER --> UC13
    USER --> UC14
    USER --> UC16
    USER --> UC17
    USER --> UC18
    USER --> UC19

    ADMIN --> UC20
    ADMIN --> UC21
    ADMIN --> UC22

    SYSTEM --> UC23
    SYSTEM --> UC24
    SYSTEM --> UC25
```

---

## Diagram 8 — Database Conceptual ERD

```mermaid
erDiagram
    USERS {
        uuid id PK
        string email UK
        string password_hash
        string display_name
        string role
        boolean email_verified
        boolean active
        timestamp created_at
        timestamp updated_at
        timestamp last_login_at
    }

    JOBS {
        uuid id PK
        uuid user_id FK
        string session_id
        string type
        string status
        string input_format
        string output_format
        text source_url
        string original_name
        bigint file_size_bytes
        integer progress
        text error_message
        integer retry_count
        string input_file_key
        string output_file_key
        timestamp created_at
        timestamp updated_at
        timestamp completed_at
        timestamp expires_at
    }

    CONVERSION_OPTIONS {
        uuid id PK
        uuid job_id FK
        string option_key
        string option_value
    }

    SOURCE_ADAPTERS {
        string id PK
        string name
        boolean enabled
        string version
        timestamp created_at
    }

    USER_PREFERENCES {
        uuid user_id PK_FK
        string default_video_format
        string default_audio_format
        string default_image_format
        boolean notification_email
        timestamp created_at
        timestamp updated_at
    }

    REFRESH_TOKENS {
        uuid id PK
        uuid user_id FK
        string token_hash UK
        timestamp expires_at
        boolean revoked
        timestamp created_at
    }

    USERS ||--o{ JOBS : "creates"
    USERS ||--o| USER_PREFERENCES : "has"
    USERS ||--o{ REFRESH_TOKENS : "owns"
    JOBS ||--o{ CONVERSION_OPTIONS : "has"
```

