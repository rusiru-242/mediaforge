'use client';

import React from 'react';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Download, FileCheck, ExternalLink, ShieldCheck } from 'lucide-react';
import Link from 'next/link';

interface DownloadResultProps {
  jobId: string;
  outputFileId?: string;
  targetFormat: string;
  targetQuality?: string;
}

export function DownloadResult({ jobId, outputFileId, targetFormat, targetQuality }: DownloadResultProps) {
  const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8080/api/v1';
  const downloadUrl = outputFileId
    ? `${apiBase}/files/${outputFileId}/download`
    : null;

  return (
    <div className="rounded-2xl border border-emerald-200 bg-emerald-50/70 p-6 text-emerald-950 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-200">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-emerald-600 dark:bg-emerald-900/60 dark:text-emerald-400">
            <FileCheck className="h-6 w-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <Badge variant="success">Download Complete</Badge>
              <span className="font-mono text-xs font-semibold uppercase">{targetFormat}</span>
            </div>
            <h3 className="mt-1 text-base font-bold text-slate-900 dark:text-slate-100">
              Media Stream Saved Successfully
            </h3>
            <p className="mt-0.5 text-xs text-emerald-800 dark:text-emerald-300">
              {targetQuality ? `Quality: ${targetQuality} • ` : ''}Ephemeral storage retention: 24 hours.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {downloadUrl ? (
            <a href={downloadUrl} target="_blank" rel="noopener noreferrer">
              <Button variant="primary" leftIcon={<Download className="h-4 w-4" />}>
                Save File to Disk
              </Button>
            </a>
          ) : (
            <Link href={`/jobs/${jobId}`}>
              <Button variant="outline" rightIcon={<ExternalLink className="h-4 w-4" />}>
                Inspect File Telemetry
              </Button>
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
