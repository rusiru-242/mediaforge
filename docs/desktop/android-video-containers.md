# Android local video containers

The Android engine edits through Media3, producing a temporary H.264/AAC MP4.
For MOV and MKV, FFmpeg copies compatible streams into the requested container.
WEBM uses VP9/Opus; AVI uses MPEG-4 Part 2/MP3. These operations run on-device,
without Java, Spring Boot, network calls, or shell commands. Resolution, crop,
trim, cuts, filters, mute and audio effects are applied before container export.

Progress allocates 80% to editing and 19% to packaging, with completion only
after FFprobe verifies container, video/audio streams, dimensions and duration.
Cancellation targets the native FFmpeg session and removes partial output and
the intermediate MP4. Output names and Android document MIME types match the
actual container.

Dependency: `dev.ffmpegkit-maintained:ffmpeg-kit-full:8.1.9` (non-GPL variant),
pinned from Maven Central. Published native ABIs are arm64-v8a and x86_64;
32-bit Android devices are not supported by this build.

Upstream source and build scripts:
https://github.com/ffmpegkit-maintained/ffmpeg

Artifact metadata:
https://repo.maven.apache.org/maven2/dev/ffmpegkit-maintained/ffmpeg-kit-full/8.1.9/

The LGPL license is packaged in Android assets under
`licenses/FFmpegKit-LGPL-3.0.txt`. Preserve upstream notices, corresponding
source/build materials and LGPL relinking rights when redistributing an app
containing these native libraries. This development build is not a completed
store-distribution licensing review.

The iOS AVFoundation engine is unchanged; these new container exports are
Android-specific. iOS needs a separately validated processing implementation.

Execute the generated-fixture emulator test with:

```powershell
flutter test integration_test/mobile_containers_test.dart -d emulator-5554
```

The test blocks Dart HTTP clients and verifies each real output's container,
streams, cropped dimensions, duration, extension and size. Do not infer physical
device compatibility or iOS support from an Android emulator result.

## Executed verification (2026-11-17)

Android x86_64 emulator `mobile_containers_test.dart`: passed. All four exports
contained video and audio, with a 160x240 cropped output and approximately
one-second selected duration. FFprobe reported WEBM (51,212 bytes), MOV
(54,773 bytes), MKV (54,097 bytes), and AVI (78,446 bytes). Intermediate cleanup
also passed. These sizes describe only the generated test fixture.

Existing `mobile_native_test.dart`: both integration tests passed, including 17
checks for MP4 trim/crop/resize, cuts, M4A/WAV processing, effects, images,
transparency, mixed batch processing, cancellation, gallery export, ZIP and
cleanup. Native interactive Save As/file picker checks are opt-in and were not
executed in this run.

Flutter analysis passed. Twelve focused video/export/batch widget/unit tests
passed. Logs are in `apps/flutter_app/build/mobile-containers-integration.log`
and `mobile-native-container-regression.log`.

## Android audio formats

The same bundled local engine now advertises MP3, WAV, AAC (ADTS), FLAC and OGG
(Vorbis), retaining M4A where the device AAC encoder is available. Trim, cuts,
volume, effects and fades are rendered to streamed PCM before audio encoding;
WAV remains PCM and FLAC is lossless relative to that processed PCM. Lossless
output does not restore detail missing from a lossy source. WAV/FLAC do not
display lossy bitrate controls. The shared capability list also supplies batch
conversion and the Video Editor's Export Audio mode.

`mobile_audio_formats_test.dart` passed on the Android emulator with Dart HTTP
clients disabled: all six real outputs had audio, no video, matching container
and extension, nonzero size and approximately one-second selected duration.
The test used fades, volume and an echo effect, and checked intermediate WAV
cleanup. Log: `apps/flutter_app/build/mobile-audio-formats-integration.log`.
Physical-device and iOS support were not verified by this test.

## Android AVIF image export

The image capability list includes AVIF alongside JPG, PNG and WebP. Android
applies its existing crop, rotation, flips, scaling and color adjustments, then
writes a temporary PNG and encodes AV1 still-image data into an AVIF container
using bundled libaom. Transparent inputs carry a separate lossless alpha plane.
Quality maps to AV1 CRF; export has bounded time, native session cancellation,
temporary-file cleanup, `image/avif` MIME and `.avif` extension. FFprobe verifies
AV1 data, AVIF brand and output dimensions before completion. No backend or
internet is involved.

Executed emulator test `mobile_avif_test.dart` passed at quality 30 and 95 using
a generated transparent PNG with crop, filters and 50% scaling. Both outputs
were 30x30 genuine AVIF images with an alpha stream; intermediate PNG cleanup
passed. Log: `apps/flutter_app/build/mobile-avif-integration.log`. This does not
establish AVIF viewer compatibility on every receiving app, older Android image
decoder, physical device or iOS. iOS capabilities are unchanged.
