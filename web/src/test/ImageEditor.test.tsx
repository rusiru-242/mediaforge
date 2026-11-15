import { it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import ImageEditor from '@/app/converter/image/page';
import { apiClient } from '@/services/apiClient';
vi.mock('@/services/apiClient', () => ({ apiClient: { uploadFile: vi.fn(), createConversionJob: vi.fn(), getJobProgress: vi.fn() } }));
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });
it('exports selected filter adjustments and a custom crop from the image tools', async () => {
  vi.stubGlobal('ResizeObserver', class { observe() {} disconnect() {} });
  URL.createObjectURL = vi.fn(() => 'blob:image'); URL.revokeObjectURL = vi.fn();
  vi.mocked(apiClient.uploadFile).mockResolvedValue({ id: 'image' } as any);
  vi.mocked(apiClient.createConversionJob).mockResolvedValue({ id: 'job' } as any);
  const page = render(<ImageEditor />);
  expect((screen.getByRole('slider', { name: 'Saturation' }) as HTMLInputElement).disabled).toBe(true);
  fireEvent.change(page.container.querySelector('input[type=file]')!, { target: { files: [new File(['image'], 'photo.png', { type: 'image/png' })] } });
  const img=screen.getByAltText('photo.png');
  Object.defineProperties(img, { naturalWidth: { value: 1200 }, naturalHeight: { value: 800 } });
  fireEvent.load(img);
  fireEvent.click(screen.getByRole('button', { name: 'Vivid Warm' }));
  expect((screen.getByRole('slider', { name: 'Saturation' }) as HTMLInputElement).value).toBe('1.3');
  fireEvent.click(screen.getByRole('button', { name: 'Transform & Canvas' }));
  fireEvent.click(screen.getByRole('button', { name: '4:5' }));
  expect(screen.queryByLabelText('Crop Width')).toBeNull();
  expect(screen.queryByText('Custom Width (px)')).toBeNull();
  expect(screen.queryByText(/Zero Database/)).toBeNull();
  fireEvent.click(screen.getByRole('button', { name: 'Export Processed Image' }));
  await waitFor(() => expect(apiClient.createConversionJob).toHaveBeenCalledWith(expect.objectContaining({
    cropWidth: 640, cropHeight: 800, brightness: .03, contrast: 1.1, saturation: 1.3, warmth: .3,
  })));
});

it('clears the image, edits and export workspace before a new import', () => {
  vi.stubGlobal('ResizeObserver', class { observe() {} disconnect() {} });
  URL.createObjectURL = vi.fn(() => 'blob:image'); URL.revokeObjectURL = vi.fn();
  const page = render(<ImageEditor />);
  const input = page.container.querySelector('input[type=file]')!;
  expect((screen.getByRole('button', { name: 'Clear workspace' }) as HTMLButtonElement).disabled).toBe(true);
  fireEvent.change(input, { target: { files: [new File(['image'], 'old.png', { type: 'image/png' })] } });
  fireEvent.click(screen.getByRole('button', { name: 'Vivid Warm' }));
  fireEvent.click(screen.getByRole('button', { name: 'Clear workspace' }));
  expect(screen.queryByAltText('old.png')).toBeNull();
  expect((screen.getByRole('slider', { name: 'Saturation' }) as HTMLInputElement).value).toBe('1');
  expect(URL.revokeObjectURL).toHaveBeenCalled();
  fireEvent.change(input, { target: { files: [new File(['new'], 'new.png', { type: 'image/png' })] } });
  expect(screen.getByAltText('new.png')).toBeDefined();
});
