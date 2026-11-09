import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { DownloadError } from '@/components/downloader/DownloadError';

describe('DownloadError component', () => {
  it('renders SSRF protection error with security alert guidance', () => {
    render(<DownloadError error="Target URL is blocked by SSRF defense: loopback not allowed" />);

    expect(screen.getByText('Security Violation (SSRF Protection)')).toBeDefined();
    expect(screen.getByText(/MediaForge does not allow connections to local loopback/i)).toBeDefined();
  });

  it('renders platform policy error with copyright guidance', () => {
    render(<DownloadError error="Direct download blocked: Platform terms of service requires official API" />);

    expect(screen.getByText('Platform Policy Restriction')).toBeDefined();
    expect(screen.getByText(/Third-party social platforms require official OAuth/i)).toBeDefined();
  });

  it('renders general download error when no specific pattern matches', () => {
    render(<DownloadError error="Network socket timeout occurred" />);

    expect(screen.getByText('Download Error')).toBeDefined();
    expect(screen.getByText('Network socket timeout occurred')).toBeDefined();
  });
});
