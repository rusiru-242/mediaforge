'use client';

import React from 'react';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { Button } from '@/components/ui/Button';
import { Ban, Loader2 } from 'lucide-react';

interface DownloadProgressProps {
  progress: number;
  status: string;
  onCancel?: () => void;
  isCancelling?: boolean;
}

export function DownloadProgress({ progress, status, onCancel, isCancelling = false }: DownloadProgressProps) {
  const isTerminal = status === 'COMPLETED' || status === 'FAILED' || status === 'CANCELLED';

  return (
    <div className="space-y-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {!isTerminal && <Loader2 className="h-4 w-4 animate-spin text-violet-600 dark:text-violet-400" />}
          <span className="text-sm font-semibold text-slate-800 dark:text-slate-200">
            {status === 'QUEUED'
              ? 'Job Queued in Downloader Pool...'
              : status === 'PROCESSING'
              ? 'Downloading Media Stream...'
              : status === 'COMPLETED'
              ? 'Download Finished'
              : status}
          </span>
        </div>

        {!isTerminal && onCancel && (
          <Button
            size="sm"
            variant="danger"
            onClick={onCancel}
            isLoading={isCancelling}
            leftIcon={<Ban className="h-3.5 w-3.5" />}
          >
            Cancel
          </Button>
        )}
      </div>

      <ProgressBar
        value={progress}
        color={status === 'COMPLETED' ? 'emerald' : status === 'FAILED' ? 'rose' : 'violet'}
        animated={status === 'PROCESSING'}
      />
    </div>
  );
}
