import { expect, it } from 'vitest';
import { fadeGain, fadeEnvelopePath } from '@/utils/audioEffects';

it('draws and previews the same smooth envelope on the selected time interval', () => {
  expect(fadeGain(2, 2, 12, 2, 3)).toBe(0);
  expect(fadeGain(3, 2, 12, 2, 3)).toBeCloseTo(Math.SQRT1_2);
  expect(fadeGain(7, 2, 12, 2, 3)).toBe(1);
  expect(fadeGain(12, 2, 12, 2, 3)).toBe(0);
  expect(fadeEnvelopePath(2, 12, 2, 3)).not.toBe(fadeEnvelopePath(2, 12, 0, 0));
});
