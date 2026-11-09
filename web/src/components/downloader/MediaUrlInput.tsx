'use client';

import React from 'react';
import { ClipboardPaste, Search, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';

interface MediaUrlInputProps {
  url: string;
  onChange: (value: string) => void;
  onProbe: () => void;
  isLoading: boolean;
  disabled?: boolean;
}

export function MediaUrlInput({ url, onChange, onProbe, isLoading, disabled = false }: MediaUrlInputProps) {
  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        onChange(text.trim());
      }
    } catch (e) {
      console.warn('Clipboard paste failed:', e);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && url.trim() && !isLoading && !disabled) {
      e.preventDefault();
      onProbe();
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label htmlFor="media-url-input" className="text-sm font-semibold text-slate-800 dark:text-slate-200">
          Media Source URL
        </label>
        <button
          type="button"
          onClick={handlePaste}
          disabled={disabled || isLoading}
          className="inline-flex items-center gap-1 text-xs font-medium text-violet-600 hover:text-violet-700 dark:text-violet-400 disabled:opacity-50"
        >
          <ClipboardPaste className="h-3.5 w-3.5" />
          Paste from clipboard
        </button>
      </div>

      <div className="flex gap-2">
        <Input
          id="media-url-input"
          type="url"
          placeholder="https://example.com/video.mp4 or direct image link..."
          value={url}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          className="flex-1"
          disabled={disabled || isLoading}
          required
        />
        <Button
          type="button"
          variant="primary"
          onClick={onProbe}
          isLoading={isLoading}
          disabled={!url.trim() || disabled}
          leftIcon={<Search className="h-4 w-4" />}
        >
          Inspect
        </Button>
      </div>
      <p className="text-xs text-slate-500 dark:text-slate-400">
        Supports authorized direct MP4, WebM, MKV, MP3, PNG, JPG, and WebP streams.
      </p>
    </div>
  );
}
