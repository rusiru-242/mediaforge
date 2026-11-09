'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  DownloadCloud,
  CheckCircle,
  AlertCircle,
  ShieldCheck,
  ArrowRight,
  ExternalLink,
  ClipboardPaste,
  Sparkles,
  Info,
} from 'lucide-react';
import { apiClient } from '@/services/apiClient';
import { DownloadValidationResponse, JobResponse } from '@/types/api';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { JobStatusBadge } from '@/components/feedback/JobStatusBadge';
import { ErrorAlert } from '@/components/feedback/ErrorAlert';

export default function DownloaderPage() {
  const [url, setUrl] = useState('');
  const [selectedFormat, setSelectedFormat] = useState('mp4');
  const [selectedQuality, setSelectedQuality] = useState('1080p');

  // Validation State
  const [isValidating, setIsValidating] = useState(false);
  const [validationResult, setValidationResult] = useState<DownloadValidationResponse | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);

  // Submission State
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [createdJob, setCreatedJob] = useState<JobResponse | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        setUrl(text.trim());
        setValidationResult(null);
        setValidationError(null);
        setCreatedJob(null);
      }
    } catch (e) {
      console.warn('Clipboard access denied:', e);
    }
  };

  const handleValidate = async () => {
    if (!url.trim()) {
      setValidationError('Please enter a valid media URL');
      return;
    }

    setIsValidating(true);
    setValidationError(null);
    setValidationResult(null);

    try {
      const res = await apiClient.validateDownloadUrl({ url: url.trim() });
      setValidationResult(res);
      if (!res.valid) {
        setValidationError(res.reason || 'This URL is not supported or was blocked by SSRF defense.');
      }
    } catch (err: any) {
      setValidationError(err.message || 'Failed to validate URL against backend service.');
    } finally {
      setIsValidating(false);
    }
  };

  const handleCreateDownload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim()) {
      setValidationError('Please provide a URL to download.');
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);
    setCreatedJob(null);

    try {
      const job = await apiClient.createDownloadJob({
        url: url.trim(),
        targetFormat: selectedFormat,
        targetQuality: selectedQuality,
      });
      setCreatedJob(job);
    } catch (err: any) {
      setSubmitError(err.message || 'Failed to initiate download job.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="text-center space-y-3">
        <div className="inline-flex items-center gap-2 rounded-full bg-violet-100 px-3 py-1 text-xs font-semibold text-violet-700 dark:bg-violet-950/60 dark:text-violet-300">
          <DownloadCloud className="h-3.5 w-3.5" />
          <span>Universal Stream Ingestion</span>
        </div>
        <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-slate-100 sm:text-4xl">
          Online Media Downloader
        </h1>
        <p className="mx-auto max-w-xl text-sm text-slate-600 dark:text-slate-400">
          Download high-definition video and audio streams from supported authorized URLs.
          Backed by SSRF defense and async background processing queues.
        </p>
      </div>

      {/* Main Download Form Card */}
      <Card className="mt-8 p-6 sm:p-8">
        <form onSubmit={handleCreateDownload} className="space-y-6">
          {/* URL Input */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label htmlFor="media-url" className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                Media Source URL
              </label>
              <button
                type="button"
                onClick={handlePaste}
                className="inline-flex items-center gap-1 text-xs font-medium text-violet-600 hover:text-violet-700 dark:text-violet-400"
              >
                <ClipboardPaste className="h-3.5 w-3.5" />
                Paste from clipboard
              </button>
            </div>

            <div className="flex gap-2">
              <Input
                id="media-url"
                type="url"
                placeholder="https://example.com/video or direct streaming link..."
                value={url}
                onChange={(e) => {
                  setUrl(e.target.value);
                  setValidationResult(null);
                  setValidationError(null);
                }}
                className="flex-1"
                required
              />
              <Button
                type="button"
                variant="outline"
                onClick={handleValidate}
                isLoading={isValidating}
                disabled={!url.trim()}
              >
                Validate
              </Button>
            </div>
          </div>

          {/* Validation Feedback Banner */}
          {validationResult && validationResult.valid && (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50/70 p-4 text-emerald-900 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-300">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                <span className="font-semibold text-sm">URL Validated & Safe</span>
              </div>
              <p className="mt-1 text-xs text-emerald-700 dark:text-emerald-400">
                Host: <span className="font-mono">{validationResult.domain || 'Verified Web Host'}</span> • Scheme: <span className="font-mono">{validationResult.scheme || 'https'}</span> • SSRF Protection Passed.
              </p>
            </div>
          )}

          {validationError && (
            <ErrorAlert
              title="Validation Warning"
              message={validationError}
              onClose={() => setValidationError(null)}
            />
          )}

          {/* Options Grid */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Select
              label="Target Format"
              value={selectedFormat}
              onChange={(e) => setSelectedFormat(e.target.value)}
              options={[
                { label: 'MP4 (Universal Video)', value: 'mp4' },
                { label: 'WEBM (Web Optimized)', value: 'webm' },
                { label: 'MKV (High Quality Container)', value: 'mkv' },
                { label: 'MP3 (Extracted Audio Only)', value: 'mp3' },
                { label: 'AAC (Raw Audio Stream)', value: 'aac' },
              ]}
            />

            <Select
              label="Target Quality"
              value={selectedQuality}
              onChange={(e) => setSelectedQuality(e.target.value)}
              options={[
                { label: '1080p (Full HD)', value: '1080p' },
                { label: '720p (HD)', value: '720p' },
                { label: '480p (Standard Definition)', value: '480p' },
                { label: '360p (Data Saver)', value: '360p' },
                { label: 'Best Available', value: 'best' },
              ]}
            />
          </div>

          {/* Submit Error */}
          {submitError && (
            <ErrorAlert
              title="Failed to Submit Download"
              message={submitError}
              onClose={() => setSubmitError(null)}
            />
          )}

          {/* Submit Action */}
          <div className="pt-2">
            <Button
              type="submit"
              variant="primary"
              size="lg"
              className="w-full"
              isLoading={isSubmitting}
              leftIcon={<DownloadCloud className="h-5 w-5" />}
            >
              Start Download Job
            </Button>
          </div>
        </form>

        {/* Created Job Card */}
        {createdJob && (
          <div className="mt-8 rounded-2xl border border-violet-200 bg-violet-50/50 p-6 dark:border-violet-900 dark:bg-violet-950/20">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <Badge variant="success">Job Created (HTTP 202)</Badge>
                  <JobStatusBadge status={createdJob.status} />
                </div>
                <h3 className="mt-2 text-base font-semibold text-slate-900 dark:text-slate-100">
                  Job ID: <span className="font-mono text-violet-600 dark:text-violet-400">{createdJob.id}</span>
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Format: {createdJob.targetFormat || createdJob.outputFormat} • Quality: {createdJob.targetQuality || selectedQuality}
                </p>
              </div>

              <Link href={`/jobs/${createdJob.id}`}>
                <Button variant="primary" rightIcon={<ArrowRight className="h-4 w-4" />}>
                  Track Progress Live
                </Button>
              </Link>
            </div>

            <div className="mt-4 flex items-start gap-2 rounded-lg bg-white/80 p-3 text-xs text-slate-600 dark:bg-slate-900/80 dark:text-slate-300">
              <Info className="h-4 w-4 shrink-0 text-violet-500 mt-0.5" />
              <span>
                <strong>Architecture Notice:</strong> The Spring Boot backend accepted and queued this job. Full media stream downloading and FFmpeg extraction workers are scheduled for implementation in <strong>Phase 04</strong>.
              </span>
            </div>
          </div>
        )}
      </Card>

      {/* Security & Feature Badges */}
      <div className="mt-12 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="flex items-start gap-3 rounded-xl border border-slate-200/70 bg-white p-4 dark:border-slate-800 dark:bg-slate-900/50">
          <ShieldCheck className="h-5 w-5 text-emerald-500 shrink-0 mt-0.5" />
          <div>
            <h4 className="text-xs font-semibold text-slate-900 dark:text-slate-200">SSRF Protection</h4>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
              Strict loopback and RFC 1918 private IP blocking for safe ingestion.
            </p>
          </div>
        </div>

        <div className="flex items-start gap-3 rounded-xl border border-slate-200/70 bg-white p-4 dark:border-slate-800 dark:bg-slate-900/50">
          <Sparkles className="h-5 w-5 text-violet-500 shrink-0 mt-0.5" />
          <div>
            <h4 className="text-xs font-semibold text-slate-900 dark:text-slate-200">Async Background Queue</h4>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
              Non-blocking processing engine with persistent job tracking.
            </p>
          </div>
        </div>

        <div className="flex items-start gap-3 rounded-xl border border-slate-200/70 bg-white p-4 dark:border-slate-800 dark:bg-slate-900/50">
          <ExternalLink className="h-5 w-5 text-blue-500 shrink-0 mt-0.5" />
          <div>
            <h4 className="text-xs font-semibold text-slate-900 dark:text-slate-200">Multi-Resolution</h4>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
              Supports 1080p, 720p, 480p, 360p, and direct audio stream ripping.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
