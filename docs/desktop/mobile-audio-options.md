# Mobile Audio Editor

The mobile editor follows the web Audio Editor format pills, bitrate tiers (128/192/256/320 kbps), clip volume, Reverb/Echo/Bass Boost/Treble Boost/Warmth with individual levels, fade-in/out sliders and an envelope preview. Preview speed affects listening only. Import/replace, clear, trim selection, cuts, real export progress, cancellation, Save to Files, gallery saving and sharing use the existing local pipeline.

## Android

- M4A: Media3 Transformer with native AAC encoder, including fades and audio effects.
- WAV: MediaExtractor/MediaCodec decode to 16-bit PCM and streaming RIFF output. Trim/cuts discard excluded PCM frames; the same DSP applies volume, effects and fades. No whole-file audio buffer. Source channel count and sample rate are retained.
- WAV outputs are probed for an audio stream, no video, duration tolerance and nonempty size; the header describes actual PCM output.
- WAV does not use a lossy target bitrate.
- MP3, AAC, FLAC and OGG remain disabled: their output containers/encoders have not been implemented in the mobile engine. The visible options do not claim support.
- Fade envelopes follow the concatenated output after cuts; each kept M4A section receives its output offset.
- Native gallery saving routes WAV to the audio collection.

## Other platforms

iOS keeps its existing capabilities. Advanced audio effects/fades are hidden until its native engine implements them. Windows uses its existing local FFmpeg formats and fade filters. No website/backend changes are required.

## Verification

Flutter widget/model regressions cover format availability, fade validation and disabled unloaded sliders on a 360 px screen. Native integration checks exercise real M4A and WAV exports with generated owned fixtures, cuts/fades/effects and gallery saving. Host FFprobe/PCM analysis results are recorded separately when executed.
