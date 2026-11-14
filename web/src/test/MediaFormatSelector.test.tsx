import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { MediaFormatSelector } from '@/components/downloader/MediaFormatSelector';
import { MediaFormatOptionDto } from '@/types/api';

describe('MediaFormatSelector component', () => {
  const formats: MediaFormatOptionDto[] = [
    {
      format: 'mp4',
      quality: '1080p',
      resolution: '1920x1080',
      nativeStream: true,
      requiresConversion: false,
      label: 'MP4 1080p',
    },
    {
      format: 'webm',
      quality: '1080p',
      resolution: '1920x1080',
      nativeStream: true,
      requiresConversion: false,
      label: 'WebM 1080p',
    },
    {
      format: 'mp3',
      quality: 'Audio',
      nativeStream: false,
      requiresConversion: true,
      label: 'MP3 Audio',
    },
  ];

  it('renders available formats with native stream and phase 05 transcoder badges', () => {
    const handleSelect = vi.fn();
    render(
      <MediaFormatSelector
        formats={formats}
        selectedFormat="mp4"
        onSelectFormat={handleSelect}
      />
    );

    expect(screen.getByText('mp4')).toBeDefined();
    expect(screen.getByText('webm')).toBeDefined();
    expect(screen.getByText('mp3')).toBeDefined();
    expect(screen.getAllByText('Native Stream').length).toBe(2);
    expect(screen.getByText('Phase 05 Transcoder')).toBeDefined();
  });

  it('allows clicking native stream formats and triggers onSelectFormat', () => {
    const handleSelect = vi.fn();
    render(
      <MediaFormatSelector
        formats={formats}
        selectedFormat="mp4"
        onSelectFormat={handleSelect}
      />
    );

    const webmOption = screen.getByText('webm');
    fireEvent.click(webmOption);
    expect(handleSelect).toHaveBeenCalledWith('webm');
  });

  it('disables clicking conversion formats that require Phase 05', () => {
    const handleSelect = vi.fn();
    render(
      <MediaFormatSelector
        formats={formats}
        selectedFormat="mp4"
        onSelectFormat={handleSelect}
      />
    );

    const mp3Option = screen.getByText('mp3');
    fireEvent.click(mp3Option);
    expect(handleSelect).not.toHaveBeenCalled();
  });
});
