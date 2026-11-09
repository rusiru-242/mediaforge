import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { ProgressBar } from '@/components/ui/ProgressBar';

describe('ProgressBar', () => {
  it('renders progress bar with label and percentage', () => {
    render(<ProgressBar value={45} label="Uploading" />);
    expect(screen.getByText('Uploading')).toBeDefined();
    expect(screen.getByText('45%')).toBeDefined();

    const bar = screen.getByRole('progressbar');
    expect(bar.getAttribute('aria-valuenow')).toBe('45');
    expect(bar.getAttribute('aria-valuemin')).toBe('0');
    expect(bar.getAttribute('aria-valuemax')).toBe('100');
  });

  it('clamps values above 100 to 100', () => {
    render(<ProgressBar value={150} />);
    expect(screen.getByText('100%')).toBeDefined();
    expect(screen.getByRole('progressbar').getAttribute('aria-valuenow')).toBe('100');
  });

  it('clamps values below 0 to 0', () => {
    render(<ProgressBar value={-20} />);
    expect(screen.getByText('0%')).toBeDefined();
    expect(screen.getByRole('progressbar').getAttribute('aria-valuenow')).toBe('0');
  });
});
