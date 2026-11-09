'use client';

import React from 'react';
import { JobStatusBadge } from '@/components/feedback/JobStatusBadge';
import { JobStatus } from '@/types/api';

interface DownloadStatusProps {
  status: JobStatus | string;
}

export function DownloadStatus({ status }: DownloadStatusProps) {
  return (
    <div className="inline-flex items-center gap-2">
      <JobStatusBadge status={status as JobStatus} />
    </div>
  );
}

