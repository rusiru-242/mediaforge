'use client';

import { useRef } from 'react';

interface Props {
  duration: number;
  start: number;
  end: number;
  onStartChange: (value: number) => void;
  onEndChange: (value: number) => void;
}

/** Place directly inside the positioned timeline so drag distances use its full width. */
export function TrimHandles({ duration, start, end, onStartChange, onEndChange }: Props) {
  const drag = useRef<{ pointerId: number; clientX: number; value: number; width: number } | null>(null);
  if (!Number.isFinite(duration) || duration <= 0) return null;
  const gap = Math.min(0.1, duration);

  const change = (side: 'start' | 'end', value: number) => {
    const rounded = Math.round(value * 100) / 100;
    if (side === 'start') onStartChange(Math.max(0, Math.min(end - gap, rounded)));
    else onEndChange(Math.min(duration, Math.max(start + gap, rounded)));
  };

  return <>{(['start', 'end'] as const).map(side => {
    const value = side === 'start' ? start : end;
    return <button key={side} type="button" role="slider"
      aria-label={side === 'start' ? 'Trim start' : 'Trim end'}
      aria-valuemin={side === 'start' ? 0 : start + gap}
      aria-valuemax={side === 'start' ? end - gap : duration}
      aria-valuenow={value} aria-valuetext={`${value.toFixed(2)} seconds`}
      title={side === 'start' ? 'Drag to trim the start' : 'Drag to trim the end'}
      className="absolute inset-y-0 z-40 w-6 -translate-x-1/2 rounded-md border-2 border-white bg-primary-container text-white flex items-center justify-center cursor-ew-resize touch-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
      style={{ left: `clamp(12px, ${value / duration * 100}%, calc(100% - 12px))` }}
      onClick={event => event.stopPropagation()}
      onPointerDown={event => {
        if (event.button !== 0) return;
        const width = event.currentTarget.parentElement!.getBoundingClientRect().width;
        if (!width) return;
        event.preventDefault(); event.stopPropagation();
        event.currentTarget.setPointerCapture?.(event.pointerId);
        drag.current = { pointerId: event.pointerId, clientX: event.clientX, value, width };
      }}
      onPointerMove={event => {
        const current = drag.current;
        if (!current || current.pointerId !== event.pointerId) return;
        event.preventDefault(); event.stopPropagation();
        change(side, current.value + (event.clientX - current.clientX) / current.width * duration);
      }}
      onPointerUp={() => { drag.current = null; }}
      onPointerCancel={() => { drag.current = null; }}
      onLostPointerCapture={() => { drag.current = null; }}
      onKeyDown={event => {
        let next: number;
        const step = event.shiftKey ? 1 : 0.1;
        if (event.key === 'ArrowLeft' || event.key === 'ArrowDown') next = value - step;
        else if (event.key === 'ArrowRight' || event.key === 'ArrowUp') next = value + step;
        else if (event.key === 'Home') next = side === 'start' ? 0 : start + gap;
        else if (event.key === 'End') next = side === 'start' ? end - gap : duration;
        else return;
        event.preventDefault(); event.stopPropagation(); change(side, next);
      }}
    ><span aria-hidden="true" className="h-6 w-1 rounded-full bg-white" /></button>;
  })}</>;
}
