# Mobile video editor parity

The Android video editor now includes the website's Export Video/Export Audio modes,
Original through 4K resolution choices (bounded by device encoder capabilities),
crop ratios and freeform handles, crop zoom, video/audio bitrate tuning, mute,
clip volume, Video Filters and five adjustable Audio Effects.

Video Filters: Original, Vivid, Vivid Warm, Vivid Cool, Dramatic and Mono. Preset
values come from `web/src/utils/imageFilters.ts`. Android exports use Media3 RGB
matrices. Flutter provides a color-matrix preview; native rendering/color-space
differences can make that preview approximate.

Audio Effects: Reverb, Echo, Bass Boost, Treble Boost and Warmth, independently
adjustable from 0 to 100%. Android processes PCM with channel-isolated bounded
delay buffers and filters. Clip volume supports 0–200%. Samples are clamped to
prevent integer overflow; high boosts can still sound clipped. These are simple
effects, not identical DSP implementations to browser Web Audio. Effect tails
remain within the selected clip duration.

The Preview effects button renders through the actual export engine and then
plays that verified output. Changing settings returns to the source preview.
Processing locks controls; absent files disable effect sliders. Existing range
trim, interval cuts, native save/share, progress, cancellation and Clear workspace
remain available.

Formats remain capability-driven: Android currently exports MP4 video and M4A
audio, rather than advertising unsupported desktop encoders. No backend upload
is required. iOS's existing engine does not advertise these new filter/DSP/tuning
capabilities, so those controls are not offered there. iOS implementation/testing
of advanced effects remains outstanding.

Tests and build results are recorded in the implementation response. Native
integration fixtures exercise all five video presets, combined audio effects,
zero-volume audio, existing transformations and preview/trim/export workflows.

Executed verification: 9 Flutter UI/model/navigation regressions passed; analyzer
reported no issues; Android emulator integration passed both tests and all 13
native checks. Independent FFmpeg decoding confirmed grayscale Mono output and
silent zero-volume audio. An initial muxing timeout occurred in a baseline test;
the processor now bypasses unchanged audio, and the subsequent complete native
run passed. See `mobile-video-options-verification.json` for the native and host
measurements. Physical-device and iOS advanced-effect tests were not performed.
