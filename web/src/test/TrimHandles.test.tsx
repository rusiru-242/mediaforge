import { useState } from 'react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { TrimHandles } from '@/components/editor/TrimHandles';

beforeEach(() => vi.stubGlobal('PointerEvent', MouseEvent));
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

function Track({ seek }: { seek: () => void }) {
  const [start, setStart] = useState(2);
  const [end, setEnd] = useState(8);
  return <div data-testid="track" onClick={seek}><TrimHandles duration={10} start={start} end={end}
    onStartChange={setStart} onEndChange={setEnd} /></div>;
}

it('drags both ends independently and prevents crossing or seeking on handle clicks', () => {
  const seek = vi.fn();
  render(<Track seek={seek} />);
  vi.spyOn(screen.getByTestId('track'), 'getBoundingClientRect').mockReturnValue({ width: 100 } as DOMRect);
  const start = screen.getByRole('slider', { name: 'Trim start' });
  const end = screen.getByRole('slider', { name: 'Trim end' });
  fireEvent.pointerDown(start, { clientX: 20, button: 0 });
  fireEvent.pointerMove(start, { clientX: 40 });
  fireEvent.pointerUp(start);
  expect(start.getAttribute('aria-valuenow')).toBe('4');
  fireEvent.pointerDown(end, { clientX: 80, button: 0 });
  fireEvent.pointerMove(end, { clientX: 60 });
  fireEvent.pointerUp(end);
  expect(end.getAttribute('aria-valuenow')).toBe('6');
  fireEvent.pointerDown(start, { clientX: 40, button: 0 });
  fireEvent.pointerMove(start, { clientX: 200 });
  fireEvent.pointerUp(start);
  expect(Number(start.getAttribute('aria-valuenow'))).toBeCloseTo(5.9);
  fireEvent.click(start);
  expect(seek).not.toHaveBeenCalled();
});

it('supports keyboard adjustment and cancels a drag when the pointer is cancelled', () => {
  render(<Track seek={() => {}} />);
  vi.spyOn(screen.getByTestId('track'), 'getBoundingClientRect').mockReturnValue({ width: 100 } as DOMRect);
  const start = screen.getByRole('slider', { name: 'Trim start' });
  fireEvent.keyDown(start, { key: 'ArrowRight', shiftKey: true });
  expect(start.getAttribute('aria-valuenow')).toBe('3');
  fireEvent.pointerDown(start, { clientX: 30, button: 0 });
  fireEvent.pointerCancel(start);
  fireEvent.pointerMove(start, { clientX: 60 });
  expect(start.getAttribute('aria-valuenow')).toBe('3');
});
