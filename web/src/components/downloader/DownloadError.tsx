'use client';

import React from 'react';
import { AlertTriangle, ShieldAlert, XCircle, Info, Lock } from 'lucide-react';
import { ErrorAlert } from '@/components/feedback/ErrorAlert';

interface DownloadErrorProps {
  error: string | null;
  onDismiss?: () => void;
}

export function DownloadError({ error, onDismiss }: DownloadErrorProps) {
  if (!error) return null;

  const lower = error.toLowerCase();
  const isSsrf = lower.includes('ssrf') ||
    lower.includes('loopback') ||
    lower.includes('forbidden') ||
    lower.includes('private') ||
    lower.includes('metadata');

  const isPolicy = lower.includes('terms of service') ||
    lower.includes('drm') ||
    lower.includes('policy') ||
    lower.includes('credentials');

  let title = 'Download Error';
  if (isSsrf) {
    title = 'Security Violation (SSRF Protection)';
  } else if (isPolicy) {
    title = 'Platform Policy Restriction';
  }

  return (
    <div className="space-y-2 text-left">
      <ErrorAlert
        title={title}
        message={error}
        onDismiss={onDismiss}
      />
      {isPolicy && (
        <div className="flex items-start gap-2 rounded-lg bg-amber-50 p-3 text-xs text-amber-900 dark:bg-amber-950/40 dark:text-amber-300">
          <Lock className="h-4 w-4 shrink-0 mt-0.5 text-amber-600 dark:text-amber-400" />
          <span>
            Third-party social platforms require official OAuth developer API credentials. MediaForge strictly respects copyright, DRM, and platform terms.
          </span>
        </div>
      )}
      {isSsrf && (
        <div className="flex items-start gap-2 rounded-lg bg-rose-50 p-3 text-xs text-rose-900 dark:bg-rose-950/40 dark:text-rose-300">
          <ShieldAlert className="h-4 w-4 shrink-0 mt-0.5 text-rose-600 dark:text-rose-400" />
          <span>
            MediaForge does not allow connections to local loopback (127.0.0.1), private RFC 1918 subnets, or cloud metadata endpoints.
          </span>
        </div>
      )}
    </div>
  );
}
