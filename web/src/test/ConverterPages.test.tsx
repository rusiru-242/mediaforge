import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import VideoConverterPage from '@/app/converter/video/page';
import AudioConverterPage from '@/app/converter/audio/page';
import ImageConverterPage from '@/app/converter/image/page';
import BatchConverterPage from '@/app/converter/batch/page';

describe('Converter Pages Rendering', () => {
  it('renders VideoConverterPage with transcode parameters', () => {
    render(<VideoConverterPage />);
    expect(screen.getByText('Convert Video Files')).toBeDefined();
    expect(screen.getByText('Transcoding Parameters')).toBeDefined();
    expect(screen.getByText('Start Video Conversion')).toBeDefined();
  });

  it('renders AudioConverterPage with acoustic parameters', () => {
    render(<AudioConverterPage />);
    expect(screen.getByText('Convert Audio Files & Extract Soundtracks')).toBeDefined();
    expect(screen.getByText('Acoustic Parameters')).toBeDefined();
    expect(screen.getByText('Start Audio Conversion')).toBeDefined();
  });

  it('renders ImageConverterPage with optimization parameters', () => {
    render(<ImageConverterPage />);
    expect(screen.getByText('Convert & Optimize Images')).toBeDefined();
    expect(screen.getByText('Image Optimization Parameters')).toBeDefined();
    expect(screen.getByText('Start Image Conversion')).toBeDefined();
  });

  it('renders BatchConverterPage with batch queue', () => {
    render(<BatchConverterPage />);
    expect(screen.getByText('Batch Media Conversion')).toBeDefined();
    expect(screen.getByText('No files in the batch queue')).toBeDefined();
    expect(screen.getByText('Add Files')).toBeDefined();
  });
});
