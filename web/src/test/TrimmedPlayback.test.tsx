import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { useTrimmedPlayback } from '@/hooks/useTrimmedPlayback';

beforeEach(() => vi.useFakeTimers());
afterEach(() => { vi.useRealTimers(); vi.restoreAllMocks(); });

function setup() {
  const media = document.createElement('audio');
  Object.defineProperty(media, 'paused', { value: true, writable: true });
  const paused = (value: boolean) => Object.defineProperty(media, 'paused', { value, writable: true });
  const pause = vi.spyOn(media, 'pause').mockImplementation(() => { paused(true); media.dispatchEvent(new Event('pause')); });
  const ref = { current: media }, time = vi.fn(), playing = vi.fn();
  const hook = renderHook(({ start, end }) => useTrimmedPlayback(ref, 'blob:clip', start, end, 10, time, playing), {
    initialProps: { start: 2, end: 8 },
  });
  return { media, paused, pause, hook, time, playing };
}

it('immediately moves the playhead into the trimmed range and clamps all seeks', () => {
  const { media, hook } = setup();
  expect(media.currentTime).toBe(2);
  act(() => hook.result.current.seek(-5)); expect(media.currentTime).toBe(2);
  act(() => hook.result.current.seek(100)); expect(media.currentTime).toBe(8);
  hook.rerender({ start: 4, end: 6 }); expect(media.currentTime).toBe(6);
  hook.rerender({ start: 7, end: 9 }); expect(media.currentTime).toBe(7);
  hook.unmount(); expect(vi.getTimerCount()).toBe(0);
});

it('stops exactly at trim end and starts again from trim start', () => {
  const { media, paused, pause, playing, hook } = setup();
  act(() => { paused(false); media.currentTime = 3; media.dispatchEvent(new Event('play')); });
  act(() => { media.currentTime = 9; media.dispatchEvent(new Event('timeupdate')); });
  expect(media.currentTime).toBe(8); expect(pause).toHaveBeenCalledOnce(); expect(playing).toHaveBeenLastCalledWith(false);
  act(() => { paused(false); media.dispatchEvent(new Event('play')); });
  expect(media.currentTime).toBe(2);
  hook.unmount();
});

it('uses a playback-rate-aware deadline rather than waiting for infrequent timeupdate events', () => {
  const { media, paused, pause, hook } = setup();
  act(() => { media.playbackRate = 2; paused(false); media.dispatchEvent(new Event('play')); });
  act(() => vi.advanceTimersByTime(2999)); expect(pause).not.toHaveBeenCalled();
  media.currentTime = 8;
  act(() => vi.advanceTimersByTime(1)); expect(pause).toHaveBeenCalledOnce(); expect(media.currentTime).toBe(8);
  hook.unmount();
});
