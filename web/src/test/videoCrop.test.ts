import { expect, it } from 'vitest';
import { clampCrop, zoomCrop } from '@/utils/videoCrop';

it('keeps custom and dragged crop rectangles inside the source with even dimensions', () => {
  expect(clampCrop({ x: 9999, y: -3, width: 1081, height: 1081 }, 1920, 1080))
    .toEqual({ x: 840, y: 0, width: 1080, height: 1080 });
  expect(clampCrop({ x: 5, y: 7, width: 9999, height: 9999 }, 1920, 1080))
    .toEqual({ x: 0, y: 0, width: 1920, height: 1080 });
});

it('zooms around the current crop center and resets to the fitted aspect ratio', () => {
  const zoomed = zoomCrop({ x: 420, y: 0, width: 1080, height: 1080 }, 1920, 1080, 200);
  expect(zoomed).toEqual({ x: 690, y: 270, width: 540, height: 540 });
  expect(zoomCrop(zoomed, 1920, 1080, 100)).toEqual({ x: 420, y: 0, width: 1080, height: 1080 });
});
