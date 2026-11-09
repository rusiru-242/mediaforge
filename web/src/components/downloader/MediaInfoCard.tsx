'use client';

import React from 'react';
import { MediaMetadataResponse } from '@/types/api';
import { Badge } from '@/components/ui/Badge';
import { MediaThumbnail } from './MediaThumbnail';
import { Clock, HardDrive, CheckCircle2, ShieldCheck, AlertCircle } from 'lucide-react';

interface MediaInfoCardProps {
  metadata: MediaMetadataResponse;
}

export function MediaInfoCard({ metadata }: MediaInfoCardProps) {
  const formatBytes = (bytes?: number) => {
    if (!bytes || bytes <= 0) return 'Stream size dynamic';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
  };

  const formatDuration = (seconds?: number) => {
    if (!seconds || seconds <= 0) return null;
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  return (
    <div className="rounded-2xl border border-violet-200/80 bg-violet-50/40 p-5 dark:border-violet-900/60 dark:bg-violet-950/20">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <MediaThumbnail
          thumbnailUrl={metadata.thumbnail}
          mediaType={metadata.mediaType}
          title={metadata.title}
        />

        <div className="flex-1 space-y-2 text-left">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="default">{metadata.platform}</Badge>
            <Badge variant={metadata.mediaType === 'VIDEO' ? 'info' : metadata.mediaType === 'IMAGE' ? 'warning' : 'success'}>
              {metadata.mediaType}
            </Badge>
            {metadata.containerFormat && (
              <span className="font-mono text-xs font-semibold uppercase text-violet-700 dark:text-violet-300">
                .{metadata.containerFormat}
              </span>
            )}
            {metadata.directDownloadSupported ? (
              <span className="inline-flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-400">
                <CheckCircle2 className="h-3.5 w-3.5" /> Direct Stream Available
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-xs text-amber-600 dark:text-amber-400">
                <AlertCircle className="h-3.5 w-3.5" /> Policy Restricted
              </span>
            )}
          </div>

          <h3 className="line-clamp-2 text-base font-bold text-slate-900 dark:text-slate-100">
            {metadata.title || 'Inspected Media Stream'}
          </h3>

          <div className="flex flex-wrap items-center gap-4 text-xs text-slate-600 dark:text-slate-400">
            {metadata.fileSize && (
              <span className="flex items-center gap-1">
                <HardDrive className="h-3.5 w-3.5" />
                {formatBytes(metadata.fileSize)}
              </span>
            )}
            {metadata.resolution && (
              <span className="rounded bg-slate-200/70 px-1.5 py-0.5 font-mono text-[11px] font-medium text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                {metadata.resolution}
              </span>
            )}
            {metadata.duration && (
              <span className="flex items-center gap-1">
                <Clock className="h-3.5 w-3.5" />
                {formatDuration(metadata.duration)}
              </span>
            )}
            <span className="font-mono text-[11px] text-slate-500">
              {metadata.mimeType}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

