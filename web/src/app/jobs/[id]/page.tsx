'use client';

import React, { useEffect, useState, useCallback, use } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  Clock,
  Download,
  AlertCircle,
  FileCheck,
  Ban,
  RotateCcw,
  ShieldCheck,
  Info,
} from 'lucide-react';
import { apiClient } from '@/services/apiClient';
import { JobResponse, FileMetadataResponse } from '@/types/api';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { JobStatusBadge } from '@/components/feedback/JobStatusBadge';
import { ErrorAlert } from '@/components/feedback/ErrorAlert';

export default function JobDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = use(params);
  const jobId = resolvedParams.id;

  const [job, setJob] = useState<JobResponse | null>(null);
  const [fileMetadata, setFileMetadata] = useState<FileMetadataResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isCancelling, setIsCancelling] = useState(false);

  const fetchJob = useCallback(async () => {
    try {
      const data = await apiClient.getJobById(jobId);
      setJob(data);

      if (data.status === 'COMPLETED' && data.outputFileId) {
        try {
          const meta = await apiClient.getFileMetadata(data.outputFileId);
          setFileMetadata(meta);
        } catch (mErr) {
          console.warn('Could not load output file metadata:', mErr);
        }
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load job details from backend.');
    } finally {
      setIsLoading(false);
    }
  }, [jobId]);

  useEffect(() => {
    fetchJob();
    // Poll every 3 seconds if job is active
    const interval = setInterval(() => {
      if (job?.status === 'PENDING' || job?.status === 'QUEUED' || job?.status === 'PROCESSING') {
        fetchJob();
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [fetchJob, job?.status]);

  const handleCancel = async () => {
    if (!confirm('Are you sure you want to cancel this processing job?')) return;
    setIsCancelling(true);
    try {
      await apiClient.cancelJob(jobId);
      await fetchJob();
    } catch (err: any) {
      alert(`Cancellation failed: ${err.message}`);
    } finally {
      setIsCancelling(false);
    }
  };

  const formatFileSize = (bytes?: number): string => {
    if (!bytes || bytes === 0) return '—';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
  };

  return (
    <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6 lg:px-8">
      {/* Navigation */}
      <div className="mb-6">
        <Link href="/history">
          <Button variant="ghost" size="sm" leftIcon={<ArrowLeft className="h-4 w-4" />}>
            Back to Job History
          </Button>
        </Link>
      </div>

      {isLoading && !job ? (
        <Card className="p-12 text-center">
          <Clock className="mx-auto h-8 w-8 animate-pulse text-violet-500" />
          <p className="mt-3 text-sm font-medium text-slate-700 dark:text-slate-300">
            Fetching job telemetry from backend...
          </p>
        </Card>
      ) : error ? (
        <ErrorAlert title="Job Lookup Error" message={error} onClose={() => setError(null)} />
      ) : job ? (
        <div className="space-y-6">
          {/* Header Card */}
          <Card className="p-6 sm:p-8">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-6">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold uppercase tracking-wider text-violet-600 dark:text-violet-400">
                    {job.type || job.jobType} Job
                  </span>
                  <JobStatusBadge status={job.status} />
                </div>
                <h1 className="mt-2 text-2xl font-extrabold tracking-tight text-slate-900 dark:text-slate-100 sm:text-3xl font-mono">
                  {job.id}
                </h1>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  Registered: {job.createdAt ? new Date(job.createdAt).toLocaleString() : '—'}
                </p>
              </div>

              <div className="flex items-center gap-3">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={fetchJob}
                  leftIcon={<RotateCcw className="h-4 w-4" />}
                >
                  Refresh
                </Button>
                {(job.status === 'PENDING' || job.status === 'QUEUED' || job.status === 'PROCESSING') && (
                  <Button
                    variant="danger"
                    size="sm"
                    onClick={handleCancel}
                    isLoading={isCancelling}
                    leftIcon={<Ban className="h-4 w-4" />}
                  >
                    Cancel Job
                  </Button>
                )}
              </div>
            </div>

            {/* Progress Section */}
            <div className="mt-6 space-y-3">
              <ProgressBar
                value={job.progress ?? (job.status === 'COMPLETED' ? 100 : 15)}
                label="Conversion Progress"
                color={job.status === 'COMPLETED' ? 'emerald' : job.status === 'FAILED' ? 'rose' : 'violet'}
                animated={job.status === 'PROCESSING'}
              />
            </div>

            {/* Job Details Grid */}
            <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-4 dark:border-slate-800 dark:bg-slate-900/50">
                <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Target Format</span>
                <p className="mt-1 text-base font-semibold text-slate-900 dark:text-slate-100 uppercase font-mono">
                  {job.targetFormat || job.outputFormat || '—'}
                </p>
              </div>

              <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-4 dark:border-slate-800 dark:bg-slate-900/50">
                <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Quality Preset</span>
                <p className="mt-1 text-base font-semibold text-slate-900 dark:text-slate-100 font-mono">
                  {job.targetQuality || 'Default / High'}
                </p>
              </div>

              <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-4 dark:border-slate-800 dark:bg-slate-900/50">
                <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Last Updated</span>
                <p className="mt-1 text-sm font-semibold text-slate-900 dark:text-slate-100">
                  {job.updatedAt ? new Date(job.updatedAt).toLocaleTimeString() : '—'}
                </p>
              </div>
            </div>

            {/* Error Banner if Failed */}
            {job.errorMessage && (
              <div className="mt-6">
                <ErrorAlert title="Processing Failure" message={job.errorMessage} />
              </div>
            )}

            {/* Completed Output Download Card */}
            {job.status === 'COMPLETED' && (
              <div className="mt-8 rounded-2xl border border-emerald-200 bg-emerald-50/70 p-6 dark:border-emerald-900 dark:bg-emerald-950/30">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <FileCheck className="h-6 w-6 text-emerald-600 dark:text-emerald-400 mt-1" />
                    <div>
                      <h3 className="text-base font-semibold text-emerald-950 dark:text-emerald-200">
                        Media Processed Successfully
                      </h3>
                      <p className="text-xs text-emerald-700 dark:text-emerald-400 mt-0.5">
                        File Size: {formatFileSize(fileMetadata?.fileSize)} • Ephemeral storage expires in 24 hours.
                      </p>
                    </div>
                  </div>

                  {job.outputFileId && (
                    <a
                      href={`${process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8080/api/v1'}/files/${job.outputFileId}/download`}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <Button variant="primary" leftIcon={<Download className="h-4 w-4" />}>
                        Download Converted File
                      </Button>
                    </a>
                  )}
                </div>
              </div>
            )}

            {/* Architecture note for pending/queued jobs */}
            {(job.status === 'PENDING' || job.status === 'QUEUED') && (
              <div className="mt-8 flex items-start gap-2.5 rounded-xl border border-slate-200 bg-slate-50/80 p-4 text-xs text-slate-600 dark:border-slate-800 dark:bg-slate-900/60 dark:text-slate-300">
                <Info className="h-4 w-4 shrink-0 text-violet-500 mt-0.5" />
                <span>
                  <strong>Backend Queue Notice:</strong> This job has been persisted in PostgreSQL via Spring Data JPA and Flyway migration V1. The actual media processing worker (FFmpeg daemon and download engine) will be implemented in <strong>Phase 04 (Downloader)</strong> and <strong>Phase 05 (Converter)</strong>.
                </span>
              </div>
            )}
          </Card>
        </div>
      ) : null}
    </div>
  );
}
