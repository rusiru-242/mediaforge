'use client';

import React, { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import {
  History,
  RotateCcw,
  ExternalLink,
  Ban,
  Clock,
  Filter,
  Layers,
} from 'lucide-react';
import { apiClient } from '@/services/apiClient';
import { JobResponse, JobStatus } from '@/types/api';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Select } from '@/components/ui/Select';
import { JobStatusBadge } from '@/components/feedback/JobStatusBadge';
import { ErrorAlert } from '@/components/feedback/ErrorAlert';

export default function HistoryPage() {
  const [jobs, setJobs] = useState<JobResponse[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');

  const fetchJobs = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const statusParam = selectedStatus === 'ALL' ? undefined : (selectedStatus as JobStatus);
      const res = await apiClient.listJobs({ page: 0, size: 50, status: statusParam });
      setJobs(res.content || []);
    } catch (err: any) {
      setError(err.message || 'Failed to load conversion and download job history.');
    } finally {
      setIsLoading(false);
    }
  }, [selectedStatus]);

  useEffect(() => {
    fetchJobs();
  }, [fetchJobs]);

  const handleCancelJob = async (id: string) => {
    if (!confirm('Are you sure you want to cancel this job?')) return;
    try {
      await apiClient.cancelJob(id);
      fetchJobs();
    } catch (err: any) {
      alert(`Could not cancel job: ${err.message}`);
    }
  };

  const formatDate = (isoString?: string) => {
    if (!isoString) return '—';
    try {
      return new Date(isoString).toLocaleString();
    } catch {
      return isoString;
    }
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full bg-violet-100 px-3 py-1 text-xs font-semibold text-violet-700 dark:bg-violet-950/60 dark:text-violet-300">
            <History className="h-3.5 w-3.5" />
            <span>Job Log & Management</span>
          </div>
          <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-slate-900 dark:text-slate-100">
            Job History
          </h1>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
            Audit, track, and inspect all downloads and transcode operations in the MediaForge queue.
          </p>
        </div>

        <Button
          variant="outline"
          onClick={() => fetchJobs()}
          isLoading={isLoading}
          leftIcon={<RotateCcw className="h-4 w-4" />}
        >
          Refresh
        </Button>
      </div>

      {/* Filter Toolbar */}
      <div className="mt-6 flex flex-wrap items-center justify-between gap-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-center gap-3">
          <Filter className="h-4 w-4 text-slate-400" />
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Filter Status:
          </span>
          <div className="w-48">
            <Select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              options={[
                { label: 'All Statuses', value: 'ALL' },
                { label: 'Pending', value: 'PENDING' },
                { label: 'Queued', value: 'QUEUED' },
                { label: 'Processing', value: 'PROCESSING' },
                { label: 'Completed', value: 'COMPLETED' },
                { label: 'Failed', value: 'FAILED' },
                { label: 'Cancelled', value: 'CANCELLED' },
              ]}
            />
          </div>
        </div>

        <div className="text-xs text-slate-500 dark:text-slate-400">
          Showing <strong>{jobs.length}</strong> recorded job(s)
        </div>
      </div>

      {error && (
        <div className="mt-6">
          <ErrorAlert title="History Synchronization Error" message={error} onClose={() => setError(null)} />
        </div>
      )}

      {/* Jobs Table / Card List */}
      <div className="mt-6">
        {isLoading && jobs.length === 0 ? (
          <div className="rounded-xl border border-slate-200 bg-white p-12 text-center dark:border-slate-800 dark:bg-slate-900">
            <Clock className="mx-auto h-8 w-8 animate-pulse text-violet-500" />
            <p className="mt-3 text-sm font-medium text-slate-700 dark:text-slate-300">
              Querying backend job repository...
            </p>
          </div>
        ) : jobs.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-300 bg-white p-12 text-center dark:border-slate-800 dark:bg-slate-900">
            <Layers className="mx-auto h-10 w-10 text-slate-400" />
            <h3 className="mt-3 text-base font-semibold text-slate-900 dark:text-slate-100">
              No jobs found
            </h3>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              No jobs match the current filter. Initiate a download or file conversion to populate the queue.
            </p>
            <div className="mt-6 flex justify-center gap-3">
              <Link href="/downloader">
                <Button variant="primary">Download Media</Button>
              </Link>
              <Link href="/converter/video">
                <Button variant="outline">Convert Video</Button>
              </Link>
            </div>
          </div>
        ) : (
          <Card className="overflow-hidden p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-slate-200 bg-slate-50/75 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:border-slate-800 dark:bg-slate-800/40 dark:text-slate-400">
                  <tr>
                    <th scope="col" className="px-6 py-3.5">Job ID & Type</th>
                    <th scope="col" className="px-6 py-3.5">Target Format</th>
                    <th scope="col" className="px-6 py-3.5">Status</th>
                    <th scope="col" className="px-6 py-3.5">Progress</th>
                    <th scope="col" className="px-6 py-3.5">Created At</th>
                    <th scope="col" className="px-6 py-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                  {jobs.map((job) => (
                    <tr key={job.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/30 transition-colors">
                      <td className="px-6 py-4">
                        <div className="font-mono text-xs font-semibold text-slate-900 dark:text-slate-100">
                          {job.id.substring(0, 8)}...
                        </div>
                        <div className="text-[11px] font-semibold text-violet-600 dark:text-violet-400 uppercase tracking-wider">
                          {job.type || job.jobType}
                        </div>
                      </td>
                      <td className="px-6 py-4 font-mono text-xs font-medium text-slate-700 dark:text-slate-300">
                        {(job.targetFormat || job.outputFormat || '—').toUpperCase()} {job.targetQuality ? `(${job.targetQuality})` : ''}
                      </td>
                      <td className="px-6 py-4">
                        <JobStatusBadge status={job.status} />
                      </td>
                      <td className="px-6 py-4 font-mono text-xs text-slate-600 dark:text-slate-400">
                        {job.progress !== undefined ? `${job.progress}%` : '—'}
                      </td>
                      <td className="px-6 py-4 text-xs text-slate-500 dark:text-slate-400">
                        {formatDate(job.createdAt)}
                      </td>
                      <td className="px-6 py-4 text-right space-x-2">
                        <Link href={`/jobs/${job.id}`}>
                          <Button size="sm" variant="outline" rightIcon={<ExternalLink className="h-3 w-3" />}>
                            Inspect
                          </Button>
                        </Link>
                        {(job.status === 'PENDING' || job.status === 'QUEUED' || job.status === 'PROCESSING') && (
                          <Button
                            size="sm"
                            variant="danger"
                            onClick={() => handleCancelJob(job.id)}
                            leftIcon={<Ban className="h-3 w-3" />}
                          >
                            Cancel
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}
