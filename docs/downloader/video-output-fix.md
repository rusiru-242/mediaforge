# Downloader video output verification

Implemented and tested on 14 November 2026. This report covers the downloader fix; the existing UI, theme and navigation edits in the working tree predate this task.

## Root cause and pipeline inspection

The original `YtDlpProcessExecutor.findDownloadedFile` selected the first matching file from the scratch directory. A separate-stream download can leave intermediate `.m4a` audio and video files beside the merged output. Directory order was not a reliable way to select the final output. The executor derived its returned container and MIME type from that selected filename. The worker trusted that result and the file endpoint served the resulting stored file and metadata. This is the concrete route by which an MP4 request could be completed and served as M4A.

The preceding changes in this working tree already narrowed selection to an exact filename, but they still did not verify actual media streams. This task replaces directory scanning with yt-dlp's final output manifest and validates the actual bytes before completion. A successful reproduction of the particular reported YouTube URL is still pending an authorized URL.

Additional findings:

- The frontend originally derived its output default from a native/source format. Source container and requested output are separate concepts.
- Video selectors did not explicitly require video in every branch and could ignore the requested resolution on their last fallback. WebM used the MP4-oriented selection strategy.
- M4A was not treated as an audio-only download format.
- Metadata could fabricate 1080p/720p/480p/360p options when no real video heights existed, and could include storyboard heights.
- Neither extractor success nor final job completion required FFprobe verification.
- The HTTP controller itself did not convert MP4 into M4A: it served the wrong file/metadata it was given.
- The running JVM on port 8081 started before these edits. Compiling Java does not replace classes already loaded in that JVM.

The inspected path is:

1. Platform selection and URL input call `/downloads/metadata`.
2. `PlatformMediaSourceAdapter` delegates supported extraction to `YtDlpProcessExecutor`.
3. Metadata reports real non-DRM video heights and separate audio formats; source container remains source metadata.
4. The frontend defaults video sources to MP4 and retains an explicitly requested supported format.
5. `/downloads` receives `selectedFormat`, `selectedQuality`, canonical `targetResolution`, and `mediaType`.
6. DTO validation and `DownloadServiceImpl` reject incompatible format/media-type combinations.
7. yt-dlp selects explicit video/audio streams and merges separate streams using FFmpeg.
8. The backend follows `after_move:filepath`, probes that file, and normalizes it into the requested output container.
9. The worker verifies the final file again after any requested edits, before storage or `COMPLETED`.
10. Existing storage and `FileController` serve that verified file with its final extension, MIME type, length and attachment filename.

## Implementation

Video selector branches explicitly require video, preserve the selected height, and require audio when usable source audio exists. Audio-only sources fail an MP4/WebM request. Silent video is permitted when the source genuinely lacks audio.

yt-dlp runs with `--ignore-config` so a local CLI configuration cannot inject audio extraction into a video request. Its `after_move:filepath` manifest identifies the actual final download; intermediate files are never selected by directory order. Manifest paths must identify one regular, non-partial file inside the job scratch directory.

Separate streams use yt-dlp's FFmpeg merger with a neutral intermediate container. FFprobe checks that the merged source has the required streams. A subsequent FFmpeg pass explicitly maps video and audio and writes the requested final container. Compatible H.264/AAC streams use stream copy for MP4; incompatible codecs are transcoded. WebM uses compatible VP8/VP9/AV1 video and Opus/Vorbis audio, transcoding when needed. MP3, M4A and WAV map only audio. M4A preserves compatible AAC audio or transcodes to AAC.

Selection-only options already applied by the extractor do not cause a second, unnecessary worker transcode. Explicit trim, crop, volume and other editing requests still run, followed by final verification.

`DownloadOutputVerifier` requires a positive finite duration, a matching positive file size, the expected container family, and the requested stream types. A video request rejects audio-only output, including M4A bytes renamed to `.mp4`. Audio is required when the source provides it, except when explicitly removed by an edit request. Audio requests reject video streams; embedded album art does not count as motion video. Cancellation and extractor/FFmpeg/FFprobe failure prevent successful completion.

The final YouTube download names are `MediaForge_Video.<format>` and `MediaForge_Audio.<format>`. Verified MP4 uses `video/mp4`; M4A uses `audio/mp4`; MP3 uses `audio/mpeg`.

The strategy follows [yt-dlp's format selection and output-stage documentation](https://github.com/yt-dlp/yt-dlp#format-selection) and [FFprobe's container/stream inspection](https://ffmpeg.org/ffprobe.html).

## Changed files for this fix

Production:

- `backend/src/main/java/com/mediaforge/backend/downloader/service/YtDlpProcessExecutor.java`
- `backend/src/main/java/com/mediaforge/backend/downloader/service/DownloadOutputVerifier.java` (new)
- `backend/src/main/java/com/mediaforge/backend/downloader/service/MediaDownloadServiceImpl.java`
- `backend/src/main/java/com/mediaforge/backend/downloader/model/DownloadedMedia.java`
- `backend/src/main/java/com/mediaforge/backend/dto/request/DownloadCreateRequest.java`
- `backend/src/main/java/com/mediaforge/backend/service/impl/DownloadServiceImpl.java`
- `backend/src/main/java/com/mediaforge/backend/converter/service/MediaProbeServiceImpl.java`
- `backend/src/main/java/com/mediaforge/backend/converter/service/FFmpegProcessExecutor.java`
- `web/src/app/downloader/page.tsx`
- `web/src/types/api.ts`

Tests:

- `backend/src/test/java/com/mediaforge/backend/downloader/service/DownloaderMediaIntegrationTest.java` (new)
- `backend/src/test/java/com/mediaforge/backend/downloader/service/YtDlpSelectionTest.java` (new)
- `backend/src/test/java/com/mediaforge/backend/downloader/service/DownloadOutputVerifierTest.java` (new)
- `backend/src/test/java/com/mediaforge/backend/downloader/DownloadOutputSelectionTest.java`
- `backend/src/test/java/com/mediaforge/backend/downloader/MediaDownloadServiceTest.java`
- `backend/src/test/java/com/mediaforge/backend/controller/DownloadControllerIntegrationTest.java`
- `backend/src/test/java/com/mediaforge/backend/service/DownloadServiceTest.java`
- `web/src/test/DownloaderPage.test.tsx`

The existing file controller and storage response logic required no changes; their output was verified by integration tests with real stored files.

## Executed tests

The complete backend suite executed with real-media integration enabled: **131 tests, 0 failures, 0 errors, 0 skipped**, including **12 real-media integration cases**. The frontend suite executed: **54 tests across 13 files passed**. `npx.cmd tsc --noEmit` passed.

The integration fixtures are original synthetic video and sine-wave audio generated with the installed FFmpeg, exposed through a temporary loopback HTTP server as a DASH manifest with separate video and audio representations. Actual installed yt-dlp, FFmpeg and FFprobe binaries perform the downloads, merging, normalization and verification. Storage uses the actual local storage implementation and in-memory test repositories; MockMvc exercises the actual file download controller and checks the full response body, Content-Type and Content-Disposition. These are not successful live YouTube download tests.

| Case | Executed result |
| --- | --- |
| MP4 360p | Passed; actual 360p video and audio |
| MP4 720p | Passed; actual 720p video and audio |
| MP4 1080p | Passed; actual 1080p video and audio |
| WebM 360p | Passed; actual video/audio transcoding |
| MP3 | Passed; audio-only encoding |
| M4A | Passed; audio-only AAC stream copy |
| WAV | Passed; audio-only PCM encoding |
| AVI / MKV / MOV / FLV | All four passed |
| Video request for audio-only source; M4A bytes renamed MP4 | Passed; both rejected |

Every successful real-media case checks final file extension, FFprobe streams/container/duration/size and HTTP response bytes/headers. Unit tests also check that missing-video and final-verification failures mark the worker job `FAILED` without saving an output, and that mismatched audio/video requests receive HTTP 400.

Reproduce from `backend`:

```powershell
.\mvnw.cmd -q '-Dmediaforge.media-integration=true' test
```

Without the opt-in system property, the real binary integration class is skipped. It requires working local yt-dlp, FFmpeg and FFprobe installations.

From `web`:

```powershell
npx.cmd tsc --noEmit
npm.cmd test -- --reporter=dot
```

## Remaining limitations and activation

No authorized YouTube URL was supplied, so successful live YouTube MP4/MP3/M4A downloads remain unverified. The existing unavailable-YouTube metadata test did execute successfully. Provider-specific restrictions can still cause a clear failed job; no substitution with audio-only output is allowed.

The updated backend needs a restart. Automatic approval review rejected the attempted stop/restart with “blocked by policy,” so the existing backend JVM was left running. Stop the old backend in its terminal, then run from `backend`:

```powershell
.\mvnw.cmd spring-boot:run '-Dspring-boot.run.arguments=--server.port=8081'
```

Start a new download after restarting; previously generated files do not change. Backend port 8081 is preserved. No database or Flutter changes were made.
