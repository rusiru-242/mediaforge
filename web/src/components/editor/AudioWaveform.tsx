'use client';

import { useEffect, useId, useState } from 'react';

export function combinedPeaks(buffer: Pick<AudioBuffer, 'length' | 'numberOfChannels' | 'getChannelData'>, bins = 512): number[] {
  if (!buffer.length || !buffer.numberOfChannels) return [];
  const channels = Array.from({ length: buffer.numberOfChannels }, (_, i) => buffer.getChannelData(i));
  const count = Math.min(bins, buffer.length);
  const peaks = Array.from({ length: count }, (_, i) => {
    const start = Math.floor(i * buffer.length / count), end = Math.floor((i + 1) * buffer.length / count);
    const stride = Math.max(1, Math.floor((end - start) / 256));
    let energy = 0, samples = 0;
    for (const channel of channels) for (let j = start; j < end; j += stride) {
      energy += channel[j] * channel[j]; samples++;
    }
    return Math.sqrt(energy / Math.max(1, samples));
  });
  const maximum = Math.max(...peaks);
  return maximum > 0 ? peaks.map(value => value / maximum) : peaks;
}

export function AudioWaveform({ file }: { file: File | null }) {
  const gradient = `audio-wave-${useId().replace(/:/g, '')}`;
  const [decoded, setDecoded] = useState<{ file: File; peaks: number[]; failed?: boolean } | null>(null);
  useEffect(() => {
    if (!file) return;
    let cancelled = false;
    const decode = async () => {
      try {
        const data = await file.arrayBuffer();
        if (cancelled) return;
        const context = new OfflineAudioContext(1, 1, 44100);
        const buffer = await context.decodeAudioData(data);
        if (!cancelled) setDecoded({ file, peaks: combinedPeaks(buffer) });
      } catch {
        if (!cancelled) setDecoded({ file, peaks: [], failed: true });
      }
    };
    void decode();
    return () => { cancelled = true; };
  }, [file]);
  const ready = decoded?.file === file ? decoded : null;
  const peaks = ready?.peaks || [];
  const points = peaks.map((value, i) => [i / Math.max(1, peaks.length - 1) * 1000, value * 42]);
  const path = points.length ? `M0,50 ${points.map(([x, amplitude]) => `L${x.toFixed(2)},${(50 - amplitude).toFixed(2)}`).join(' ')} ${[...points].reverse().map(([x, amplitude]) => `L${x.toFixed(2)},${(50 + amplitude).toFixed(2)}`).join(' ')} Z` : '';
  return <svg role="img" aria-label="Audio waveform" data-state={!file ? 'empty' : ready?.failed ? 'unavailable' : ready ? 'ready' : 'loading'}
    className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 1000 100" preserveAspectRatio="none">
    <defs><linearGradient id={gradient} x1="0" y1="0" x2="1" y2="0"><stop stopColor="#c4b5fd" /><stop offset="1" stopColor="#7dd3fc" /></linearGradient></defs>
    <line x1="0" y1="50" x2="1000" y2="50" stroke="#a5b4fc" strokeOpacity="0.6" vectorEffect="non-scaling-stroke" />
    {path && <path d={path} fill={`url(#${gradient})`} fillOpacity="0.85" />}
    {ready?.failed && <title>Waveform unavailable for this file format</title>}
  </svg>;
}
