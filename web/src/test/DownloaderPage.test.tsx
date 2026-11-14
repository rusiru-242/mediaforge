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
  beforeEach(() => {
    vi.clearAllMocks();
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
      containerFormat: 'mp4',
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
    expect(screen.getByText('Estimated file size:')).toBeDefined();
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
      expect(screen.getByText('Download Audio')).toBeDefined();
    });
  });

  it('toggles Edit Before Download accordion and reveals trim controls', async () => {
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

    await waitFor(() => {
      expect(screen.getByText('Edit Before Download')).toBeDefined();
    });

    const editAccordionBtn = screen.getByText('Edit Before Download');
    fireEvent.click(editAccordionBtn);

    await waitFor(() => {
      expect(screen.getByText('Trim Duration (Seconds)')).toBeDefined();
      expect(screen.getByText('Crop Aspect Ratio')).toBeDefined();
      expect(screen.getByText('Processing Preset')).toBeDefined();
    });
  });
});
