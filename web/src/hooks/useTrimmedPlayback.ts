'use client';

import { RefObject, useEffect } from 'react';

/** Constrain every seek and playback path to the editor's selected interval. */
export function useTrimmedPlayback<T extends HTMLMediaElement>(ref: RefObject<T | null>, source: string | null,
  start: number, end: number, duration: number, onTime: (time: number) => void, onPlaying: (playing: boolean) => void) {
  const upper = Math.min(duration, end > 0 ? end : duration);
  const lower = Math.max(0, Math.min(start, upper));
  const clamp = (time: number) => Math.max(lower, Math.min(upper, Number.isFinite(time) ? time : lower));
  const seek = (time: number) => {
    const media = ref.current;
    if (!media || duration <= 0) return;
    const target = clamp(time);
    media.currentTime = target;
    onTime(target);
    if (target >= upper && !media.paused) { media.pause(); onPlaying(false); }
  };

  useEffect(() => {
    const media = ref.current;
    if (!media || !source || duration <= 0) return;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const clear = () => { if (timer !== undefined) clearTimeout(timer); };
    const sync = () => {
      clear();
      const time = Math.max(lower, Math.min(upper, media.currentTime));
      if (Math.abs(media.currentTime - time) > 0.001) media.currentTime = time;
      if (time >= upper - 0.002) {
        if (media.currentTime !== upper) media.currentTime = upper;
        if (!media.paused) media.pause();
        onPlaying(false); onTime(upper);
      } else {
        onTime(time);
        if (!media.paused) timer = setTimeout(sync, Math.max(1, (upper - time) / Math.max(0.01, media.playbackRate) * 1000));
      }
    };
    const play = () => {
      if (media.currentTime < lower || media.currentTime >= upper) media.currentTime = lower;
      onPlaying(true); sync();
    };
    const pause = () => { clear(); onPlaying(false); };
    media.addEventListener('play', play);
    media.addEventListener('pause', pause);
    media.addEventListener('ended', pause);
    media.addEventListener('seeking', sync);
    media.addEventListener('timeupdate', sync);
    media.addEventListener('ratechange', sync);
    sync(); // Moving a trim handle immediately brings the playhead into the new range.
    return () => {
      clear();
      media.removeEventListener('play', play); media.removeEventListener('pause', pause); media.removeEventListener('ended', pause);
      media.removeEventListener('seeking', sync); media.removeEventListener('timeupdate', sync); media.removeEventListener('ratechange', sync);
    };
  }, [ref, source, lower, upper, duration, onTime, onPlaying]);

  return { seek };
}
