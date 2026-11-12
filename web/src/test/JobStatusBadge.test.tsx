import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { JobStatusBadge } from '@/components/feedback/JobStatusBadge';

describe('JobStatusBadge', () => {
  it('renders PENDING status badge', () => {
    render(<JobStatusBadge status="PENDING" />);
    const el = screen.getByText('Pending');
    expect(el).toBeDefined();
    expect(el.textContent).toBe('Pending');
  });

  it('renders QUEUED status badge', () => {
    render(<JobStatusBadge status="QUEUED" />);
    const el = screen.getByText('Queued');
    expect(el).toBeDefined();
    expect(el.textContent).toBe('Queued');
  });

  it('renders PROCESSING status badge', () => {
    render(<JobStatusBadge status="PROCESSING" />);
    const el = screen.getByText('Processing');
    expect(el).toBeDefined();
    expect(el.textContent).toBe('Processing');
  });

  it('renders COMPLETED status badge', () => {
    render(<JobStatusBadge status="COMPLETED" />);
    const el = screen.getByText('Completed');
    expect(el).toBeDefined();
    expect(el.textContent).toBe('Completed');
  });

  it('renders FAILED status badge', () => {
    render(<JobStatusBadge status="FAILED" />);
    const el = screen.getByText('Failed');
    expect(el).toBeDefined();
    expect(el.textContent).toBe('Failed');
  });

  it('renders CANCELLED status badge', () => {
    render(<JobStatusBadge status="CANCELLED" />);
    const el = screen.getByText('Cancelled');
    expect(el).toBeDefined();
    expect(el.textContent).toBe('Cancelled');
  });
});
