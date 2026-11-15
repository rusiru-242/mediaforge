export const AUDIO_EFFECTS = [
  { id: 'reverb', label: 'Reverb' }, { id: 'echo', label: 'Echo' },
  { id: 'bass', label: 'Bass Boost' }, { id: 'treble', label: 'Treble Boost' },
  { id: 'warmth', label: 'Warmth' },
] as const;
export type AudioEffect = typeof AUDIO_EFFECTS[number]['id'];

export function fadeGain(time: number, start: number, end: number, fadeIn: number, fadeOut: number) {
  if (time < start || time >= end) return 0;
  const duration = end - start;
  const ramp = (value: number) => Math.sin(Math.max(0, Math.min(1, value)) * Math.PI / 2);
  return (fadeIn > 0 ? ramp((time - start) / Math.min(fadeIn, duration)) : 1)
    * (fadeOut > 0 ? ramp((end - time) / Math.min(fadeOut, duration)) : 1);
}

export function fadeEnvelopePath(start: number, end: number, fadeIn: number, fadeOut: number) {
  return Array.from({ length: 101 }, (_, i) => {
    const gain = fadeGain(start + (end - start) * i / 100, start, end + 0.000001, fadeIn, fadeOut);
    return `${i === 0 ? 'M' : 'L'}${i},${(96 - gain * 88).toFixed(2)}`;
  }).join(' ');
}
