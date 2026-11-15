import { beforeEach, afterEach, expect, it, vi } from 'vitest';
import { render, screen, fireEvent, cleanup, waitFor } from '@testing-library/react';
import AudioConverterPage from '@/app/converter/audio/page';
import { apiClient } from '@/services/apiClient';

vi.mock('@/services/apiClient', () => ({ apiClient: {
  uploadFile: vi.fn(), createConversionJob: vi.fn(), getJobProgress: vi.fn(), getJobById: vi.fn(),
  cancelJob: vi.fn(), getDownloadUrl: (id: string) => `/api/files/${id}/download`,
} }));

beforeEach(() => {
  vi.clearAllMocks();
  vi.spyOn(HTMLMediaElement.prototype, 'pause').mockImplementation(() => {});
  URL.createObjectURL = vi.fn(() => 'blob:imported-audio');
  URL.revokeObjectURL = vi.fn();
});
afterEach(() => { cleanup(); vi.restoreAllMocks(); });

it('imports dropped audio and removes the estimated size panel', () => {
  const page = render(<AudioConverterPage />);
  expect(screen.queryByText('Estimated Output Size')).toBeNull();
  const sliders = page.container.querySelectorAll<HTMLInputElement>('input[type="range"]');
  expect(sliders.length).toBeGreaterThan(0);
  sliders.forEach(slider => expect(slider.disabled).toBe(true));
  const dropzone = screen.getByRole('button', { name: 'Import audio by browsing or dropping a file' });
  fireEvent.drop(dropzone, { dataTransfer: { files: [new File(['audio'], 'recording.mp3', { type: 'audio/mpeg' })] } });
  expect(screen.getAllByText('recording.mp3').length).toBeGreaterThan(0);
  expect(page.container.querySelector('audio')?.getAttribute('src')).toBe('blob:imported-audio');
  page.container.querySelectorAll<HTMLInputElement>('input[type="range"]').forEach(slider => expect(slider.disabled).toBe(false));
  expect((screen.getByRole('button', { name: 'Export Master Audio' }) as HTMLButtonElement).disabled).toBe(false);
});

it('opens the file picker using click or keyboard', () => {
  const page = render(<AudioConverterPage />);
  const input = page.container.querySelector('input[type=file]') as HTMLInputElement;
  const click = vi.spyOn(input, 'click').mockImplementation(() => {});
  const dropzone = screen.getByRole('button', { name: 'Import audio by browsing or dropping a file' });
  fireEvent.click(dropzone);
  fireEvent.keyDown(dropzone, { key: 'Enter' });
  expect(click).toHaveBeenCalledTimes(2);
  fireEvent.change(input, { target: { files: [new File(['audio'], 'chosen.wav', { type: 'audio/wav' })] } });
  expect(screen.getAllByText('chosen.wav').length).toBeGreaterThan(0);
});

it('rejects unsupported dropped files', () => {
  const page = render(<AudioConverterPage />);
  fireEvent.drop(screen.getByRole('button', { name: 'Import audio by browsing or dropping a file' }), {
    dataTransfer: { files: [new File(['text'], 'notes.txt', { type: 'text/plain' })] },
  });
  expect(screen.getByText('Choose a supported audio or video file.')).toBeDefined();
  expect(page.container.querySelector('audio')).toBeNull();
});

it('prevents replacing the source while an export is uploading', () => {
  vi.mocked(apiClient.uploadFile).mockReturnValue(new Promise(() => {}));
  render(<AudioConverterPage />);
  const dropzone = screen.getByRole('button', { name: 'Import audio by browsing or dropping a file' });
  fireEvent.drop(dropzone, { dataTransfer: { files: [new File(['audio'], 'first.mp3', { type: 'audio/mpeg' })] } });
  fireEvent.click(screen.getByRole('button', { name: 'Export Master Audio' }));
  fireEvent.drop(dropzone, { dataTransfer: { files: [new File(['audio'], 'second.mp3', { type: 'audio/mpeg' })] } });
  expect(screen.queryByText('second.mp3')).toBeNull();
  expect(dropzone.getAttribute('aria-disabled')).toBe('true');
});

it('exports timeline handles, fades, volume and selected effects together', async () => {
  vi.mocked(apiClient.uploadFile).mockResolvedValue({ id: 'input' } as any);
  vi.mocked(apiClient.createConversionJob).mockResolvedValue({ id: 'job' } as any);
  const page = render(<AudioConverterPage />);
  fireEvent.drop(screen.getByRole('button', { name: 'Import audio by browsing or dropping a file' }), {
    dataTransfer: { files: [new File(['audio'], 'clip.wav', { type: 'audio/wav' })] },
  });
  const audio = page.container.querySelector('audio')!;
  Object.defineProperty(audio, 'duration', { value: 20 }); fireEvent.loadedMetadata(audio);
  fireEvent.keyDown(screen.getByRole('slider', { name: 'Trim start' }), { key: 'ArrowRight', shiftKey: true });
  expect(audio.currentTime).toBe(1);
  fireEvent.keyDown(screen.getByRole('slider', { name: 'Trim end' }), { key: 'ArrowLeft', shiftKey: true });
  audio.currentTime = 20; fireEvent.timeUpdate(audio);
  expect(audio.currentTime).toBe(19);
  const envelope = screen.getByRole('img', { name: 'Audio fade envelope' });
  const initial = envelope.querySelector('path')!.getAttribute('d');
  fireEvent.change(screen.getByRole('slider', { name: 'Fade in duration' }), { target: { value: '2' } });
  fireEvent.change(screen.getByRole('slider', { name: 'Fade out duration' }), { target: { value: '3' } });
  expect(envelope.querySelector('path')!.getAttribute('d')).not.toBe(initial);
  fireEvent.change(screen.getByRole('slider', { name: 'Clip volume' }), { target: { value: '0' } });
  for (const label of ['Reverb', 'Echo', 'Bass Boost', 'Treble Boost', 'Warmth']) expect(screen.getByRole('button', { name: label })).toBeDefined();
  fireEvent.click(screen.getByRole('button', { name: 'Reverb' }));
  fireEvent.click(screen.getByRole('button', { name: 'Bass Boost' }));
  fireEvent.change(screen.getByRole('slider', { name: 'Reverb level' }), { target: { value: '35' } });
  fireEvent.change(screen.getByRole('slider', { name: 'Bass Boost level' }), { target: { value: '70' } });
  fireEvent.click(screen.getByRole('button', { name: 'Export Master Audio' }));
  await waitFor(() => expect(apiClient.createConversionJob).toHaveBeenCalledWith(expect.objectContaining({
    startTime: 1, endTime: 19, fadeInDuration: 2, fadeOutDuration: 3, volume: 0, audioEffects: ['reverb', 'bass'], audioEffectLevels: { reverb: 35, bass: 70 },
  })));
});

it('removes audio and permits importing another clip', () => {
  const page = render(<AudioConverterPage />);
  const input = page.container.querySelector('input[type=file]')!;
  fireEvent.change(input, { target: { files: [new File(['old'], 'old.mp3', { type: 'audio/mpeg' })] } });
  fireEvent.click(screen.getByRole('button', { name: 'Clear workspace' }));
  expect(page.container.querySelector('audio')).toBeNull();
  expect(screen.getAllByText('No audio loaded').length).toBeGreaterThan(0);
  expect(URL.revokeObjectURL).toHaveBeenCalled();
  fireEvent.change(input, { target: { files: [new File(['new'], 'new.wav', { type: 'audio/wav' })] } });
  expect(screen.getAllByText('new.wav').length).toBeGreaterThan(0);
});
