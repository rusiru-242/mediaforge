'use client';

import React from 'react';
import { MediaFormatOptionDto } from '@/types/api';
import { Badge } from '@/components/ui/Badge';
import { Check, Sparkles } from 'lucide-react';

interface MediaFormatSelectorProps {
  formats: MediaFormatOptionDto[];
  selectedFormat: string;
  onSelectFormat: (format: string) => void;
  disabled?: boolean;
}

export function MediaFormatSelector({
  formats,
  selectedFormat,
  onSelectFormat,
  disabled = false,
}: MediaFormatSelectorProps) {
  if (!formats || formats.length === 0) {
    return null;
  }

  return (
    <div className="space-y-2 text-left">
      <label className="text-sm font-semibold text-slate-800 dark:text-slate-200">
        Target Media Format
      </label>

      <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
        {formats.map((f) => {
          const isSelected = selectedFormat.toLowerCase() === f.format.toLowerCase();
          const isAvailable = f.nativeStream && !f.requiresConversion;

          return (
            <div
              key={f.format}
              role="button"
              tabIndex={isAvailable && !disabled ? 0 : -1}
              onClick={() => isAvailable && !disabled && onSelectFormat(f.format)}
              onKeyDown={(e) => {
                if ((e.key === 'Enter' || e.key === ' ') && isAvailable && !disabled) {
                  e.preventDefault();
                  onSelectFormat(f.format);
                }
              }}
              className={`flex items-center justify-between rounded-xl border p-3 transition-all ${
                isSelected
                  ? 'border-violet-600 bg-violet-50/80 shadow-sm dark:border-violet-400 dark:bg-violet-950/40'
                  : isAvailable
                  ? 'border-slate-200 bg-white hover:border-slate-300 dark:border-slate-800 dark:bg-slate-900 dark:hover:border-slate-700 cursor-pointer'
                  : 'border-slate-200/60 bg-slate-100/50 opacity-60 dark:border-slate-800/50 dark:bg-slate-900/40 cursor-not-allowed'
              }`}
            >
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-sm font-bold uppercase text-slate-900 dark:text-slate-100">
                    {f.format}
                  </span>
                  {f.nativeStream ? (
                    <Badge variant="success">Native Stream</Badge>
                  ) : (
                    <Badge variant="secondary">Phase 05 Transcoder</Badge>
                  )}
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  {f.quality || 'Standard'} {f.resolution ? `(${f.resolution})` : ''}
                </p>
              </div>

              {isSelected && (
                <div className="flex h-6 w-6 items-center justify-center rounded-full bg-violet-600 text-white dark:bg-violet-500">
                  <Check className="h-3.5 w-3.5" />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
