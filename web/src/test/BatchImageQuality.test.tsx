import { it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import BatchConverterPage from '@/app/converter/batch/page';
import { apiClient } from '@/services/apiClient';
vi.mock('@/services/apiClient', () => ({ apiClient: { uploadFile: vi.fn(), createBatchConversion: vi.fn(), getJobProgress: vi.fn(),
  getBatchZipUrl: (id: string) => `/api/v1/conversions/batch/${id}/zip`,
} }));
afterEach(cleanup);
it('downloads the completed batch through the ZIP endpoint rather than treating its ID as a file ID', async () => {
  vi.mocked(apiClient.uploadFile).mockResolvedValue({ id: 'input' } as any);
  vi.mocked(apiClient.createBatchConversion).mockResolvedValue({ batchId: 'batch-group', jobs: [{ id: 'job' }] } as any);
  vi.mocked(apiClient.getJobProgress).mockResolvedValue({ completed: true, status: 'COMPLETED', percentage: 100 } as any);
  const page=render(<BatchConverterPage />);
  fireEvent.change(page.container.querySelector('input[type=file]')!, { target: { files: [new File(['image'],'photo.jpg',{type:'image/jpeg'})] } });
  fireEvent.click(screen.getByRole('button', { name: /Convert All/ }));
  const download=await screen.findByRole('link', { name: 'Download All as ZIP' }, { timeout: 3000 });
  expect(download.getAttribute('href')).toBe('/api/v1/conversions/batch/batch-group/zip');
});
it.each(['144p', '240p', '360p', '480p', '720p', '1080p', '1440p', '2160p'])('applies the selected %s resolution to the actual batch request', async resolution => {
  vi.mocked(apiClient.uploadFile).mockResolvedValue({ id: 'video' } as any);
  vi.mocked(apiClient.createBatchConversion).mockResolvedValue({ batchId: 'batch', jobs: [{ id: 'job' }] } as any);
  const page=render(<BatchConverterPage />);
  fireEvent.change(page.container.querySelector('input[type=file]')!, { target: { files: [new File(['clip'],'clip.mp4',{type:'video/mp4'})] } });
  fireEvent.change(screen.getByLabelText('Video resolution for clip.mp4'), { target: { value: resolution } });
  expect(screen.queryByText('4 Parallel Workers')).toBeNull();
  fireEvent.click(screen.getByRole('button', { name: /Convert All/ }));
  await waitFor(() => expect(apiClient.createBatchConversion).toHaveBeenLastCalledWith({ items: [expect.objectContaining({
    targetResolution: resolution, crf: 20, audioBitrate: 256,
  })] }));
});
it('sends the chosen format and independent quality for each batch image', async () => {
  vi.mocked(apiClient.uploadFile).mockResolvedValue({ id: 'uploaded' } as any);
  vi.mocked(apiClient.createBatchConversion).mockResolvedValue({ batchId: 'batch', jobs: [{ id: 'one' }, { id: 'two' }] } as any);
  const page=render(<BatchConverterPage />);
  fireEvent.change(page.container.querySelector('input[type=file]')!, { target: { files: [new File(['a'],'one.jpg',{type:'image/jpeg'}),new File(['b'],'two.jpg',{type:'image/jpeg'})] } });
  fireEvent.change(screen.getByLabelText('Output format for one.jpg'), { target: { value: 'webp' } });
  fireEvent.change(screen.getByLabelText('Image quality for one.jpg'), { target: { value: '50' } });
  fireEvent.change(screen.getByLabelText('Image quality for two.jpg'), { target: { value: '75' } });
  expect(screen.queryByText('Estimated Batch Payload')).toBeNull();
  expect(screen.queryByText(/Zero Database/)).toBeNull();
  fireEvent.click(screen.getByRole('button', { name: /Convert All/ }));
  await waitFor(() => expect(apiClient.createBatchConversion).toHaveBeenCalledWith({ items: [
    expect.objectContaining({ outputFormat:'webp', imageQuality:50 }), expect.objectContaining({imageQuality:75}),
  ] }));
});
