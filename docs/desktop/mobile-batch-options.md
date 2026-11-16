# Mobile Batch Converter

The web batch page is the workflow reference: Add Files/Clear Queue, All/Video/Audio/Image filters, original file sizes, individual settings/status/progress/cancellation, and a Batch Settings panel with ZIP packaging.

- Actual engine capabilities provide output format lists. Video inputs also offer supported audio-only formats.
- Video output resolutions are Original and 144/240/360/480/720/1080/1440/2160p, limited by device maximum. Resolution selection passes a real output height and, when supported, the video editor bitrate mapping.
- Image quality Low/Medium/High/Maximum maps to 50/75/85/95. PNG quality is disabled because it is lossless.
- Supported lossy audio outputs expose 128/192/256/320 kbps. WAV does not offer a lossy bitrate.
- One native job runs at a time. Retry converts failed/cancelled files; completed files are kept until settings change or the queue is cleared.
- Per-file save/gallery/share remains available. A completed batch can be packaged into a local ZIP and saved through the native Files dialog or shared.
- ZIP creation streams completed files in a worker isolate. Names are sanitized and indexed to avoid duplicate/path traversal entries. Aggregate ZIP input is bounded below 2 GiB. Progress reflects completed file bytes. Cooperative cancellation closes the current file before deleting partial output; it does not fake an interrupted conversion.
- Entering the background cancels packaging; navigating away from batch work uses the existing confirmation.
- Clear/remove/settings changes release terminal queue references without deleting imported source files.

Android MIME handling includes application/zip. Android/iOS expose their own private output directory for ZIP saving, preserving native save validation. iOS changes are source prepared only; no iOS build/device test was performed on Windows. Mobile folder drag/drop is not introduced; use native multiple-file selection.

Verification includes mobile light/dark layout, resolution/quality selection, Unicode and duplicate archive entries, CRC/content checks, cancelled ZIP cleanup, missing output errors and real Android offline output packaging.
