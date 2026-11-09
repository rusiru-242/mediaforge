import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { MediaUrlInput } from '@/components/downloader/MediaUrlInput';

describe('MediaUrlInput component', () => {
  it('renders input with provided URL', () => {
    const handleChange = vi.fn();
    const handleProbe = vi.fn();

    render(
      <MediaUrlInput
        url="https://example.com/video.mp4"
        onChange={handleChange}
        onProbe={handleProbe}
        isLoading={false}
      />
    );

    const input = screen.getByPlaceholderText(/example\.com/i) as HTMLInputElement;
    expect(input.value).toBe('https://example.com/video.mp4');
  });

  it('calls onChange when user types', () => {
    const handleChange = vi.fn();
    const handleProbe = vi.fn();

    render(
      <MediaUrlInput
        url=""
        onChange={handleChange}
        onProbe={handleProbe}
        isLoading={false}
      />
    );

    const input = screen.getByPlaceholderText(/example\.com/i);
    fireEvent.change(input, { target: { value: 'https://test.com/sample.mp4' } });
    expect(handleChange).toHaveBeenCalledWith('https://test.com/sample.mp4');
  });

  it('triggers onProbe on Inspect button click and on Enter key', () => {
    const handleChange = vi.fn();
    const handleProbe = vi.fn();

    render(
      <MediaUrlInput
        url="https://example.com/stream.mp4"
        onChange={handleChange}
        onProbe={handleProbe}
        isLoading={false}
      />
    );

    const button = screen.getByRole('button', { name: /inspect/i });
    fireEvent.click(button);
    expect(handleProbe).toHaveBeenCalledTimes(1);

    const input = screen.getByPlaceholderText(/example\.com/i);
    fireEvent.keyDown(input, { key: 'Enter', code: 'Enter' });
    expect(handleProbe).toHaveBeenCalledTimes(2);
  });

  it('disables input and button when isLoading or disabled', () => {
    const handleChange = vi.fn();
    const handleProbe = vi.fn();

    const { rerender } = render(
      <MediaUrlInput
        url="https://example.com/stream.mp4"
        onChange={handleChange}
        onProbe={handleProbe}
        isLoading={true}
      />
    );

    const input = screen.getByPlaceholderText(/example\.com/i) as HTMLInputElement;
    expect(input.disabled).toBe(true);

    rerender(
      <MediaUrlInput
        url="https://example.com/stream.mp4"
        onChange={handleChange}
        onProbe={handleProbe}
        isLoading={false}
        disabled={true}
      />
    );

    expect(input.disabled).toBe(true);
  });
});

