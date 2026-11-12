'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import {
  DownloadCloud,
  ShieldCheck,
  Sparkles,
  ExternalLink,
  RefreshCw,
  ArrowRight,
  CheckCircle,
} from 'lucide-react';
import { apiClient } from '@/services/apiClient';
import { MediaMetadataResponse, MediaFormatOptionDto, JobResponse } from '@/types/api';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { MediaUrlInput } from '@/components/downloader/MediaUrlInput';
import { MediaInfoCard } from '@/components/downloader/MediaInfoCard';
import { MediaFormatSelector } from '@/components/downloader/MediaFormatSelector';
import { MediaQualitySelector } from '@/components/downloader/MediaQualitySelector';
import { DownloadProgress } from '@/components/downloader/DownloadProgress';
import { DownloadResult } from '@/components/downloader/DownloadResult';
import { DownloadError } from '@/components/downloader/DownloadError';

export default function DownloaderPage() {
  const [url, setUrl] = useState('');
  const [isProbing, setIsProbing] = useState(false);
  const [metadata, setMetadata] = useState<MediaMetadataResponse | null>(null);
  const [selectedFormat, setSelectedFormat] = useState('mp4');
  const [selectedQuality, setSelectedQuality] = useState('1080p');
  const [probeError, setProbeError] = useState<string | null>(null);

  // Job Submission and Polling State
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeJob, setActiveJob] = useState<JobResponse | null>(null);
  const [jobError, setJobError] = useState<string | null>(null);
  const [isCancelling, setIsCancelling] = useState(false);

  const pollingRef = useRef<NodeJS.Timeout | null>(null);

  const stopPolling = useCallback(() => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
  }, []);

  useEffect(() => {
    return () => {
      stopPolling();
    };
  }, [stopPolling]);

  // Handle URL probe / metadata inspection
  const handleProbe = async () => {
    if (!url.trim()) {
      setProbeError('Please enter a valid media URL');
      return;
    }

    setIsProbing(true);
    setProbeError(null);
    setJobError(null);
    setActiveJob(null);
    stopPolling();

    try {
      const data = await apiClient.getMediaMetadata({ url: url.trim() });
      setMetadata(data);

      // Select default format based on native availability
      if (data.availableFormats && data.availableFormats.length > 0) {
        const nativeFmt = data.availableFormats.find((f) => f.nativeStream && !f.requiresConversion);
        if (nativeFmt) {
          setSelectedFormat(nativeFmt.format.toLowerCase());
        } else {
          setSelectedFormat(data.availableFormats[0].format.toLowerCase());
        }
      } else if (data.containerFormat) {
        setSelectedFormat(data.containerFormat.toLowerCase());
      }

      // Select default quality
      if (data.availableQualities && data.availableQualities.length > 0) {
        setSelectedQuality(data.availableQualities[0]);
      } else if (data.resolution) {
        setSelectedQuality(data.resolution);
      }
    } catch (err: any) {
      setMetadata(null);
      setProbeError(err.message || 'Failed to inspect media stream. Ensure URL is valid and publicly reachable.');
    } finally {
      setIsProbing(false);
    }
  };

  // Poll active job status until terminal
  const startJobPolling = useCallback((jobId: string) => {
    stopPolling();

    pollingRef.current = setInterval(async () => {
      try {
        const updated = await apiClient.getJobById(jobId);
        setActiveJob(updated);

        if (updated.status === 'COMPLETED' || updated.status === 'FAILED' || updated.status === 'CANCELLED') {
          stopPolling();
          if (updated.status === 'FAILED') {
            setJobError(updated.errorMessage || 'Media download processing failed.');
          }
        }
      } catch (e: any) {
        console.error('Polling error for job:', jobId, e);
      }
    }, 1500);
  }, [stopPolling]);

  // Handle Download submission
  const handleStartDownload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim()) {
      setProbeError('Please provide a URL to download.');
      return;
    }

    setIsSubmitting(true);
    setJobError(null);

    try {
      const job = await apiClient.createDownloadJob({
        url: url.trim(),
        targetFormat: selectedFormat,
        targetQuality: selectedQuality,
      });

      setActiveJob(job);
      if (job.status !== 'COMPLETED' && job.status !== 'FAILED') {
        startJobPolling(job.id);
      }
    } catch (err: any) {
      setJobError(err.message || 'Failed to initiate download job.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle cancellation
  const handleCancelJob = async () => {
    if (!activeJob) return;

    setIsCancelling(true);
    try {
      const cancelled = await apiClient.cancelJob(activeJob.id);
      setActiveJob(cancelled);
      stopPolling();
    } catch (err: any) {
      console.error('Failed to cancel job:', err);
    } finally {
      setIsCancelling(false);
    }
  };

  // Handle reset to inspect a new URL
  const handleReset = () => {
    stopPolling();
    setUrl('');
    setMetadata(null);
    setActiveJob(null);
    setProbeError(null);
    setJobError(null);
  };

  const isJobRunning = Boolean(activeJob && (activeJob.status === 'QUEUED' || activeJob.status === 'PROCESSING'));
  const isJobCompleted = Boolean(activeJob && activeJob.status === 'COMPLETED');

  return (
    <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="text-center space-y-3">
        <div className="inline-flex items-center gap-2 rounded-full bg-violet-100 px-3 py-1 text-xs font-semibold text-violet-700 dark:bg-violet-950/60 dark:text-violet-300">
          <DownloadCloud className="h-3.5 w-3.5" />
          <span>Universal Stream Ingestion Engine</span>
        </div>
        <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-slate-100 sm:text-4xl">
          Online Media Downloader
        </h1>
        <p className="mx-auto max-w-xl text-sm text-slate-600 dark:text-slate-400">
          Inspect, probe, and stream high-definition video, audio, and images from authorized sources.
          Protected by multi-hop SSRF validation, ephemeral 24h storage, and asynchronous background queues.
        </p>
      </div>

      {/* Main Interactive Card */}
      <Card className="mt-8 p-6 sm:p-8 space-y-6">
        {/* URL Input Bar */}
        <MediaUrlInput
          url={url}
          onChange={(newVal) => {
            setUrl(newVal);
            setProbeError(null);
          }}
          onProbe={handleProbe}
          isLoading={isProbing}
          disabled={isSubmitting || isJobRunning}
        />

        {/* Probe / Inspection Error */}
        {probeError && (
          <DownloadError
            error={probeError}
            onDismiss={() => setProbeError(null)}
          />
        )}

        {/* Metadata Preview & Format Configuration */}
        {metadata && (
          <div className="space-y-6 pt-2 animate-in fade-in-50 duration-300">
            <MediaInfoCard metadata={metadata} />

            <form onSubmit={handleStartDownload} className="space-y-6">
              {/* Format Selection */}
              <MediaFormatSelector
                formats={metadata.availableFormats || []}
                selectedFormat={selectedFormat}
                onSelectFormat={setSelectedFormat}
                disabled={isSubmitting || isJobRunning}
              />

              {/* Quality Selection */}
              {metadata.availableQualities && metadata.availableQualities.length > 0 && (
                <MediaQualitySelector
                  qualities={metadata.availableQualities}
                  selectedQuality={selectedQuality}
                  onSelectQuality={setSelectedQuality}
                  disabled={isSubmitting || isJobRunning}
                />
              )}

              {/* Job / Submission Error */}
              {jobError && (
                <DownloadError
                  error={jobError}
                  onDismiss={() => setJobError(null)}
                />
              )}

              {/* Action Buttons */}
              <div className="flex flex-col gap-3 sm:flex-row">
                <Button
                  type="submit"
                  variant="primary"
                  size="lg"
                  className="flex-1"
                  isLoading={isSubmitting}
                  disabled={!metadata.directDownloadSupported || isJobRunning}
                  leftIcon={<DownloadCloud className="h-5 w-5" />}
                >
                  {isJobRunning ? 'Download in Progress...' : 'Start Download Job'}
                </Button>

                {metadata && (
                  <Button
                    type="button"
                    variant="outline"
                    size="lg"
                    onClick={handleReset}
                    disabled={isJobRunning}
                    leftIcon={<RefreshCw className="h-4 w-4" />}
                  >
                    Reset
                  </Button>
                )}
              </div>
            </form>
          </div>
        )}

        {/* Active Download Progress */}
        {activeJob && (
          <div className="space-y-4 pt-4 border-t border-slate-200/80 dark:border-slate-800">
            <DownloadProgress
              progress={activeJob.progress || (activeJob.status === 'COMPLETED' ? 100 : 15)}
              status={activeJob.status}
              onCancel={handleCancelJob}
              isCancelling={isCancelling}
            />

            {/* Completed Result Card */}
            {isJobCompleted && (
              <DownloadResult
                jobId={activeJob.id}
                outputFileId={activeJob.outputFileId}
                targetFormat={activeJob.targetFormat || activeJob.outputFormat || selectedFormat}
                targetQuality={activeJob.targetQuality || selectedQuality}
              />
            )}

            {/* Track in Jobs Manager link */}
            <div className="flex justify-between items-center text-xs text-slate-500 dark:text-slate-400">
              <span>Job ID: <code className="font-mono">{activeJob.id}</code></span>
              <Link
                href={`/jobs/${activeJob.id}`}
                className="inline-flex items-center gap-1 font-medium text-violet-600 hover:text-violet-700 dark:text-violet-400"
              >
                Inspect in Jobs Manager <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          </div>
        )}
      </Card>

      {/* Security & Feature Highlights */}
      <div className="mt-12 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="flex items-start gap-3 rounded-xl border border-slate-200/70 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900/50">
          <ShieldCheck className="h-5 w-5 text-emerald-500 shrink-0 mt-0.5" />
          <div>
            <h4 className="text-xs font-semibold text-slate-900 dark:text-slate-200">SSRF Defense-in-Depth</h4>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
              Strict loopback, RFC 1918 private subnets, and AWS/GCP cloud metadata IP blocking across all redirect hops.
            </p>
          </div>
        </div>

        <div className="flex items-start gap-3 rounded-xl border border-slate-200/70 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900/50">
          <Sparkles className="h-5 w-5 text-violet-500 shrink-0 mt-0.5" />
          <div>
            <h4 className="text-xs font-semibold text-slate-900 dark:text-slate-200">Async Downloader Pool</h4>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
              High-throughput asynchronous queue with live byte tracking, cancellation support, and 24h retention cleanup.
            </p>
          </div>
        </div>

        <div className="flex items-start gap-3 rounded-xl border border-slate-200/70 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900/50">
          <ExternalLink className="h-5 w-5 text-blue-500 shrink-0 mt-0.5" />
          <div>
            <h4 className="text-xs font-semibold text-slate-900 dark:text-slate-200">Real Stream Probing</h4>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
              Live HTTP/FFprobe container inspection. Clear distinction between native streams and conversion requirements.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
