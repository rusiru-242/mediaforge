'use client';

import React from 'react';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { Button } from '@/components/ui/Button';
import { Ban, Loader2, RotateCcw, Zap, Clock, HardDrive } from 'lucide-react';

interface DownloadProgressProps {
  progress: number;
  status: string;
  onCancel?: () => void;
  isCancelling?: boolean;
  downloadSpeed?: string;
  downloadedBytes?: number;
  totalBytes?: number;
  etaSeconds?: number;
  onRetry?: () => void;
}

function formatBytes(bytes?: number): string {
  if (!bytes || bytes <= 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

function formatEta(seconds?: number): string {
  if (!seconds || seconds <= 0) return 'Calculating...';
  if (seconds < 60) return `${Math.round(seconds)}s remaining`;
  const mins = Math.floor(seconds / 60);
  const secs = Math.round(seconds % 60);
  return `${mins}m ${secs}s remaining`;
}

export function DownloadProgress({
  progress,
  status,
  onCancel,
  isCancelling = false,
  downloadSpeed,
  downloadedBytes,
  totalBytes,
  etaSeconds,
  onRetry,
}: DownloadProgressProps) {
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
              : status === 'FAILED'
              ? 'Download Failed'
              : status === 'CANCELLED'
              ? 'Download Cancelled'
              : status}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {status === 'FAILED' && onRetry && (
            <Button
              size="sm"
              variant="outline"
              onClick={onRetry}
              leftIcon={<RotateCcw className="h-3.5 w-3.5" />}
            >
              Retry Download
            </Button>
          )}

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
      </div>

      <ProgressBar
        value={progress}
        color={status === 'COMPLETED' ? 'emerald' : status === 'FAILED' ? 'rose' : 'violet'}
        animated={status === 'PROCESSING'}
      />

      {/* Telemetry info row */}
      {status === 'PROCESSING' && (downloadSpeed || (downloadedBytes && downloadedBytes > 0) || etaSeconds) && (
        <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-slate-500 dark:text-slate-400 pt-1">
          {downloadedBytes !== undefined && (
            <span className="flex items-center gap-1">
              <HardDrive className="h-3.5 w-3.5 text-slate-400" />
              <span>
                {formatBytes(downloadedBytes)} {totalBytes ? `/ ${formatBytes(totalBytes)}` : ''}
              </span>
            </span>
          )}

          {downloadSpeed && (
            <span className="flex items-center gap-1 font-medium text-slate-700 dark:text-slate-300">
              <Zap className="h-3.5 w-3.5 text-amber-500" />
              <span>{downloadSpeed}</span>
            </span>
          )}

          {etaSeconds !== undefined && etaSeconds > 0 && (
            <span className="flex items-center gap-1">
              <Clock className="h-3.5 w-3.5 text-slate-400" />
              <span>{formatEta(etaSeconds)}</span>
            </span>
          )}
        </div>
      )}
    </div>
  );
}
