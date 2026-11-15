import { act, renderHook } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { useAudioPreview } from '@/hooks/useAudioPreview';
import { AudioEffect } from '@/utils/audioEffects';

afterEach(() => { vi.unstubAllGlobals(); });

it('previews gain and fades live, mutes paused playback and reuses the source when effects change', async () => {
  const callbacks: FrameRequestCallback[] = [];
  vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => { callbacks.push(cb); return callbacks.length; });
  vi.stubGlobal('cancelAnimationFrame', vi.fn());
  const node = () => ({ connect: vi.fn(), disconnect: vi.fn(), gain: { value: 0, setTargetAtTime: vi.fn() },
    frequency: { value: 0 }, delayTime: { value: 0 }, type: '' });
  const gain = node();
  const source = node();
  const context = {
    currentTime: 0, destination: node(), createGain: vi.fn().mockReturnValue(gain),
    createMediaElementSource: vi.fn().mockReturnValue(source), createBiquadFilter: vi.fn(node), createDelay: vi.fn(node),
    resume: vi.fn().mockResolvedValue(undefined), close: vi.fn().mockResolvedValue(undefined),
  };
  vi.stubGlobal('AudioContext', class { constructor() { return context; } });
  const audio = document.createElement('audio');
  Object.defineProperty(audio, 'paused', { value: false, writable: true });
  audio.currentTime = 2;
  const ref = { current: audio };
  let settings: Parameters<typeof useAudioPreview>[2] = { effects: [] as AudioEffect[], volume: 2, start: 0, end: 10, fadeIn: 4, fadeOut: 0 };
  const hook = renderHook(() => useAudioPreview(ref, 'blob:audio', settings));
  await act(async () => { await hook.result.current.start(); });
  callbacks.shift()!(0);
  expect(gain.gain.setTargetAtTime.mock.lastCall?.[0]).toBeCloseTo(Math.SQRT2);
  settings = { ...settings, volume: 0 };
  hook.rerender(); callbacks.shift()!(0);
  expect(gain.gain.setTargetAtTime.mock.lastCall?.[0]).toBe(0);
  settings = { ...settings, volume: 1, effects: ['reverb', 'echo', 'bass', 'treble', 'warmth'] };
  hook.rerender();
  await act(async () => { await hook.result.current.start(); });
  expect(context.createMediaElementSource).toHaveBeenCalledTimes(1);
  expect(context.createBiquadFilter).toHaveBeenCalledTimes(3);
  expect(context.createDelay).toHaveBeenCalledTimes(4);
  settings = { ...settings, levels: { reverb: 0, echo: 0, bass: 0, treble: 0, warmth: 0 } };
  hook.rerender();
  expect(context.createDelay).toHaveBeenCalledTimes(4);
  expect(context.createBiquadFilter).toHaveBeenCalledTimes(3);
  settings = { ...settings, levels: { reverb: 0, echo: 0, bass: 50, treble: 25, warmth: 100 } };
  hook.rerender();
  const filters = context.createBiquadFilter.mock.results.slice(-3).map(call => call.value);
  expect(filters[0].gain.value).toBe(3);
  expect(filters[1].gain.value).toBe(1.25);
  expect(filters[2].frequency.value).toBe(5000);
  Object.defineProperty(audio, 'paused', { value: true });
  callbacks.shift()!(0);
  expect(gain.gain.setTargetAtTime.mock.lastCall?.[0]).toBe(0);
  hook.unmount();
  expect(context.close).toHaveBeenCalledOnce();
});
