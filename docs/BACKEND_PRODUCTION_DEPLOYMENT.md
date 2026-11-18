# MediaForge backend production deployment

Prepared 2026-11-17. **Nothing has been deployed or purchased.** See
[audit](backend/production-audit.md) and [verification](backend/production-verification.json)
for actual checks and blockers. Docker build/run must still be verified on Linux
or a machine with a working Docker daemon; Windows Java tests do not prove that
the image works.

## Architecture and hosting recommendation

One Java 21 / Spring Boot 3.5.16 process, Maven executable JAR, `/api/v1` REST API,
local FFmpeg/FFprobe, yt-dlp plus Node 22. No database, accounts or embedded server
dependencies beyond Spring Boot. In-memory workers report actual progress; local
files have expiration/cleanup. HTTPS terminates at a trusted ingress/reverse proxy.

Run **one replica**. Job IDs, uploaded-file records and status disappear on restart.
A persistent volume retains bytes, not the corresponding in-memory records.
Clients must re-upload/recreate jobs after restart. Multiple replicas, autoscaling
and rolling deployments can route polls to an instance that does not own a job.
Do not advertise durable jobs or high availability with this architecture.

Recommendation: a **VPS** with Docker, HTTPS reverse proxy and monitored disk is
the best fit when sustained media processing is expected: it gives control over
CPU, disk quotas, egress and process limits. It also requires OS patching, firewall,
monitoring and backups of configuration. For managed deployment, Render or Railway
can run the Dockerfile; select an appropriately resourced instance and disable
autoscaling. Avoid sleeping/very small instances for long FFmpeg jobs. This is an
engineering recommendation, not a claim about current provider prices.

Initial capacity to benchmark: 2 vCPU, 4 GiB RAM, at least 10 GiB writable scratch
space, one download worker plus one conversion worker and one metadata inspection.
These are starting limits, not proven throughput guarantees. Several copies of a
500 MiB input can coexist during conversion/merging. Retained results can fill
the disk despite per-file limits; configure filesystem/volume quotas and alerts.

## Prerequisites and reproducible checks

Use Docker Engine/Desktop with Linux containers and AMD64 support. Use Java 21
and the Maven wrapper for non-container development. No Java/FFmpeg installation
on the host is needed to run the image. The wrapper configuration pins Maven
3.9.11. Image build stages use Maven/Temurin 21 and Node 22; runtime is Temurin
21 JRE Ubuntu Noble, UID/GID 10001. FFmpeg/FFprobe are OS packages; yt-dlp
`2026.10.26` with its default dependencies (including EJS) is installed in a venv.
No runtime auto-updating or downloaded remote JS components are enabled.

From repository root:

```sh
cd backend
./mvnw -B -ntp verify
# Optional: requires real FFmpeg/FFprobe/yt-dlp on PATH; fixtures are generated locally.
./mvnw -B -ntp -Dmediaforge.media-integration=true verify
cd ..
docker build --platform linux/amd64 -t mediaforge-backend:1.0.0 ./backend
docker run --rm --entrypoint sh mediaforge-backend:1.0.0 -c \
  'id; ffmpeg -version; ffprobe -version; /opt/extractor/bin/yt-dlp --version; node --version'
```

On the current Windows development machine, an additional real-JAR smoke test is
available after Maven packaging:

```powershell
.\backend\tools\production-smoke.ps1 -MediaToolsDirectory .\apps\flutter_app\vendor\windows\tools
```

It starts its own prod-profile JVM on port 18081, verifies actual tool-backed
health, HTTP errors, upload/conversion/download and FFprobe video/audio/resolution,
then stops only its own JVM. It does not stop the existing 8081 service, alter
production configuration, or replace Linux container verification. Evidence stays
under `backend/target/production-smoke-*`.

The Docker build skips tests; CI must execute `verify` separately. The backend
`.dockerignore` is an allowlist: no local env files, keys, logs, uploads, target,
Flutter artifacts or test fixtures are copied. Runtime build commands execute
each media tool as the non-root user and fail on missing dependencies. Rebuild
regularly to update system packages. Pin reviewed base-image digests in your
release pipeline and scan the JAR/image/SBOM before public launch. Check Spring
Boot, Node and OS support lifecycles; this work is not a vulnerability certification.

## Environment configuration

Cloud dashboards inject environment variables directly. Spring Boot does **not**
load a root `.env` automatically when running `java -jar`; Compose reads it for
interpolation. Copy `.env.example` locally only; never commit the resulting `.env`.

| Variable | Production default / meaning |
|---|---|
| `SPRING_PROFILES_ACTIVE` | `prod` in image; required for production hardening |
| `PORT` | `8081`; honors provider-assigned port, binds `0.0.0.0` |
| `CORS_ALLOWED_ORIGINS` | Empty: no browser origins allowed. Set exact HTTPS frontend origins separated by commas, no paths/trailing slash/wildcards |
| `STORAGE_LOCAL_PATH` | `/app/storage` in image; writable by UID 10001 |
| `UPLOAD_TEMP_PATH` | `/app/tmp` in image; multipart temporary files |
| `STORAGE_RETENTION_HOURS` | `6` in prod; hourly storage cleanup is not immediate deletion |
| `STORAGE_MINIMUM_FREE_BYTES` | `1073741824`; health DOWN and new expensive POSTs rejected with 503 below threshold |
| `FFMPEG_PATH`, `FFPROBE_PATH` | `/usr/bin/ffmpeg`, `/usr/bin/ffprobe` |
| `YTDLP_PATH` | `/opt/extractor/bin/yt-dlp` |
| `YTDLP_JS_RUNTIMES` | `node:/usr/local/bin/node` |
| `YTDLP_TIMEOUT_SECONDS` | `60` metadata deadline |
| `DOWNLOAD_TIMEOUT_SECONDS` | `3600` total extraction/download deadline |
| `DOWNLOAD_MAX_FILE_SIZE`, `CONVERTER_MAX_FILE_SIZE` | `524288000` bytes each |
| `UPLOAD_MAX_FILE_SIZE`, `UPLOAD_MAX_REQUEST_SIZE` | `500MB`, `510MB` |
| `DOWNLOAD_WORKERS`, `METADATA_CONCURRENCY`, `CONVERTER_MAX_CONCURRENT_JOBS` | `1`, `1`, `1` in prod; separate pools, so total native jobs can exceed one |
| `DOWNLOAD_QUEUE_CAPACITY`, `CONVERTER_QUEUE_CAPACITY` | `20` each; download queue capped at 100 |
| `CONVERTER_TIMEOUT_SECONDS` | `600` per processing operation |
| `FFMPEG_THREADS` | `2`; codec threading hint, not a CPU quota |
| `DOWNLOAD_CONNECT_TIMEOUT_MS`, `DOWNLOAD_READ_TIMEOUT_MS`, `DOWNLOAD_MAX_REDIRECTS` | `10000`, `30000`, `5` |
| `RATE_LIMIT_RPM` | `60`; progress polls get a separate budget of at least 600/min |
| `HTTP_MAX_THREADS`, `HTTP_MAX_CONNECTIONS`, `HTTP_ACCEPT_COUNT` | `40`, `200`, `50` |
| `FORWARD_HEADERS_STRATEGY` | `NONE`; see trusted proxy notes below |
| `JAVA_TOOL_OPTIONS` | Image uses 50% container RAM heap ceiling, exit on OOM, `/app/tmp` Java temp |

Do not disable runtime tool health checks in production. The test-only override
`app.runtime-checks.tools-enabled=false` exists for isolated HTTP contract tests.

## Docker local testing

For the existing localhost development Compose flow, `docker-compose.yml` explicitly
selects the `dev` profile (host port 8080 as before). Plain Java still defaults to
8081. Production commands below use the separate hardened backend-only file.

Prepare `.env` with your real HTTPS website origin; no provider credentials are
required by the application. For localhost browser development use the default
development profile instead of weakening prod CORS validation.

```sh
docker compose -f docker-compose.backend.prod.yml config
docker compose -f docker-compose.backend.prod.yml up --build -d
curl -i http://127.0.0.1:8081/actuator/health
curl -i http://127.0.0.1:8081/
curl -i http://127.0.0.1:8081/api/v1/conversions/formats
docker compose -f docker-compose.backend.prod.yml logs --tail=100 backend
```

Backend-only Compose sets CPU/memory/PID limits, init, no-new-privileges, dropped
capabilities, log rotation and a writable data volume. It binds the host port to
loopback for a local HTTPS reverse proxy. Do not add `-v /:/host` or mount secrets.
Provision volume ownership as UID/GID 10001 before mounting an existing disk.
`docker compose down` stops the local test service; do not run it against an
existing service without authorization. Avoid `down -v` if results must be kept.

## Health, errors and API contract

Use **`GET /actuator/health`** for provider health checks. It reports real media-tool
availability (cached for 30 seconds) and storage readiness, returning 503 on DOWN.
Only status/probe groups are public; no paths, process commands or component details.
Liveness/readiness probes are available, but the aggregate endpoint is the deployment
check for required media tools. Other Actuator routes return 403. Swagger/API docs
are disabled in prod. `/api/v1/health` remains the existing lightweight compatibility
endpoint and should not be used as proof that FFmpeg is installed.

`GET /`, `/api/v1`, and unknown application routes intentionally return 404. There
is no root controller. The historic 500 came from treating missing MVC resources
as general exceptions; the existing global handler fix is preserved and tested.
Invalid JSON/options/URLs return 4xx; unexpected failures return a generic 500,
with diagnostics in server logs. Disk admission returns 503 plus Retry-After.
Queue overflow marks the new job FAILED; clients must check the returned/polled
state rather than assume a 202 job will finish. Rate limits return 429/Retry-After.

| Routes under `/api/v1` | Purpose |
|---|---|
| `GET /health`, `GET /formats[/video,/audio,/image]` | Compatibility health/catalog |
| `POST /files/upload` | Multipart upload field `file` |
| `GET /files/{id}/metadata`, `/files/{id}/download` | Metadata / streamed attachment |
| `POST /downloads/validate`, `/downloads/metadata`; `GET /downloads/formats?url=...` | Real source inspection |
| `POST /downloads` | Download job using `url`, `selectedFormat`, `selectedQuality`, optional `mediaType` |
| `POST /conversions`, `/conversions/batch`, `/conversions/estimate-size` | Conversion, bounded batch, estimation |
| `GET /conversions/formats`, `/conversions/batch/{id}/zip` | Options / completed batch ZIP |
| `POST /jobs`; `GET /jobs/{id}`, `/jobs/{id}/progress`, `/jobs/{id}/progress/sse` | Job creation/status/progress |
| `POST /jobs/{id}/cancel`, `DELETE /jobs/{id}` | Real cancellation |

Global `GET /jobs` is disabled (403) in prod to prevent listing other users' file/
job identifiers. Current UI polls known IDs. Development listing is preserved.
Opaque file/job UUIDs act as capability links, not account authorization. Keep
them out of analytics/public logs; anyone given a valid link can access its media.

Production downloads admit only YouTube, Facebook and Instagram source hosts.
TikTok, X/Twitter, Vimeo and generic direct URL entry points are rejected before
extraction; legacy internal adapters are not new public platform support. Source
platform errors and metadata with no available streams must remain failures.

## Render setup (when ready; not executed)

Create a Docker Web Service from this repository/branch, root directory `backend`,
Dockerfile `Dockerfile`, build context `backend`. Set `SPRING_PROFILES_ACTIVE=prod`,
the exact `CORS_ALLOWED_ORIGINS`, storage/worker settings, and use Render's `PORT`.
Do not replace its port with the development URL. Set health path
`/actuator/health`, choose resources after benchmarking, keep a single instance.
If mounting a disk, use `/app/storage`, ensure UID 10001 can write, and account for
deploy interruption. Configure a custom HTTPS API domain only after health is UP.

**Render Environment Variables:**
* `SPRING_PROFILES_ACTIVE=prod`
* `YTDLP_PATH=/usr/local/bin/yt-dlp` (also symlinked to `/opt/extractor/bin/yt-dlp`)
* `FFMPEG_PATH=/usr/bin/ffmpeg`
* `FFPROBE_PATH=/usr/bin/ffprobe`
* `YTDLP_JS_RUNTIMES=node:/usr/local/bin/node`
* `CORS_ALLOWED_ORIGINS=https://your-frontend-domain.com`
* `STORAGE_LOCAL_PATH=/app/storage`
* `UPLOAD_TEMP_PATH=/app/tmp`
* `TMPDIR=/app/tmp`

Verify provider body-size, request-duration, temporary disk and outbound networking
limits before accepting large uploads. Disable automatic deploys during active jobs
or accept that in-memory jobs are lost.

See [Render web services](https://render.com/docs/web-services),
[Docker](https://render.com/docs/docker), and [disks](https://render.com/docs/disks).

## Railway setup (when ready; not executed)

Create a service using root directory `backend` with its Dockerfile. For a
repository-root build configuration set `RAILWAY_DOCKERFILE_PATH=backend/Dockerfile`
and **also** set the correct build/root context; the Dockerfile expects `pom.xml`
at the context root. Set prod/CORS/storage variables, use the assigned `PORT`,
health path `/actuator/health` and a single replica. Generate an HTTPS service
domain, then update allowed frontend origins and client builds. Mount a writable
volume at `/app/storage` only if retained bytes are required. Confirm current
volume/deploy limitations and gateway limits; files alone do not restore jobs.

See [Railway Dockerfiles](https://docs.railway.com/builds/dockerfiles),
[health checks](https://docs.railway.com/deployments/healthchecks), and
[volumes](https://docs.railway.com/volumes).

## VPS, HTTPS and trusted ingress

Use an updated x64 Linux host, Docker/Compose, and Caddy or Nginx with valid TLS.
Point your chosen API DNS name to the host, terminate HTTPS on 443 and proxy to
`127.0.0.1:8081`. Only 80/443 and restricted administration ports should be public;
never expose 8081 or Docker API publicly. Configure certificate renewal, OS updates,
disk quotas, CPU/memory limits, monitoring, log retention and abuse controls.
Set upload/body limits (500 MiB multipart, much smaller JSON requests), header/body
read deadlines, connection limits and proxy buffering/SSE settings explicitly.
Jobs are asynchronous: clients poll rather than hold an HTTP request for processing.

By default rate limiting uses the actual network peer. Behind an ingress this can
be an **aggregate proxy-wide limit**, not a per-end-user limit. Do not blindly trust
X-Forwarded-For from the internet. Set `FORWARD_HEADERS_STRATEGY=FRAMEWORK` only if
the sole reachable ingress strips/replaces Forwarded/X-Forwarded-* headers and its
network cannot be bypassed. Otherwise retain NONE and enforce per-client limits at
the edge, adjusting the aggregate application budget after load testing.

## Website, Android and Windows integration

* **Website:** build with `NEXT_PUBLIC_API_BASE_URL=https://YOUR-ACTUAL-API-HOST/api/v1`.
  It is public configuration, not a secret. Rebuild/redeploy Next.js after changing
  it. `web/Dockerfile` now accepts the build argument; production full-stack Compose
  requires it. The browser cannot resolve Docker's `backend` hostname. Runtime-only
  env changes do not rewrite the browser bundle. Backend CORS must name the exact
  website origin, including previews only if intentionally permitted.
* **Android:** a future build must use
  `--dart-define=MEDIAFORGE_ONLINE_API_BASE=https://YOUR-ACTUAL-API-HOST/api/v1`.
  APK signing stays unchanged; no app was rebuilt here. `10.0.2.2:8081` is an emulator
  debug fallback, not a production address. CORS is browser-specific and does not
  authenticate native clients. Offline editing remains local.
* **Windows:** current desktop uses LocalMediaApi and bundled tools; it does not
  automatically use the hosted API. HTTP-compatible endpoints are available, but
  routing desktop downloads through them requires a future explicit client change
  and installer rebuild. Existing offline behavior is unchanged. Do not claim the
  current installer is a hosted-backend client.

## Security and operational restrictions

URLs are scheme/host/IP validated; the extractor's authenticated loopback proxy
revalidates and pins outbound destinations including CDN redirects. Public source
hosts are allowlisted at production API admission. Add network-level egress denial
for private, loopback and cloud metadata ranges as defense in depth; do not treat
application validation as an independent network sandbox. No DRM, login/cookie or
private-content bypass is provided. Cloud/datacenter IPs may be blocked by platforms
even when the same URL works locally. Do not embed provider credentials in clients.

Worker queues, inspection concurrency, SSE counts, HTTP threads, upload/file sizes,
timeouts, and disk admission are bounded. These are basic abuse prevention, not a
complete anonymous-public-service anti-abuse system. Edge rate/bandwidth quotas and
resource monitoring are still required. Do not expose this service as an unlimited
public downloader. Do not log request bodies, signed media URLs or authentication
headers. Keep process output/server logs private with limited retention.

No completed online platform download in production has been verified. Do not
promise universal platform support or guaranteed 4K output. Test only owned or
authorized media and preserve real extractor/FFprobe failures.

## Troubleshooting and post-deployment checklist

* **Build fails:** check Linux AMD64 image tags/network/package indexes; inspect
  Maven errors. No Docker fallback installs Maven silently anymore.
* **Health DOWN:** inspect private logs, run tool version commands as UID 10001,
  verify volume ownership/free space. Never fake UP or disable required checks.
* **404 `/`:** expected. Use `/actuator/health` or documented `/api/v1` endpoints.
* **Browser blocked:** exact HTTPS CORS origin and browser-reachable build-time URL;
  credentials are disabled because there are no cookie-authenticated APIs.
* **429:** respect Retry-After, avoid repeated Analyze clicks, back off polling;
  check whether an ingress collapses users into one peer bucket.
* **503 / failed queued job:** storage threshold or worker capacity reached. Inspect
  disk/CPU/memory before increasing workers. HTTP success alone is not job success.
* **Missing file after restart:** in-memory record is gone. Re-upload; do not attempt
  to recover jobs by merely renaming existing files.
* **Platform denies access:** verify source availability from hosting region and
  supported extractor version. Report restrictions; do not install random bypass APIs.

Before public launch: build/start the Docker image; verify tools and non-root UID;
check aggregate health, 404, invalid JSON 400, blocked private URL, unsupported
platform rejection, upload/conversion/download/FFprobe, filename/MIME, cancellation,
cleanup, CORS allow/deny, HTTPS and client polling; test approved platform URLs from
the actual cloud IP; load-test CPU/RAM/disk and rate limits; scan vulnerabilities/
licenses and confirm support lifecycles; document restart/data-loss expectations.
Only then connect public clients. No hosting deployment or purchase is authorized
by this runbook itself.
