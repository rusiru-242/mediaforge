import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import DownloaderPage from '@/app/downloader/page';
import { apiClient } from '@/services/apiClient';

vi.mock('next/navigation', () => ({
  useSearchParams: () => new URLSearchParams(),
  useRouter: () => ({
    push: vi.fn(),
  }),
}));

vi.mock('@/services/apiClient', () => ({
  apiClient: {
    getMediaMetadata: vi.fn(),
    estimateOutputSize: vi.fn(),
    createDownloadJob: vi.fn(),
    getJobById: vi.fn(),
    cancelJob: vi.fn(),
    getDownloadUrl: vi.fn((id: string) => `http://localhost:8081/api/v1/files/${id}/download`),
  },
}));

describe('Online Downloader Page Redesign', () => {
  it('locks platform tabs to the URL, detects replacement links, and unlocks when cleared', () => {
    render(<DownloaderPage />);
    const input = screen.getByRole('textbox');
    fireEvent.change(input, { target: { value: 'https://www.youtube.com/watch?v=owned' } });
    const facebook = screen.getByRole('button', { name: 'Facebook' }) as HTMLButtonElement;
    expect(facebook.disabled).toBe(true);
    fireEvent.click(facebook);
    expect(screen.getByRole('button', { name: 'YouTube' }).getAttribute('aria-pressed')).toBe('true');
    fireEvent.change(input, { target: { value: 'https://www.instagram.com/reel/owned/' } });
    expect(screen.getByRole('button', { name: 'Instagram' }).getAttribute('aria-pressed')).toBe('true');
    expect((screen.getByRole('button', { name: 'YouTube' }) as HTMLButtonElement).disabled).toBe(true);
    fireEvent.click(screen.getByTitle('Clear input'));
    expect(facebook.disabled).toBe(false);
    fireEvent.click(facebook);
    expect(facebook.getAttribute('aria-pressed')).toBe('true');
  });
  beforeEach(() => {
    vi.clearAllMocks();
    sessionStorage.clear();
  });

  it('restores analyzed details and selections after leaving and returning, until explicitly cleared', async () => {
    vi.mocked(apiClient.getMediaMetadata).mockResolvedValueOnce({
      success: true, url: 'https://example.com/retained.mp4', platform: 'Direct Media URL',
      title: 'Retained analysis', mediaType: 'VIDEO', mimeType: 'video/mp4', containerFormat: 'mp4',
      availableFormats: [], availableQualities: ['1080p', '720p'], duration: 120, directDownloadSupported: true,
    });
    const firstVisit = render(<DownloaderPage />);
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'https://example.com/retained.mp4' } });
    fireEvent.click(screen.getByText('Analyze'));
    await screen.findByText('Retained analysis');
    fireEvent.click(screen.getByRole('button', { name: /webm/i }));
    fireEvent.click(screen.getByRole('button', { name: /720p/ }));
    firstVisit.unmount(); // Next.js unmounts the page when navigating elsewhere.

    const returnVisit = render(<DownloaderPage />);
    await screen.findByText('Retained analysis');
    expect((screen.getByRole('textbox') as HTMLInputElement).value).toBe('https://example.com/retained.mp4');
    expect(apiClient.getMediaMetadata).toHaveBeenCalledTimes(1);
    vi.mocked(apiClient.createDownloadJob).mockResolvedValueOnce({ id: 'retained-job', status: 'COMPLETED' } as any);
    fireEvent.click(screen.getByRole('button', { name: 'Download Video' }));
    await waitFor(() => expect(apiClient.createDownloadJob).toHaveBeenCalledWith(expect.objectContaining({
      url: 'https://example.com/retained.mp4', selectedFormat: 'webm', selectedQuality: '720p',
    })));

    fireEvent.click(screen.getByTitle('Clear input'));
    returnVisit.unmount();
    render(<DownloaderPage />);
    expect(screen.queryByText('Retained analysis')).toBeNull();
    expect((screen.getByRole('textbox') as HTMLInputElement).value).toBe('');
    expect(sessionStorage.getItem('mediaforge.downloader.draft.v1')).toBeNull();
  });

  it('opens normally when the saved draft is corrupt', () => {
    sessionStorage.setItem('mediaforge.downloader.draft.v1', '{invalid json');
    render(<DownloaderPage />);
    expect(screen.getByText('Analyze')).toBeDefined();
    expect((screen.getByRole('textbox') as HTMLInputElement).value).toBe('');
  });

  it('renders platform selection tabs and initial input state', () => {
    render(<DownloaderPage />);

    expect(screen.getByText('Online Media Downloader')).toBeDefined();
    expect(screen.getByText('YouTube')).toBeDefined();
    expect(screen.getByText('Facebook')).toBeDefined();
    expect(screen.getByText('Instagram')).toBeDefined();
    expect(screen.getByText('TikTok')).toBeDefined();
    expect(screen.getByText('X / Twitter')).toBeDefined();
    expect(screen.getByText('Direct Media URL')).toBeDefined();

    expect(screen.getByPlaceholderText('Paste YouTube video or Shorts link...')).toBeDefined();
    expect(screen.getByText('Analyze')).toBeDefined();
  });

  it('updates placeholder and guidance when clicking different platform tabs', () => {
    render(<DownloaderPage />);

    const instagramTab = screen.getByText('Instagram');
    fireEvent.click(instagramTab);
    expect(screen.getByPlaceholderText('Paste Instagram reel or video post link...')).toBeDefined();

    const tiktokTab = screen.getByText('TikTok');
    fireEvent.click(tiktokTab);
    expect(screen.getByPlaceholderText('Paste TikTok video link...')).toBeDefined();

    const directTab = screen.getByText('Direct Media URL');
    fireEvent.click(directTab);
    expect(screen.getByPlaceholderText('Paste direct .mp4, .webm, .m3u8, or audio link...')).toBeDefined();
  });

  it('analyzes media URL and displays preview, format options, and download button', async () => {
    vi.mocked(apiClient.getMediaMetadata).mockResolvedValueOnce({
      success: true,
      url: 'https://example.com/video.mp4',
      platform: 'Direct Media URL',
      title: 'Sample Mountain Expedition',
      mediaType: 'VIDEO',
      mimeType: 'video/mp4',
      containerFormat: 'm4a', // Source metadata must not override a video output request.
      fileSize: 104857600, // 100 MB
      resolution: '1080p',
      duration: 125,
      thumbnail: 'https://example.com/thumb.jpg',
      availableFormats: [
        {
          format: 'mp4',
          quality: '1080p',
          nativeStream: true,
          requiresConversion: false,
          label: 'MP4 1080p',
        },
      ],
      availableQualities: ['1080p', '720p', '480p'],
      directDownloadSupported: true,
    });

    vi.mocked(apiClient.estimateOutputSize).mockResolvedValueOnce({
      estimatedBytes: 104857600,
      minBytes: 90000000,
      maxBytes: 110000000,
      formattedEstimate: '~100.0 MB',
      formattedRange: '~90 - 110 MB',
      effectiveDurationSeconds: 125,
      estimationMethod: 'BITRATE_DURATION',
      disclaimer: 'Based on average bitrates',
    });

    render(<DownloaderPage />);

    const input = screen.getByPlaceholderText('Paste YouTube video or Shorts link...');
    fireEvent.change(input, { target: { value: 'https://example.com/video.mp4' } });

    const analyzeBtn = screen.getByText('Analyze');
    fireEvent.click(analyzeBtn);

    await waitFor(() => {
      expect(screen.getByText('Sample Mountain Expedition')).toBeDefined();
      expect(screen.getByText('Choose Download Quality')).toBeDefined();
      expect(screen.getByText('Download Video')).toBeDefined();
    });

    expect(screen.getByText('Ready for download')).toBeDefined();
    expect(screen.queryByText('Estimated file size:')).toBeNull();
    for (const format of ['avi', 'mkv', 'mov', 'flv', 'wav']) {
      expect(screen.getByRole('button', { name: new RegExp(format, 'i') })).toBeDefined();
    }
    vi.mocked(apiClient.createDownloadJob).mockResolvedValueOnce({ id: 'mp4-job', status: 'COMPLETED' } as any);
    fireEvent.click(screen.getByRole('button', { name: /720p/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Download Video' }));
    await waitFor(() => expect(apiClient.createDownloadJob).toHaveBeenCalledWith(expect.objectContaining({
      selectedFormat: 'mp4', selectedQuality: '720p', targetResolution: '720p', mediaType: 'video',
    })));
  });

  it('switches to audio bitrates and Download Audio button when MP3 is selected', async () => {
    vi.mocked(apiClient.getMediaMetadata).mockResolvedValueOnce({
      success: true,
      url: 'https://example.com/audio-test.mp4',
      platform: 'Direct Media URL',
      title: 'Acoustic Soundscape',
      mediaType: 'VIDEO',
      mimeType: 'video/mp4',
      containerFormat: 'mp4',
      fileSize: 52428800,
      resolution: '1080p',
      duration: 180,
      availableFormats: [],
      availableQualities: ['1080p'],
      directDownloadSupported: true,
    });

    render(<DownloaderPage />);

    const input = screen.getByPlaceholderText('Paste YouTube video or Shorts link...');
    fireEvent.change(input, { target: { value: 'https://example.com/audio-test.mp4' } });
    fireEvent.click(screen.getByText('Analyze'));

    await waitFor(() => {
      expect(screen.getByText('Acoustic Soundscape')).toBeDefined();
    });

    // Click MP3 format button
    const mp3Btn = screen.getByText('mp3');
    fireEvent.click(mp3Btn);

    await waitFor(() => {
      expect(screen.getByText('Audio Quality (Bitrate)')).toBeDefined();
      expect(screen.getAllByText('320 kbps').length).toBeGreaterThan(0);
      expect(screen.getByRole('button', { name: 'Download Audio' })).toBeDefined();
    });
    fireEvent.click(screen.getByRole('button', { name: 'm4a' }));
    vi.mocked(apiClient.createDownloadJob).mockResolvedValueOnce({ id: 'm4a-job', status: 'FAILED' } as any);
    fireEvent.click(screen.getByRole('button', { name: 'Download Audio' }));
    await waitFor(() => expect(apiClient.createDownloadJob).toHaveBeenCalledWith(expect.objectContaining({
      selectedFormat: 'm4a', mediaType: 'audio', targetResolution: undefined,
    })));
    fireEvent.click(screen.getByRole('button', { name: 'wav' }));
    expect(screen.getByText('Lossless WAV audio')).toBeDefined();
    expect(screen.queryByText('Audio Quality (Bitrate)')).toBeNull();
    vi.mocked(apiClient.createDownloadJob).mockResolvedValueOnce({ id: 'wav-job', status: 'COMPLETED' } as any);
    fireEvent.click(screen.getByRole('button', { name: 'Download Audio' }));
    await waitFor(() => expect(apiClient.createDownloadJob).toHaveBeenCalledWith(expect.objectContaining({
      selectedFormat: 'wav', selectedQuality: 'lossless', targetResolution: undefined, audioBitrate: undefined,
    })));
  });

  it('omits editing controls after analyzing downloadable media', async () => {
    vi.mocked(apiClient.getMediaMetadata).mockResolvedValueOnce({
      success: true,
      url: 'https://example.com/editable.mp4',
      platform: 'Direct Media URL',
      title: 'Editable Video',
      mediaType: 'VIDEO',
      mimeType: 'video/mp4',
      containerFormat: 'mp4',
      duration: 60,
      availableFormats: [],
      availableQualities: ['1080p'],
      directDownloadSupported: true,
    });

    render(<DownloaderPage />);

    const input = screen.getByPlaceholderText('Paste YouTube video or Shorts link...');
    fireEvent.change(input, { target: { value: 'https://example.com/editable.mp4' } });
    fireEvent.click(screen.getByText('Analyze'));

    await screen.findByText('Editable Video');
    expect(screen.queryByText('Edit Before Download')).toBeNull();
    expect(screen.queryByText('Trim Duration (Seconds)')).toBeNull();
    expect(screen.queryByText('Crop Aspect Ratio')).toBeNull();
  });
});
