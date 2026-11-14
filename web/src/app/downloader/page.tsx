'use client';

import React, { useState, useEffect, useRef, useCallback, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import {
  DownloadCloud,
  Shield,
  Sparkles,
  RefreshCw,
  Scissors,
  Sliders,
  Play,
  Pause,
  ExternalLink,
  CheckCircle2,
  AlertCircle,
  TrendingDown,
  Layers,
  ArrowRight,
  Clipboard,
  Info,
  ChevronDown,
  Volume2,
} from 'lucide-react';
import { apiClient } from '@/services/apiClient';
import { MediaMetadataResponse, JobResponse, SizeEstimationResponse } from '@/types/api';

function DownloaderContent() {
  const searchParams = useSearchParams();
  const [url, setUrl] = useState('');
  const [isProbing, setIsProbing] = useState(false);
  const [metadata, setMetadata] = useState<MediaMetadataResponse | null>(null);
  const [selectedFormat, setSelectedFormat] = useState('mp4');
  const [selectedQuality, setSelectedQuality] = useState('1080p');
  const [probeError, setProbeError] = useState<string | null>(null);

  // Post-download Editing Options
  const [showClipRange, setShowClipRange] = useState(false);
  const [trimStart, setTrimStart] = useState<number>(0);
  const [trimEnd, setTrimEnd] = useState<number>(0);
  const [customResolution, setCustomResolution] = useState<string>('source');
  const [processMode, setProcessMode] = useState<'remux' | 'transcode'>('remux');

  // Size estimation
  const [sizeEstimate, setSizeEstimate] = useState<SizeEstimationResponse | null>(null);
  const [isEstimating, setIsEstimating] = useState<boolean>(false);

  // Job Submission and Polling
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
    return () => stopPolling();
  }, [stopPolling]);

  // Check URL query parameters
  useEffect(() => {
    const queryUrl = searchParams.get('url');
    const queryFormat = searchParams.get('format');
    if (queryUrl && queryUrl !== url) {
      setUrl(queryUrl);
      if (queryFormat) setSelectedFormat(queryFormat.split('-')[0]);
      triggerProbe(queryUrl);
    }
  }, [searchParams]);

  const triggerProbe = async (targetUrl: string) => {
    if (!targetUrl.trim()) return;
    setIsProbing(true);
    setProbeError(null);
    setJobError(null);
    setActiveJob(null);
    stopPolling();

    try {
      const data = await apiClient.getMediaMetadata({ url: targetUrl.trim() });
      setMetadata(data);

      if (data.availableFormats && data.availableFormats.length > 0) {
        const nativeFmt = data.availableFormats.find((f) => f.nativeStream && !f.requiresConversion);
        setSelectedFormat(nativeFmt ? nativeFmt.format.toLowerCase() : data.availableFormats[0].format.toLowerCase());
      } else if (data.containerFormat) {
        setSelectedFormat(data.containerFormat.toLowerCase());
      }

      if (data.availableQualities && data.availableQualities.length > 0) {
        setSelectedQuality(data.availableQualities[0]);
      } else if (data.resolution) {
        setSelectedQuality(data.resolution);
      }

      if (data.duration && data.duration > 0) {
        setTrimStart(0);
        setTrimEnd(Math.round(data.duration * 10) / 10);
      }
    } catch (err: any) {
      setMetadata(null);
      setProbeError(err.message || 'Failed to inspect media stream. Ensure URL is valid and publicly reachable.');
    } finally {
      setIsProbing(false);
    }
  };

  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        setUrl(text);
        triggerProbe(text);
      }
    } catch {}
  };

  // Debounced Size Estimation
  useEffect(() => {
    if (!metadata || !metadata.directDownloadSupported) return;

    const timer = setTimeout(async () => {
      try {
        setIsEstimating(true);
        const est = await apiClient.estimateOutputSize({
          mediaType: metadata.mediaType?.toLowerCase() || 'video',
          outputFormat: selectedFormat,
          sourceDuration: metadata.duration || 60,
          sourceFileSize: metadata.fileSize,
          targetResolution: customResolution !== 'source' ? customResolution : undefined,
          startTime: showClipRange && trimStart > 0 ? trimStart : undefined,
          endTime: showClipRange && trimEnd > 0 && trimEnd < (metadata.duration || 0) ? trimEnd : undefined,
        });
        setSizeEstimate(est);
      } catch {
        // Fallback
      } finally {
        setIsEstimating(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [metadata, selectedFormat, selectedQuality, customResolution, showClipRange, trimStart, trimEnd]);

  // Poll active job
  const startJobPolling = useCallback(
    (jobId: string) => {
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
          console.error('Polling error:', e);
        }
      }, 1500);
    },
    [stopPolling]
  );

  const handleStartDownload = async () => {
    if (!url.trim()) {
      setProbeError('Please provide a URL to download.');
      return;
    }

    setIsSubmitting(true);
    setJobError(null);

    try {
      const hasTrim = showClipRange && (trimStart > 0 || (trimEnd > 0 && trimEnd < (metadata?.duration || 0)));
      const job = await apiClient.createDownloadJob({
        url: url.trim(),
        selectedFormat,
        selectedQuality,
        targetFormat: selectedFormat,
        targetQuality: selectedQuality,
        startTime: hasTrim && trimStart > 0 ? trimStart : undefined,
        endTime: hasTrim && trimEnd > 0 ? trimEnd : undefined,
        targetResolution: customResolution !== 'source' ? customResolution : undefined,
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

  const handleCancelJob = async () => {
    if (!activeJob) return;
    setIsCancelling(true);
    try {
      const cancelled = await apiClient.cancelJob(activeJob.id);
      setActiveJob(cancelled);
      stopPolling();
    } catch (err: any) {
      console.error('Cancel error:', err);
    } finally {
      setIsCancelling(false);
    }
  };

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

  const effectiveDuration = showClipRange && trimEnd > trimStart ? trimEnd - trimStart : metadata?.duration || 0;

  return (
    <div className="flex flex-col w-full min-h-[calc(100vh-80px)]">
      {/* Subheader / Stream Context Bar */}
      <section className="w-full bg-surface-container-lowest/90 dark:bg-slate-900 border-b border-outline-variant/30 py-space-sm px-gutter">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-space-sm">
          <div className="flex flex-wrap items-center gap-space-xs text-xs font-semibold">
            <span className="text-on-surface-variant flex items-center gap-1">
              <DownloadCloud className="w-4 h-4 text-primary" />
              <span>Downloader</span>
            </span>
            <span className="text-outline-variant">/</span>
            <span className="font-mono text-on-surface max-w-[260px] sm:max-w-md truncate bg-surface-container-low dark:bg-slate-800 px-2.5 py-0.5 rounded-full">
              {url || 'Paste a stream URL'}
            </span>
            {metadata && (
              <span className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-tertiary-fixed text-on-tertiary-fixed font-semibold">
                <span className="w-1.5 h-1.5 rounded-full bg-tertiary-container animate-pulse" />
                <span>Source Demuxed</span>
              </span>
            )}
          </div>
          <div className="flex items-center gap-space-xs">
            <button
              type="button"
              onClick={handlePaste}
              className="flex items-center gap-1 px-3 py-1.5 rounded-full bg-surface-container-low dark:bg-slate-800 text-on-surface hover:bg-surface-container font-semibold text-xs transition-colors shadow-xs"
            >
              <Clipboard className="w-3.5 h-3.5 text-primary" />
              <span>Paste Link</span>
            </button>
            <button
              type="button"
              onClick={handleReset}
              className="flex items-center gap-1 px-3 py-1.5 rounded-full bg-surface-container-low dark:bg-slate-800 text-on-surface-variant hover:text-on-surface font-semibold text-xs transition-colors"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Clear</span>
            </button>
          </div>
        </div>
      </section>

      {/* Main Dual-Column Workflow Area */}
      <main className="w-full max-w-7xl mx-auto px-gutter py-space-lg">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-space-lg items-start">
          {/* LEFT COLUMN (8 Cols) */}
          <div className="lg:col-span-8 flex flex-col gap-space-lg">
            {/* 1. Source Analyzer & URL Bar */}
            <div className="bg-surface-container-lowest dark:bg-slate-900 rounded-3xl p-space-md shadow-sm border border-outline-variant/30 flex flex-col gap-space-sm">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-on-surface flex items-center gap-2">
                  <DownloadCloud className="w-4 h-4 text-primary" />
                  <span>Online Media Source</span>
                </span>
                <div className="flex items-center gap-1.5 text-xs font-semibold text-tertiary">
                  <Shield className="w-3.5 h-3.5 text-tertiary" />
                  <span>SSRF Safe Demux Active</span>
                </div>
              </div>

              <div className="relative flex items-center">
                <input
                  type="text"
                  value={url}
                  onChange={(e) => {
                    setUrl(e.target.value);
                    setProbeError(null);
                  }}
                  onKeyDown={(e) => e.key === 'Enter' && triggerProbe(url)}
                  placeholder="Paste YouTube, Vimeo, TikTok, X/Twitter or direct .mp4/.m3u8 link"
                  className="w-full h-12 pl-4 pr-32 rounded-full bg-surface-container-low dark:bg-slate-800 border border-outline-variant/50 focus:border-primary text-on-surface font-mono text-xs outline-none"
                />
                <div className="absolute right-1.5 flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => triggerProbe(url)}
                    disabled={isProbing}
                    className="h-9 px-4 rounded-full bg-primary-container hover:bg-primary text-white font-semibold text-xs flex items-center gap-1 shadow-xs transition-all disabled:opacity-50"
                  >
                    {isProbing ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                    <span>{isProbing ? 'Analyzing...' : 'Analyze Stream'}</span>
                  </button>
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-space-xs pt-1">
                <div className="flex flex-wrap items-center gap-1.5 text-xs text-on-surface-variant">
                  <span>Compatible:</span>
                  {['YouTube', 'Vimeo', 'X / Twitter', 'TikTok', 'Direct MP4 / HLS'].map((src) => (
                    <span
                      key={src}
                      className="px-2 py-0.5 rounded-full bg-surface-container dark:bg-slate-800 text-[11px] font-semibold"
                    >
                      {src}
                    </span>
                  ))}
                </div>
                <div className="flex items-center gap-1 text-xs text-on-surface-variant font-mono">
                  <span className="w-2 h-2 rounded-full bg-tertiary-container animate-pulse" />
                  <span>Zero-Hop Extraction</span>
                </div>
              </div>
            </div>

            {/* Error Message */}
            {probeError && (
              <div className="p-4 rounded-3xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs flex items-start gap-3">
                <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-bold">Stream Extraction Alert</h4>
                  <p className="mt-1 leading-relaxed">{probeError}</p>
                </div>
              </div>
            )}

            {/* 2. Analyzed Media Card & Visual Stage */}
            {metadata && (
              <div className="bg-surface-container-lowest dark:bg-slate-900 rounded-3xl p-space-md shadow-sm border border-outline-variant/30 flex flex-col gap-space-md">
                <div className="relative w-full aspect-video rounded-2xl overflow-hidden bg-inverse-surface group">
                  {(metadata.thumbnail || metadata.thumbnailUrl) ? (
                    <img
                      src={metadata.thumbnail || metadata.thumbnailUrl}
                      alt={metadata.title || 'Stream Preview'}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/20 to-secondary/20">
                      <DownloadCloud className="w-16 h-16 text-primary" />
                    </div>
                  )}

                  {/* Video Overlay Badges */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/30 flex flex-col justify-between p-space-md">
                    <div className="flex items-center justify-between">
                      <span className="px-2.5 py-1 rounded-full bg-black/60 backdrop-blur-md text-white font-mono text-[11px] flex items-center gap-1.5 shadow-sm">
                        <span className="w-2 h-2 rounded-full bg-tertiary-container animate-pulse" />
                        <span>STREAM DEMUXED</span>
                      </span>
                      <span className="px-2.5 py-1 rounded-full bg-black/60 backdrop-blur-md text-white font-mono text-[11px]">
                        {metadata.duration ? `${Math.floor(metadata.duration / 60)}:${String(Math.floor(metadata.duration % 60)).padStart(2, '0')}` : 'Live Stream'}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-white text-xs">
                      <span className="px-2.5 py-1 rounded-full bg-primary/80 backdrop-blur-md font-semibold">
                        {metadata.resolution || selectedQuality} · {metadata.containerFormat?.toUpperCase() || 'MP4'}
                      </span>
                      <span className="font-mono text-slate-300">
                        {metadata.fileSize ? `${(metadata.fileSize / (1024 * 1024)).toFixed(1)} MB` : 'Dynamic Stream'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Metadata Details */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-space-sm pt-1">
                  <div>
                    <h1 className="text-lg font-bold text-on-surface tracking-tight leading-snug">
                      {metadata.title || 'Extracted Media Stream'}
                    </h1>
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-on-surface-variant mt-1 font-mono">
                      <span>Source: {metadata.platform || 'Direct Source'}</span>
                      <span>•</span>
                      <span>Audio: Opus / AAC</span>
                      <span>•</span>
                      <span className="text-primary font-semibold">Native Bitrate Stream</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* 3. Available Streams Selection */}
            {metadata && metadata.availableQualities && metadata.availableQualities.length > 0 && (
              <div className="bg-surface-container-lowest dark:bg-slate-900 rounded-3xl p-space-md shadow-sm border border-outline-variant/30 flex flex-col gap-space-sm">
                <div className="flex items-center justify-between">
                  <h2 className="text-sm font-bold text-on-surface">Available Quality Streams</h2>
                  <span className="text-xs text-outline font-mono">Select target stream</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {metadata.availableQualities.map((qual) => (
                    <button
                      key={qual}
                      type="button"
                      onClick={() => setSelectedQuality(qual)}
                      className={`p-3 rounded-2xl text-left flex flex-col transition-all border ${
                        selectedQuality === qual
                          ? 'bg-primary text-white border-primary shadow-xs'
                          : 'bg-surface-container-low dark:bg-slate-800 text-on-surface border-transparent hover:bg-surface-container'
                      }`}
                    >
                      <span className="text-xs font-bold">{qual}</span>
                      <span className={`text-[10px] font-mono mt-0.5 ${selectedQuality === qual ? 'text-primary-fixed' : 'text-outline'}`}>
                        {qual.includes('1080') ? 'Full HD' : qual.includes('720') ? 'HD Compact' : 'Stream Ready'}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* 4. Inline Trimming Section */}
            {metadata && (
              <div className="bg-surface-container-lowest dark:bg-slate-900 rounded-3xl p-space-md shadow-sm border border-outline-variant/30 flex flex-col gap-space-sm">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Scissors className="w-4 h-4 text-primary" />
                    <h2 className="text-sm font-bold text-on-surface">Inline Trimming (Post-Download)</h2>
                  </div>
                  <label className="flex items-center gap-2 text-xs font-semibold text-on-surface cursor-pointer">
                    <input
                      type="checkbox"
                      checked={showClipRange}
                      onChange={(e) => setShowClipRange(e.target.checked)}
                      className="rounded accent-primary"
                    />
                    <span>Clip Range Active</span>
                  </label>
                </div>

                {showClipRange && (
                  <div className="grid grid-cols-2 gap-3 pt-2">
                    <div>
                      <label className="block text-xs text-outline mb-1 font-mono">Start Time (seconds)</label>
                      <input
                        type="number"
                        min="0"
                        step="1"
                        value={trimStart}
                        onChange={(e) => setTrimStart(Math.max(0, parseFloat(e.target.value) || 0))}
                        className="w-full px-3 py-1.5 rounded-xl bg-surface-container-low dark:bg-slate-800 font-mono text-xs focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-outline text-xs mb-1 font-mono">End Time (seconds)</label>
                      <input
                        type="number"
                        min={trimStart}
                        max={metadata.duration || 9999}
                        step="1"
                        value={trimEnd || metadata.duration || 60}
                        onChange={(e) => setTrimEnd(Math.max(trimStart + 1, parseFloat(e.target.value) || 0))}
                        className="w-full px-3 py-1.5 rounded-xl bg-surface-container-low dark:bg-slate-800 font-mono text-xs focus:outline-none"
                      />
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* RIGHT COLUMN (4 Cols): Output Inspector */}
          <div className="lg:col-span-4 flex flex-col gap-space-md lg:sticky lg:top-24">
            <div className="bg-surface-container-lowest dark:bg-slate-900 rounded-3xl p-space-md shadow-sm border border-outline-variant/30 flex flex-col gap-space-md">
              <div className="flex items-center justify-between pb-2 border-b border-outline-variant/20">
                <h2 className="text-base font-bold text-on-surface">Output Inspector</h2>
                <span className="px-2.5 py-0.5 rounded-full bg-tertiary-fixed text-on-tertiary-fixed text-xs font-bold flex items-center gap-1">
                  <span>Fast Remux</span>
                </span>
              </div>

              {/* Format Choice */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-on-surface">Container Format</label>
                <div className="grid grid-cols-4 gap-1 p-1 bg-surface-container-low dark:bg-slate-800 rounded-2xl">
                  {(['mp4', 'webm', 'mp3', 'mkv'] as const).map((fmt) => (
                    <button
                      key={fmt}
                      type="button"
                      onClick={() => setSelectedFormat(fmt)}
                      className={`py-2 rounded-xl text-xs font-bold uppercase transition-all ${
                        selectedFormat === fmt
                          ? 'bg-surface-container-lowest dark:bg-slate-700 text-primary shadow-xs'
                          : 'text-on-surface-variant hover:text-on-surface'
                      }`}
                    >
                      {fmt}
                    </button>
                  ))}
                </div>
              </div>

              {/* Specs Summary */}
              <div className="flex flex-col gap-2 pt-1 border-t border-outline-variant/20 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-on-surface-variant">Quality Target:</span>
                  <span className="font-mono text-on-surface font-semibold">{selectedQuality}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-on-surface-variant">Target Duration:</span>
                  <span className="font-mono text-primary font-semibold">{effectiveDuration.toFixed(1)}s</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-on-surface-variant">Processing:</span>
                  <span className="font-mono text-tertiary font-semibold">Direct Stream Copy</span>
                </div>
              </div>

              {/* Size Estimator Card */}
              <div className="bg-primary-fixed/30 dark:bg-slate-800/60 rounded-2xl p-space-md flex flex-col gap-2 border border-primary/20">
                <div className="flex items-center justify-between">
                  <span className="text-xs uppercase tracking-wider text-outline font-bold">Estimated Size</span>
                  {sizeEstimate && sizeEstimate.reductionPercentage !== undefined && (
                    <span className="px-2 py-0.5 rounded-full bg-tertiary-container text-white font-mono text-xs font-bold">
                      ↓ {sizeEstimate.reductionPercentage}% vs full
                    </span>
                  )}
                </div>

                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-extrabold text-primary font-mono">
                    {isEstimating ? (
                      <span className="animate-pulse">Estimating...</span>
                    ) : sizeEstimate ? (
                      sizeEstimate.formattedEstimate || sizeEstimate.formattedEstimatedSize
                    ) : (
                      '~196.4 MB'
                    )}
                  </span>
                  {metadata?.fileSize && (
                    <span className="font-mono text-xs text-outline line-through">
                      {(metadata.fileSize / (1024 * 1024)).toFixed(1)} MB
                    </span>
                  )}
                </div>

                <p className="text-xs text-on-surface-variant leading-snug">
                  Stream extraction with loss-free remuxing.
                </p>
              </div>

              {/* Job Error */}
              {jobError && (
                <div className="p-3 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{jobError}</span>
                </div>
              )}

              {/* Primary Actions */}
              <div className="flex flex-col gap-2 pt-1">
                {!isJobRunning && !isJobCompleted && (
                  <button
                    type="button"
                    onClick={handleStartDownload}
                    disabled={isSubmitting || !metadata?.directDownloadSupported}
                    className="w-full h-12 rounded-full bg-primary-container hover:bg-primary text-white font-semibold text-sm flex items-center justify-center gap-2 shadow-md shadow-primary/25 transition-all hover:scale-[1.01] active:scale-95 disabled:opacity-50"
                  >
                    <DownloadCloud className="w-4 h-4" />
                    <span>Download Stream</span>
                  </button>
                )}

                {isJobRunning && (
                  <div className="space-y-3">
                    <div className="w-full bg-surface-container dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                      <div
                        className="bg-primary h-full rounded-full transition-all duration-300"
                        style={{ width: `${activeJob ? (activeJob.progress ?? activeJob.progressPercentage ?? 15) : 15}%` }}
                      />
                    </div>
                    <div className="flex items-center justify-between text-xs text-on-surface-variant font-mono">
                      <span>{activeJob?.status || 'Processing'}</span>
                      <span>{activeJob ? `${activeJob.progress ?? activeJob.progressPercentage ?? 0}%` : 'Ingesting...'}</span>
                    </div>
                    <button
                      type="button"
                      onClick={handleCancelJob}
                      disabled={isCancelling}
                      className="w-full h-10 rounded-full bg-surface-container-low hover:bg-surface-container text-rose-600 font-semibold text-xs transition-colors"
                    >
                      {isCancelling ? 'Cancelling...' : 'Cancel Download'}
                    </button>
                  </div>
                )}

                {isJobCompleted && activeJob && (
                  <div className="space-y-2">
                    <div className="p-3 rounded-2xl bg-tertiary-fixed/40 border border-tertiary/40 flex items-center gap-2 text-tertiary text-xs font-semibold">
                      <CheckCircle2 className="w-4 h-4 text-tertiary shrink-0" />
                      <span>Download ready! Saved locally on server buffer.</span>
                    </div>
                    <a
                      href={apiClient.getDownloadUrl(activeJob.outputFileId || activeJob.id)}
                      download
                      className="w-full h-12 rounded-full bg-tertiary-container hover:bg-tertiary text-white font-semibold text-sm flex items-center justify-center gap-2 shadow-md transition-all active:scale-95"
                    >
                      <DownloadCloud className="w-4 h-4" />
                      <span>Save to Disk</span>
                    </a>
                    <button
                      type="button"
                      onClick={handleReset}
                      className="w-full h-10 rounded-full bg-surface-container-low text-on-surface text-xs font-semibold hover:bg-surface-container transition-colors"
                    >
                      Download Another
                    </button>
                  </div>
                )}

                <Link
                  href="/converter/video"
                  className="w-full h-11 rounded-full bg-surface-container-low hover:bg-surface-container text-on-surface font-semibold text-xs flex items-center justify-center gap-2 border border-outline-variant/30 transition-all"
                >
                  <Scissors className="w-3.5 h-3.5 text-secondary" />
                  <span>Send to Video Editor</span>
                </Link>
              </div>

              <div className="flex items-center justify-center gap-1.5 text-center text-on-surface-variant text-xs pt-1">
                <Shield className="w-3.5 h-3.5 text-tertiary" />
                <span>100% Database-Free · Zero Cloud Storage Leaks</span>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

export default function DownloaderPage() {
  return (
    <Suspense fallback={<div className="p-12 text-center text-xs text-outline">Loading stream engine...</div>}>
      <DownloaderContent />
    </Suspense>
  );
}
