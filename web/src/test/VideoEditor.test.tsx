import { beforeEach, afterEach, expect, it, vi } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import VideoConverterPage from '@/app/converter/video/page';
import { apiClient } from '@/services/apiClient';

vi.mock('@/services/apiClient', () => ({ apiClient: {
  uploadFile: vi.fn(), createConversionJob: vi.fn(), getJobProgress: vi.fn(), getJobById: vi.fn(),
  cancelJob: vi.fn(), getDownloadUrl: (id: string) => `/api/files/${id}/download`,
} }));

beforeEach(() => {
  vi.clearAllMocks();
  vi.spyOn(HTMLMediaElement.prototype, 'pause').mockImplementation(() => {});
  URL.createObjectURL = vi.fn(() => 'blob:video');
  URL.revokeObjectURL = vi.fn();
  vi.mocked(apiClient.uploadFile).mockResolvedValue({ id: 'input' } as any);
  vi.mocked(apiClient.createConversionJob).mockResolvedValue({ id: 'job', status: 'QUEUED' } as any);
  vi.mocked(apiClient.getJobProgress).mockResolvedValue({ completed: true, status: 'COMPLETED' } as any);
  vi.mocked(apiClient.getJobById).mockResolvedValue({ id: 'job', outputFileId: 'output' } as any);
});
afterEach(() => { cleanup(); vi.restoreAllMocks(); });

function openClip() {
  const page = render(<VideoConverterPage />);
  const sliders = page.container.querySelectorAll<HTMLInputElement>('input[type="range"]');
  expect(sliders.length).toBeGreaterThan(0);
  sliders.forEach(slider => expect(slider.disabled).toBe(true));
  fireEvent.change(page.container.querySelector('input[type=file]')!, {
    target: { files: [new File(['clip'], 'clip.mp4', { type: 'video/mp4' })] },
  });
  const video = page.container.querySelector('video')!;
  Object.defineProperties(video, { duration: { value: 60 }, videoWidth: { value: 1920 }, videoHeight: { value: 1080 } });
  fireEvent.loadedMetadata(video);
  page.container.querySelectorAll<HTMLInputElement>('input[type="range"]').forEach(slider => expect(slider.disabled).toBe(false));
  return page;
}

it('sends selected audio effects and adjustable levels with video exports', async () => {
  openClip();
  fireEvent.click(screen.getByRole('button', { name: 'Reverb' }));
  fireEvent.click(screen.getByRole('button', { name: 'Bass Boost' }));
  fireEvent.change(screen.getByRole('slider', { name: 'Reverb level' }), { target: { value: '35' } });
  fireEvent.change(screen.getByRole('slider', { name: 'Bass Boost level' }), { target: { value: '70' } });
  fireEvent.click(screen.getByRole('button', { name: 'Export Trimmed Video' }));
  await waitFor(() => expect(apiClient.createConversionJob).toHaveBeenCalledWith(expect.objectContaining({
    outputFormat: 'mp4', audioEffects: ['reverb', 'bass'], audioEffectLevels: { reverb: 35, bass: 70 },
  })));
});

it('asks before leaving an unfinished edit and follows the confirmation choice', () => {
  history.replaceState(null, '', '/converter/video');
  openClip();
  const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false);
  const link = screen.getByRole('link', { name: 'Studio' });
  expect(fireEvent.click(link)).toBe(false);
  expect(confirm).toHaveBeenCalledWith(expect.stringContaining('unsaved work'));
  confirm.mockReturnValue(true);
  link.addEventListener('click', e => e.preventDefault());
  fireEvent.click(link);
  expect(confirm).toHaveBeenCalledTimes(2);
});

it('hides the downloaded result, and requires a changed clip to create a new result', async () => {
  const page = openClip();
  expect(screen.queryByText('Estimated Output Size')).toBeNull();
  fireEvent.click(screen.getByRole('button', { name: 'Export Trimmed Video' }));
  const download = await screen.findByRole('link', { name: 'Download Converted Video' }, { timeout: 3000 });
  download.addEventListener('click', e => e.preventDefault());
  fireEvent.click(download);
  expect(screen.queryByRole('link', { name: 'Download Converted Video' })).toBeNull();
  expect(window.dispatchEvent(new Event('beforeunload', { cancelable: true }))).toBe(true);
  fireEvent.click(screen.getByRole('button', { name: 'Select Range' }));
  expect(screen.queryByRole('button', { name: 'Export Trimmed Video' })).toBeNull();
  fireEvent.change(screen.getByLabelText('Output Resolution'), { target: { value: '720p' } });
  expect(window.dispatchEvent(new Event('beforeunload', { cancelable: true }))).toBe(false);
  fireEvent.click(await screen.findByRole('button', { name: 'Export Trimmed Video' }));
  expect(await screen.findByRole('link', { name: 'Download Converted Video' }, { timeout: 3000 })).toBeDefined();
  expect(apiClient.createConversionJob).toHaveBeenCalledTimes(2);
  page.unmount();
});

it('retains a bounded crop when changing editing tools and sends that rectangle to export', async () => {
  openClip();
  fireEvent.click(screen.getByRole('button', { name: 'Crop Canvas' }));
  fireEvent.click(screen.getByRole('button', { name: '1:1' }));
  expect((screen.getByLabelText('Crop width') as HTMLInputElement).value).toBe('1080');
  expect(screen.queryByLabelText('Crop X offset')).toBeNull();
  expect(screen.queryByLabelText('Crop Y offset')).toBeNull();
  fireEvent.change(screen.getByRole('slider', { name: 'Zoom' }), { target: { value: '200' } });
  expect((screen.getByLabelText('Crop width') as HTMLInputElement).value).toBe('540');
  fireEvent.click(screen.getByRole('button', { name: 'Select Range' }));
  fireEvent.click(screen.getByRole('button', { name: 'Export Trimmed Video' }));
  await waitFor(() => expect(apiClient.createConversionJob).toHaveBeenCalledWith(expect.objectContaining({
    cropX: 690, cropY: 270, cropWidth: 540, cropHeight: 540, outputFormat: 'mp4',
  })));
});

it('exports video audio as M4A without video crop or resolution settings', async () => {
  openClip();
  fireEvent.click(screen.getByRole('button', { name: 'Export Audio' }));
  fireEvent.click(screen.getByRole('button', { name: 'm4a' }));
  fireEvent.click(screen.getByRole('button', { name: 'Export Audio Clip' }));
  await waitFor(() => expect(apiClient.createConversionJob).toHaveBeenCalledWith(expect.objectContaining({
    outputFormat: 'm4a', stripAudio: false, targetResolution: undefined, videoBitrate: undefined, cropWidth: undefined,
  })));
});

it('supports common crop ratios and editable custom dimensions', async () => {
  openClip();
  fireEvent.click(screen.getByRole('button', { name: 'Crop Canvas' }));
  fireEvent.click(screen.getByRole('button', { name: '4:5' }));
  expect((screen.getByLabelText('Crop width') as HTMLInputElement).value).toBe('864');
  fireEvent.click(screen.getByRole('button', { name: 'Custom' }));
  fireEvent.change(screen.getByLabelText('Crop width'), { target: { value: '600' } });
  fireEvent.change(screen.getByLabelText('Crop height'), { target: { value: '400' } });
  expect(screen.getByRole('button', { name: 'Resize custom crop' })).toBeDefined();
  fireEvent.click(screen.getByRole('button', { name: 'Export Trimmed Video' }));
  await waitFor(() => expect(apiClient.createConversionJob).toHaveBeenCalledWith(expect.objectContaining({ cropWidth: 600, cropHeight: 400 })));
});

it('opens crop settings below the player from its dropdown and omits fade features', async () => {
  openClip();
  expect(screen.queryByRole('button', { name: 'Fade In / Out' })).toBeNull();
  const menu = screen.getByRole('button', { name: 'Crop options' });
  expect(menu.getAttribute('aria-expanded')).toBe('false');
  expect(screen.queryByRole('region', { name: 'Crop options panel' })).toBeNull();
  fireEvent.click(menu);
  const panel = screen.getByRole('region', { name: 'Crop options panel' });
  expect(menu.getAttribute('aria-expanded')).toBe('true');
  fireEvent.click(screen.getByRole('button', { name: '9:16' }));
  expect(menu.textContent).toContain('9:16');
  fireEvent.keyDown(panel, { key: 'Escape' });
  expect(screen.queryByRole('region', { name: 'Crop options panel' })).toBeNull();
  fireEvent.click(screen.getByRole('button', { name: 'Export Trimmed Video' }));
  await waitFor(() => expect(apiClient.createConversionJob).toHaveBeenCalled());
  const request = vi.mocked(apiClient.createConversionJob).mock.calls[0][0];
  for (const field of ['fadeInDuration', 'fadeOutDuration', 'videoFadeInDuration', 'videoFadeOutDuration']) {
    expect(request).not.toHaveProperty(field);
  }
});

it('exports the start and end selected with the timeline handles', async () => {
  openClip();
  fireEvent.keyDown(screen.getByRole('slider', { name: 'Trim start' }), { key: 'ArrowRight', shiftKey: true });
  fireEvent.keyDown(screen.getByRole('slider', { name: 'Trim end' }), { key: 'ArrowLeft', shiftKey: true });
  fireEvent.click(screen.getByRole('button', { name: 'Export Trimmed Video' }));
  await waitFor(() => expect(apiClient.createConversionJob).toHaveBeenCalledWith(expect.objectContaining({ startTime: 1, endTime: 59 })));
});

it('keeps video preview and skip controls within the trim range', () => {
  const page = openClip();
  const video = page.container.querySelector('video')!;
  fireEvent.keyDown(screen.getByRole('slider', { name: 'Trim start' }), { key: 'ArrowRight', shiftKey: true });
  expect(video.currentTime).toBe(1);
  fireEvent.click(screen.getByTitle('Step -5s'));
  expect(video.currentTime).toBe(1);
  fireEvent.keyDown(screen.getByRole('slider', { name: 'Trim end' }), { key: 'ArrowLeft', shiftKey: true });
  video.currentTime = 60; fireEvent.timeUpdate(video);
  expect(video.currentTime).toBe(59);
});

it('hides trim controls in crop mode and restores the selected range on return', () => {
  openClip();
  fireEvent.keyDown(screen.getByRole('slider', { name: 'Trim start' }), { key: 'ArrowRight', shiftKey: true });
  fireEvent.click(screen.getByRole('button', { name: 'Crop Canvas' }));
  expect(screen.queryByRole('slider', { name: 'Trim start' })).toBeNull();
  expect(screen.queryByRole('slider', { name: 'Trim end' })).toBeNull();
  expect(screen.queryByText('Trim Start Time:')).toBeNull();
  expect(screen.getByRole('region', { name: 'Crop options panel' })).toBeDefined();
  fireEvent.click(screen.getByRole('button', { name: 'Select Range' }));
  expect(screen.getByRole('slider', { name: 'Trim start' }).getAttribute('aria-valuenow')).toBe('1');
  expect(screen.getByRole('slider', { name: 'Trim end' }).getAttribute('aria-valuenow')).toBe('60');
});

it.each(['144p', '240p', '360p', '480p', '720p', '1080p', '1440p', '2160p'])('sends the selected %s output resolution', async resolution => {
  openClip();
  fireEvent.change(screen.getByLabelText('Output Resolution'), { target: { value: resolution } });
  fireEvent.click(screen.getByRole('button', { name: 'Export Trimmed Video' }));
  await waitFor(() => expect(apiClient.createConversionJob).toHaveBeenCalledWith(expect.objectContaining({
    targetResolution: resolution, qualityPreset: undefined, crf: 20,
  })));
});

it('removes video and permits importing another clip', () => {
  const page = openClip();
  fireEvent.click(screen.getByRole('button', { name: 'Clear workspace' }));
  expect(page.container.querySelector('video')).toBeNull();
  expect(screen.getByText('No video selected')).toBeDefined();
  expect(URL.revokeObjectURL).toHaveBeenCalled();
  fireEvent.change(page.container.querySelector('input[type=file]')!, {
    target: { files: [new File(['new'], 'replacement.mp4', { type: 'video/mp4' })] },
  });
  expect(screen.getByText('replacement.mp4')).toBeDefined();
});

it.each([
  ['Vivid', .03, 1.12, 1.45, 0], ['Vivid Warm', .03, 1.1, 1.3, .3],
  ['Vivid Cool', .02, 1.1, 1.3, -.3], ['Dramatic', -.04, 1.4, .8, 0], ['Mono', 0, 1.15, 0, 0],
] as const)('previews and exports the %s photo filter on video', async (label, brightness, contrast, saturation, warmth) => {
  const page = openClip();
  fireEvent.click(screen.getByRole('button', { name: label }));
  expect(page.container.querySelector('video')!.style.filter).toContain(`saturate(${saturation})`);
  fireEvent.click(screen.getByRole('button', { name: 'Export Trimmed Video' }));
  await waitFor(() => expect(apiClient.createConversionJob).toHaveBeenCalledWith(expect.objectContaining({ brightness, contrast, saturation, warmth })));
});
