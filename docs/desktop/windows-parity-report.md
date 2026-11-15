# MediaForge Windows desktop implementation

Date: 2026-11-15. Target: Windows 11 x64, Flutter 3.47.5 / Dart 3.13.4.

## Website audit and feature mapping

The website source remains unchanged. Inspected `web/src/app/page.tsx`, the four
`converter/*/page.tsx` pages, `downloader/page.tsx`, `jobs/[id]/page.tsx`,
`formats`, `about`, `privacy`, `terms`, layout/navigation, editor controls,
`MediaForgeMark.tsx`, `apiClient.ts`, API DTOs, presets, image filters and audio
effects. Inspected the corresponding backend controllers, request/response
DTOs, job workers, storage and FFmpeg/probe services.

| Website workflow | Native Windows counterpart |
|---|---|
| Overview hero and four clickable tool cards | Dashboard with the same product text, tool organization and card decoration |
| Video editor | Native player; selected-range playback; trim endpoints/playhead buttons; cut intervals; draggable eight-handle crop; aspect presets/custom crop/zoom; video quality/format; audio extraction; volume/mute/effect levels; backend export |
| Audio editor | Native playback; decoded combined waveform; selected-range trim; volume; fade envelopes; five adjustable effects; format/bitrate/channels/sample rate; backend export |
| Image editor | Local image preview; free crop and aspect presets; rotation/flips; scaling; quality; Original/Vivid/Vivid Warm/Vivid Cool/Dramatic/Mono filters and manual adjustments; backend export |
| Downloader | Platform selection/detection; paste/clear/analyze; actual metadata and output options; backend size estimate; real job/cancel/save workflow |
| Batch converter | Multiple file picker and folder/file drop; per-file output format/quality; actual mixed-media batch jobs; cancellation; individual saves or ZIP |
| Job detail page | Embedded job state, actual progress, cancellation, output metadata and file actions on each tool |
| Supported formats | Dialog populated by `/formats` |
| About/privacy/terms | Desktop information dialogs summarizing local/backend behavior and source restrictions; these are not copies of the full website legal pages |
| Existing Flutter local converters | Retained under Settings → Open existing offline conversion tools |

The current website displays three downloader tabs. The desktop includes all six
platform categories explicitly requested for this task: YouTube, Facebook,
Instagram, TikTok, X/Twitter and direct media. A category being visible does not
mean every URL on that platform is accessible. No fabricated metadata, mock
formats or simulated progress are used.

## Design and desktop architecture

* Exact website palette: light page `#F8F9FF`, white cards, `#EFF4FF` inset areas;
  dark page `#020617`, `#0F172A` cards, `#1E293B` controls; brand `#6750F5`,
  primary `#4E31DC`, readable light lavender accents in dark mode.
* Bundled Plus Jakarta Sans 400–800 and Inter 400–700, with SIL OFL licenses.
  Fonts do not require an internet connection at runtime.
* Website film/play mark reproduced as Flutter vector artwork and Windows ICO;
  pill buttons, rounded 24 px cards, outlined fields, theme-aware hover/focus
  behavior and native desktop scrolling.
* Desktop sidebar, header, persisted light/dark switch, connection check,
  keyboard shortcuts, responsive side-by-side/stacked settings panels. Initial
  window sizing respects the primary display's DPI-adjusted work area.
* Main Windows presentation uses `DesktopWorkspace`; other platforms retain
  the existing `AppShell`. A shared editor implements video/audio/image modes.
* Visited tool state and scroll positions are retained. Leaving an edited/busy
  tool asks for confirmation; playback pauses while backend jobs continue.
  Closing the window asks before cancelling active work.
* `BackendApi` centralizes response validation, bounded requests, multipart
  streamed uploads, job operations and streamed downloads. Disk transfers use
  backpressure and temporary `.part` files, promoted only after completion.
* Local FFprobe inspects imported files. Local FFmpeg decodes bounded waveform
  previews; native media-kit/libmpv renders playback. Main exports use the
  existing backend. The older offline converters remain explicitly accessible.
* New runtime packages: `media_kit 1.2.6`, `media_kit_video 2.0.1`,
  `media_kit_libs_windows_video 1.0.11`. Windows native playback libraries are
  bundled by the plugin. `integration_test` is a development SDK dependency.
  The existing `screen_retriever 0.2.2` dependency is now declared directly for
  Windows work-area sizing; its native plugin was already used by window_manager.

## Actual endpoints integrated

All paths are relative to `http://localhost:8081/api/v1`:

| Method | Path | Purpose |
|---|---|---|
| GET | `/health` | Connection check/retry |
| GET | `/formats` | Real format catalog |
| POST | `/files/upload` | Streamed multipart media upload |
| POST | `/downloads/metadata` | Source analysis |
| POST | `/downloads` | Create download job with actual selection/media type |
| POST | `/conversions` | Editor export |
| POST | `/conversions/estimate-size` | Honest downloader estimates/unavailable ranges |
| POST | `/conversions/batch` | Mixed batch processing |
| GET | `/jobs/{id}` | Real state/progress/output file ID |
| POST | `/jobs/{id}/cancel` | Cancellation |
| GET | `/files/{id}/metadata` | Actual completed filename/type/size |
| GET | `/files/{id}/download` | Verified output delivery |
| GET | `/conversions/batch/{batchId}/zip` | Actual batch ZIP |

The desktop does not GET the original social page and save HTML as `.mp4`.
It does not confuse a job ID with an output file ID. Changing export selections
invalidates completed output. URL and selection controls lock while their
operation is active. Estimates remain unavailable when the backend cannot
estimate them; actual completed sizes come from file metadata.

## Confirmed shared backend fix

`VideoConversionServiceImpl` previously performed its final stream probe only
when a target height was specified. Source-resolution video exports now also
require a non-empty file, video stream, positive duration and audio when the
source had audio and mute was not requested. Wrong-stream exports throw rather
than becoming completed jobs. Two negative integration cases deliberately
provide audio-only and missing-audio outputs to verify rejection.

No database, API endpoint renaming, backend port change or website UI change.
The existing separately running backend was not stopped. Rebuild/restart it
normally to activate this additional guard in an already-running server.

## Verification

Executed:

* `flutter doctor -v`: Flutter 3.47.5, Windows 11 and Visual Studio 2026
  toolchain available, no doctor issues.
* `flutter pub get`: successful.
* `flutter analyze`: no issues.
* `flutter test`: 55 passed; eight opt-in live tests skipped in this ordinary run.
* `flutter test --timeout=5m --dart-define=MEDIAFORGE_LIVE=true test/backend_live_test.dart`:
  all eight passed against the running backend using generated, owned fixtures.
* `flutter run -d windows`: debug EXE built and actual application launched.
* `flutter test integration_test/desktop_flow_test.dart -d windows`: native
  Windows player/UI, imports, selected-range playback, video/audio/image exports,
  saved-file FFprobe inspection and mixed batch ZIP flow passed.
* Backend targeted build/tests:
  `mvnw.cmd -q "-Dmediaforge.media-integration=true" "-Dtest=VideoEditorMediaIntegrationTest,VideoConversionServiceTest" test`:
  24 tests passed, including the new wrong-stream rejection cases.
* `flutter build windows --release`: successful. Release directory contains
  the EXE, Flutter engine, libmpv, video/drop/window plugins and bundled fonts.

The layout suite visits every desktop page at 1920×1080, 1600×900, 1366×768,
1280×720 and 640×480, in both themes, and checks for layout exceptions. Crop
dragging and empty-editor disabled sliders have dedicated checks. Legacy mobile
shell/service tests remain passing.

Real HTTP fixtures verified: MP4 with video and audio after trim/crop/360p
conversion; MP3, M4A and WAV audio-only with effects/fades; filtered/cropped/
rotated/resized WebP; mixed MP4/JPG batch ZIP; estimates; cancellation; expired
file errors. Video/image dimensions, duration and stream presence were checked
using FFprobe. These local tests do not establish live platform availability.

One authorized live source was additionally tested using the user's previously
provided Instagram URL `https://www.instagram.com/reels/Dd_1Oc3JcKx/` through
the same Dart API client: analysis, MP4 job, polling and streamed save succeeded.
FFprobe confirmed H.264 video at **1080×1920**, audio, **28.210998 seconds** and
**8,963,443 bytes**. Evidence is in `apps/flutter_app/build/qa/authorized-source-result.json`.
This proves that specific accessible source at the time tested, not general
availability across Instagram or other platforms.

Release-launch check: the built EXE was started directly with Windows
`Start-Process`, remained responding with title `MediaForge` after the launching
shell ended, and loaded Flutter, libmpv, media-kit, drop and window-manager DLLs.
The Release assets contain all nine font files and both OFL licenses.

The optional native-dialog automation run opened the real Windows Open dialog,
but its filename control was not accessible through this automation session
(`Unsupported Pattern` / `ElementNotAvailableException`). That optional run did
**not pass**; successful programmatic native UI import/save tests do not prove
the Open/Save As interaction itself. No successful native-dialog test is claimed.
The opt-in helper is retained for an interactive Windows session:
`flutter test integration_test/desktop_flow_test.dart -d windows --dart-define=MEDIAFORGE_NATIVE_DIALOGS=true`.

Manual dialog/drop checks: open Video Editor, use Import or Ctrl+O, choose an
owned clip, drag each trim endpoint and play it; export, click Save to Disk,
choose a destination in Save As, then open the saved file/folder and copy its
path. Repeat for audio/image, drag a file from Explorer into each import area,
and test a mixed batch plus ZIP. These OS interactions still need manual
verification; they are not represented as passed by the fixture tests.

## Running and distribution

Executable (keep the entire containing Release folder):

`apps/flutter_app/build/windows/x64/runner/Release/mediaforge_desktop.exe`

Start the existing Spring Boot service on port 8081 for main-workspace exports
and downloads. The UI runs as a normal Windows process without a development
terminal. **This is not a fully standalone media-processing EXE**: the backend
requires its existing Java/FFmpeg/FFprobe/yt-dlp setup. Local preview also needs
FFprobe, and waveform decoding needs FFmpeg on PATH or configured in Settings.
Existing offline conversion tools require local FFmpeg instead of the backend.
Other Windows PCs may need the Microsoft Visual C++ runtime. No installer was
created and nothing was deployed or published.

Shortcuts: Ctrl+1…7 navigate; Ctrl+O imports in an editor/batch; Ctrl+E exports
the active editor; Ctrl+Space toggles video/audio playback. Native Tab/arrow
navigation and slider keys remain available.

## Remaining practical limitations

* Social downloads inherit the backend's actual accessibility/extractor limits.
  No live YouTube/Facebook/X success is claimed for this task. TikTok can still
  deny extraction; login, private content, DRM and regional restrictions are not
  bypassed. This task's verification used generated media, not unapproved URLs.
* The app does not bundle or automatically launch/manage the Java backend.
* A native image codec may not preview every backend-supported AVIF/TIFF input;
  that case shows an explicit preview-unavailable message. Export can still use
  the backend. Image color previews approximate FFmpeg's color processing.
* Crop/rotation and effects are applied during export. Crop editing displays the
  source coordinate system; the selection frame is the export rectangle.
* Video cuts are explicit excluded intervals; the native player previews the
  trim selection, not a concatenated playback of every cut. Export applies cuts.
* Folder drops import the files directly inside a folder, without recursively
  traversing nested folders. OS drag/drop and opening external applications need
  ordinary interactive Windows verification beyond synthetic widget events.
* Backend restart or expiry invalidates old file records; saved files remain.
  The app reports missing records rather than inventing a successful save.

## Changed file manifest

Flutter entry/theme/configuration:
`apps/flutter_app/.gitignore`, `lib/app.dart`, `lib/main.dart`,
`lib/core/theme/app_theme.dart`, `pubspec.yaml`, `pubspec.lock`.

New shared services:
`lib/core/services/backend_api.dart`, `lib/core/services/preview_probe.dart`.

New desktop presentation/application files under `apps/flutter_app/lib/features/desktop/`:
`desktop_workspace.dart`, `desktop_editor.dart`, `desktop_downloader.dart`,
`desktop_batch.dart`, `desktop_task.dart`, `desktop_widgets.dart`,
`crop_surface.dart`, `task_panel.dart`, `desktop_window.dart`.

New tests/tools under `apps/flutter_app/`:
`test/backend_api_test.dart`, `test/backend_live_test.dart`,
`test/desktop_workspace_test.dart`, `integration_test/desktop_flow_test.dart`,
`tool/bundle_fonts.py`, `tool/build_windows_icon.py`,
`tool/windows_dialog_driver.ps1`, `tool/verify_backend_source.dart`.

Windows: `windows/runner/main.cpp`, `windows/runner/Runner.rc`,
`windows/runner/resources/app_icon.ico`.

Bundled assets under `apps/flutter_app/assets/fonts/`:
`PlusJakartaSans-400.ttf`, `PlusJakartaSans-500.ttf`, `PlusJakartaSans-600.ttf`,
`PlusJakartaSans-700.ttf`, `PlusJakartaSans-800.ttf`,
`Inter-400.ttf`, `Inter-500.ttf`, `Inter-600.ttf`, `Inter-700.ttf`,
`PlusJakartaSans-OFL.txt`, `Inter-OFL.txt`.

Backend: `backend/src/main/java/com/mediaforge/backend/converter/service/VideoConversionServiceImpl.java`,
`backend/src/test/java/com/mediaforge/backend/converter/service/VideoEditorMediaIntegrationTest.java`.
This report: `docs/desktop/windows-parity-report.md`.
Machine-readable results and final EXE/AOT hashes:
`docs/desktop/windows-verification-2026-11-15.json`.
