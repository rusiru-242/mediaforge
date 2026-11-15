import { afterEach, expect, it, vi } from 'vitest';
import { render, screen, waitFor, cleanup } from '@testing-library/react';
import { AudioWaveform, combinedPeaks } from '@/components/editor/AudioWaveform';

afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

it('shows only a straight center line without an imported file', () => {
  render(<AudioWaveform file={null} />);
  const waveform = screen.getByRole('img', { name: 'Audio waveform' });
  expect(waveform.getAttribute('data-state')).toBe('empty');
  expect(waveform.querySelectorAll('line').length).toBe(1);
  expect(waveform.querySelector('path')).toBeNull();
});

it('combines opposite-phase channels without cancelling their waveform', () => {
  const channels = [new Float32Array([1, -1, 0.5, -0.5]), new Float32Array([-1, 1, -0.5, 0.5])];
  expect(combinedPeaks({ length: 4, numberOfChannels: 2, getChannelData: i => channels[i] }, 2)).toEqual([1, 0.5]);
});

it('renders one decoded waveform and returns to a straight line when cleared', async () => {
  const file = new File(['audio'], 'sample.wav');
  Object.defineProperty(file, 'arrayBuffer', { value: async () => new ArrayBuffer(8) });
  vi.stubGlobal('OfflineAudioContext', class {
    decodeAudioData = async () => ({ length: 4, numberOfChannels: 2, getChannelData: () => new Float32Array([0.1, 1, 0.5, 0.2]) });
  });
  const page = render(<AudioWaveform file={file} />);
  await waitFor(() => expect(screen.getByRole('img', { name: 'Audio waveform' }).getAttribute('data-state')).toBe('ready'));
  expect(screen.getByRole('img', { name: 'Audio waveform' }).querySelectorAll('path').length).toBe(1);
  page.rerender(<AudioWaveform file={null} />);
  expect(screen.getByRole('img', { name: 'Audio waveform' }).querySelector('path')).toBeNull();
});
