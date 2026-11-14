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
    expect(screen.getByText('Export Settings')).toBeDefined();
    expect(screen.getByText('Container Format')).toBeDefined();
    expect(screen.getByText('Export Trimmed Video')).toBeDefined();
  });

  it('renders AudioConverterPage with acoustic parameters', () => {
    render(<AudioConverterPage />);
    expect(screen.getByText('Audio Editor')).toBeDefined();
    expect(screen.getByText('Export Settings')).toBeDefined();
    expect(screen.getByText('Export Master Audio')).toBeDefined();
  });

  it('renders ImageConverterPage with optimization parameters', () => {
    render(<ImageConverterPage />);
    expect(screen.getByText('Image Editor')).toBeDefined();
    expect(screen.getByText('Export Settings')).toBeDefined();
    expect(screen.getByText('Export Processed Image')).toBeDefined();
  });

  it('renders BatchConverterPage with batch queue', () => {
    render(<BatchConverterPage />);
    expect(screen.getByText('Batch Converter')).toBeDefined();
    expect(screen.getByText('Batch Queue is Empty')).toBeDefined();
    expect(screen.getByText('Add Files')).toBeDefined();
  });
});
