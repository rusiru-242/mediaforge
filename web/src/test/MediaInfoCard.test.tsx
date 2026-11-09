import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { MediaInfoCard } from '@/components/downloader/MediaInfoCard';
import { MediaMetadataResponse } from '@/types/api';

describe('MediaInfoCard component', () => {
  const sampleMetadata: MediaMetadataResponse = {
    title: 'Big Buck Bunny 1080p Stream',
    platform: 'Direct Media',
    mediaType: 'VIDEO',
    containerFormat: 'mp4',
    resolution: '1920x1080',
    duration: 596,
    fileSize: 15728640,
    mimeType: 'video/mp4',
    directDownloadSupported: true,
  };

  it('renders title, platform, media type, and container format', () => {
    render(<MediaInfoCard metadata={sampleMetadata} />);

    expect(screen.getByText('Big Buck Bunny 1080p Stream')).toBeDefined();
    expect(screen.getByText('Direct Media')).toBeDefined();
    expect(screen.getAllByText('VIDEO').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('.mp4')).toBeDefined();
    expect(screen.getByText('Direct Stream Available')).toBeDefined();
  });

  it('formats duration and file size properly', () => {
    render(<MediaInfoCard metadata={sampleMetadata} />);

    // 596 seconds = 9:56
    expect(screen.getByText('9:56')).toBeDefined();
    // 15728640 bytes = 15 MB
    expect(screen.getByText(/15 MB/i)).toBeDefined();
  });

  it('shows policy restriction badge when directDownloadSupported is false', () => {
    const restrictedMetadata: MediaMetadataResponse = {
      ...sampleMetadata,
      platform: 'YouTube',
      directDownloadSupported: false,
    };

    render(<MediaInfoCard metadata={restrictedMetadata} />);
    expect(screen.getByText('Policy Restricted')).toBeDefined();
  });
});
