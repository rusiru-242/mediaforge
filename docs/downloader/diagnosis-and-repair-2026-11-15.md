# Downloader diagnosis and repair — 2026-11-15

## Actual request-to-file pipeline

1. `web/src/app/downloader/page.tsx` detects the platform using parsed hostnames, calls `apiClient`, and maintains analysis/job state. API defaults to `http://localhost:8081/api/v1` in `web/src/config/api.ts`.
2. `DownloadController` exposes `/downloads/validate`, `/downloads/metadata`, `/downloads/formats`, and `POST /downloads`.
3. `DownloadServiceImpl` validates URLs and request parameters, maps metadata DTOs, and creates UUID jobs in the existing in-memory repositories.
4. `MediaMetadataServiceImpl` and `MediaSourceAdapterRegistry` select direct media/image, social-platform, or generic HTTP adapters. Generic HLS/DASH manifests use the existing yt-dlp executor.
5. `PlatformMediaSourceAdapter` invokes `YtDlpProcessExecutor`. Metadata comes from real extractor JSON. Public oEmbed fallback can provide descriptive metadata but does not establish downloadability.
6. `MediaDownloadServiceImpl` queues work, tracks progress/cancellation, routes downloads/conversions, verifies the final result, stores its output ID, and cleans job scratch files.
7. yt-dlp selects video-containing streams and compatible audio. Separate streams merge into a neutral MKV intermediate. FFmpeg copies compatible streams or transcodes into the requested final container.
8. `DownloadOutputVerifier` uses FFprobe to check duration, file size, container and required streams. Video-only/audio-only mismatches fail the job.
9. `LocalStorageServiceImpl` stores verified files; `FileController` returns actual bytes, MIME type, length, and a safe filename. Non-ASCII names use UTF-8 Content-Disposition.
10. Scheduled cleanup handles expired records and aged orphan files left after an in-memory backend restart.

## Confirmed causes and repairs

| Finding | Repair |
|---|---|
| TikTok returns `Unexpected response from webpage request` for the supplied URL | Reproduced with a metadata-only yt-dlp command. Report a classified source-access/extractor error. Do not fabricate metadata, offer fake formats, or claim successful TikTok support. |
| MP4/M4A mixups in the historic extractor path | Retained and exercised the existing explicit stream-selection, merge, normalization, FFprobe verification pipeline. Added transport/selection regression coverage. Renaming an audio file never constitutes video success. |
| Bare `ffmpeg` command / WinGet links unsuitable as yt-dlp's tool location | Resolve executable symlinks and PATH entries; pass the real containing directory so ffprobe is discovered too. Test invokes actual yt-dlp MP3 postprocessing. |
| Fixed 600-second extractor download limit | Separate configurable download limit (`DOWNLOAD_TIMEOUT_SECONDS`, default 3600) from metadata timeout. Bounded socket timeout/retries, cancellation, and child-process termination remain enforced. |
| Platform recognition matched arbitrary URL text / lookalike hosts | Centralized parsed-host detection and safe URL normalization. Preserve raw media IDs/query encoding; reject embedded credentials and unsupported schemes. |
| Direct filenames such as `sample_1080p.mp4` invented source dimensions | Removed filename-based resolution inference. Show source quality until actual stream dimensions are known. |
| Largest separate stream advertised as complete media size | Stop presenting a single stream's size as the final merged output size. |
| Size estimates used invented fallback duration and resolution-derived bitrate | Downloader estimates require known duration and a known encoding bitrate. MP3 displays a range using duration × bitrate / 8 plus overhead. Unknown/source-copy/constant-quality outputs say unavailable; completed output size comes from file metadata. |
| GET fallback ignored redirects and could report two-byte range size as whole file | Follow and validate each fallback redirect and parse full `Content-Range` length. Reject unsuccessful fallback responses. |
| A cancelled/truncated HTTP body could return EOF as apparent success | Close the operation's network sockets on cancellation, check cancellation again after reading, reject Content-Length mismatches, and delete the partial file. A real blocked-transfer regression test exercises this path. |
| Extractor subprocess network requests bypassed application redirect/DNS checks | Added a per-operation loopback egress proxy: validate every outbound host, revalidate resolved addresses, and connect to the checked address. Applies to extractor requests and direct HTTP transfers. Extractor proxy uses ephemeral credentials; direct JVM proxy is loopback-only and operation-scoped. TLS verification remains enabled. |
| Untrusted local media could cause FFprobe/FFmpeg network fetches | Local probing and post-download processing permit only `file,pipe` protocols. Manifest extraction goes through the guarded network path. |
| Queue could grow without bound; progress could regress | Bounded worker count and pending queue. Reject overload as failed/retryable. Keep progress monotonic below completion and remove simulated unknown-duration progress. |
| Stale polling/URL edits could expose a previous result | Invalidate prior analysis/output on URL changes; ignore in-flight polls from older generations. Preserve source/format/quality locks during analysis and processing. |
| Scratch artifacts survived backend restart | Clean old orphan media/scratch artifacts as well as records; keep fresh artifacts. Normal job cleanup finishes before the active task is removed. |
| Backend clean compilation exposed missing saturation/warmth accessors | Added the missing fields/accessors to the existing in-memory `ConversionRequest`; no database introduced. |

## Platform evidence

| Platform | Test performed | Result / scope |
|---|---|---|
| Instagram | User-supplied authorized public reel: `/reels/Dd_1Oc3JcKx/`; real Java extractor path through the egress guard | Metadata and MP4 with video+audio succeeded. MP3 and M4A were converted from that downloaded video and verified. This does not imply all Instagram links work. |
| TikTok | User-supplied `@_pinsara_quotes_2/video/7685926451295587605`; real metadata-only extraction | Failed upstream with unexpected webpage response. No successful TikTok download claimed. No cookies, browser impersonation, authentication bypass, or alternate private endpoint used. |
| YouTube | Host/selection/metadata tests and generated local DASH with separate audio/video streams | Pipeline verified locally; no authorized live YouTube URL supplied for this audit. |
| Facebook | URL recognition and shared extractor/selection logic | Live platform download untested; no authorized URL supplied. |
| X/Twitter | URL recognition and shared extractor/selection logic | Live platform download untested; no authorized URL supplied. |
| Direct HTTP / DASH | Owned loopback fixtures; real yt-dlp/FFmpeg/FFprobe; HTTP delivery tests | MP4 360p/720p/1080p, WebM, AVI, MKV, MOV, FLV, MP3, M4A, WAV verified. Loopback allowance exists only in fixture-injected validators. |
| Other webpages | Unsupported MIME/HTML handling | Not automatically treated as supported videos. The additional non-supported URL supplied by the user was not fetched. |

## Versions and environment

- yt-dlp: `2026.10.26`, invoked as the available Python module fallback when no configured standalone executable exists.
- Python: 3.13 user installation.
- FFmpeg and FFprobe: `9.0.1-essentials_build`, installed through WinGet; executable symlinks resolve to the actual bin directory.
- No new third-party download service, authentication material, or database was added.
- Existing backend port 8081 and API contracts retained. Flutter and other applications were untouched.
- Running frontend/backend services were not stopped or restarted. Changes require normal user-controlled backend restart.

## Test coverage and commands

Deterministic coverage includes host identification, URL normalization, misleading domains, embedded credentials, metadata parsing, unavailable media, categorized errors, format/resolution selection, missing video/audio, actual containers, separate stream merging, bitrate estimates, actual output sizes, cancellation, process timeout/exit failure, private stream URL rejection, direct HTTP byte/size handling, redirect/range fallback, scratch cleanup and orphan expiry.

```powershell
cd web
npx.cmd tsc --noEmit
npm.cmd test -- --reporter=dot
npm.cmd run lint
npm.cmd run build

cd ../backend
.\mvnw.cmd -q test
.\mvnw.cmd -q -Dmediaforge.media-integration=true verify

# Explicitly opt in only with media you own or are authorized to download:
.\mvnw.cmd -q -Dmediaforge.platform-integration=true "-Dmediaforge.authorized-url=https://www.instagram.com/reels/Dd_1Oc3JcKx/" -Dtest=AuthorizedPlatformIntegrationTest test
```

External smoke tests are opt-in; normal tests do not claim live platform availability. The generated local fixtures exercise actual binaries and HTTP file delivery. Final run counts are recorded in `verification-2026-11-15.json` alongside this document.

Lint/build warnings already present outside the downloader concern the custom font in `app/layout.tsx`, the preview `<img>` in `ImageCropPreview.tsx`, and deprecation of `next lint`. They are warnings, not successful platform-download evidence.

## Manual verification

1. Restart the backend yourself on port 8081; services were intentionally left running during this audit. Restart the frontend normally if needed and refresh `/downloader`.
2. Paste an authorized public URL, analyze it, and confirm real metadata and source qualities. Check that platform/URL controls cannot change while busy.
3. Download MP4 and inspect actual video+audio; choose MP3/M4A to verify audio-only files. Format changes must remove the old Save to Disk result.
4. Check source-title/quality filenames and actual completed size. Unknown estimates must remain unavailable rather than fabricated.
5. Cancel a download, then confirm terminal job state and no continuing extraction process. Failed/unsupported/private sources must show a reason and no fake success.
6. Test any production target environment separately: source access, rate limits, region availability, and codecs can differ from this Windows workstation. No test here guarantees universal platform availability or watermark detection inside video pixels.

## Changed-file scope

See `verification-2026-11-15.json` for the exact source/test paths changed for this audit. Earlier unrelated UI changes already in the workspace were retained. No deployment or publishing was performed.
