import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { DownloadProgress } from '@/components/downloader/DownloadProgress';

describe('DownloadProgress component', () => {
  it('renders progress bar and status text', () => {
    render(<DownloadProgress progress={45} status="PROCESSING" />);

    expect(screen.getByText('Downloading Media Stream...')).toBeDefined();
    expect(screen.getByRole('progressbar')).toBeDefined();
  });

  it('triggers onCancel when Cancel button is clicked', () => {
    const handleCancel = vi.fn();
    render(
      <DownloadProgress
        progress={60}
        status="PROCESSING"
        onCancel={handleCancel}
      />
    );

    const cancelBtn = screen.getByRole('button', { name: /cancel/i });
    fireEvent.click(cancelBtn);
    expect(handleCancel).toHaveBeenCalledTimes(1);
  });

  it('hides Cancel button on terminal statuses', () => {
    const handleCancel = vi.fn();
    const { rerender } = render(
      <DownloadProgress
        progress={100}
        status="COMPLETED"
        onCancel={handleCancel}
      />
    );

    expect(screen.queryByRole('button', { name: /cancel/i })).toBeNull();

    rerender(
      <DownloadProgress
        progress={0}
        status="FAILED"
        onCancel={handleCancel}
      />
    );

    expect(screen.queryByRole('button', { name: /cancel/i })).toBeNull();
  });
});
