'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import Link from 'next/link';
import {
  Layers,
  Plus,
  Trash2,
  ArrowRight,
  Download,
  XCircle,
  RefreshCw,
  CheckCircle2,
  File,
  UploadCloud,
  Music,
  Video as VideoIcon,
  Image as ImageIcon,
  Shield,
  Sparkles,
  Sliders,
  TrendingDown,
  AlertCircle,
  FolderArchive,
  Cpu,
} from 'lucide-react';
import { apiClient } from '@/services/apiClient';
import {
  detectMediaType,
  getCompatibleOutputFormats,
  getDefaultOutputFormat,
} from '@/utils/presets';

interface BatchQueueItem {
  id: string;
  file: File;
  targetFormat: string;
  status: 'PENDING' | 'UPLOADING' | 'QUEUED' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
  jobId?: string;
  errorMessage?: string;
}

export default function BatchConverterPage() {
  const [queue, setQueue] = useState<BatchQueueItem[]>([]);
  const [filterType, setFilterType] = useState<'all' | 'video' | 'audio' | 'image'>('all');
  const [globalStrategy, setGlobalStrategy] = useState<'web' | 'master' | 'audio' | 'custom'>('web');
  const [packageZip, setPackageZip] = useState(true);
  const [stripMetadata, setStripMetadata] = useState(true);

  const [isProcessing, setIsProcessing] = useState(false);
  const [overallProgress, setOverallProgress] = useState(0);
  const [batchId, setBatchId] = useState<string | null>(null);
  const [batchCompleted, setBatchCompleted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const cleanupPolling = () => {
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = null;
    }
  };

  useEffect(() => {
    return () => cleanupPolling();
  }, []);

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
  };

  const addFilesToQueue = (files: File[]) => {
    const newItems: BatchQueueItem[] = files.map((f) => ({
      id: 'batch-' + Math.random().toString(36).substring(2, 9),
      file: f,
      targetFormat: getDefaultOutputFormat(f.name),
      status: 'PENDING',
    }));
    setQueue((prev) => [...prev, ...newItems]);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      addFilesToQueue(Array.from(e.target.files));
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleRemove = (id: string) => {
    setQueue((prev) => prev.filter((item) => item.id !== id));
  };

  const handleClear = () => {
    cleanupPolling();
    setQueue([]);
    setOverallProgress(0);
    setBatchId(null);
    setBatchCompleted(false);
    setIsProcessing(false);
    setError(null);
  };

  const handleItemFormatChange = (id: string, fmt: string) => {
    setQueue((prev) =>
      prev.map((item) => (item.id === id ? { ...item, targetFormat: fmt } : item))
    );
  };

  const applyGlobalStrategy = (strategy: 'web' | 'master' | 'audio' | 'custom') => {
    setGlobalStrategy(strategy);
    setQueue((prev) =>
      prev.map((item) => {
        if (item.status !== 'PENDING') return item;
        const type = detectMediaType(item.file.name);
        if (strategy === 'audio') {
          return { ...item, targetFormat: 'mp3' };
        } else if (strategy === 'web') {
          if (type === 'video') return { ...item, targetFormat: 'mp4' };
          if (type === 'audio') return { ...item, targetFormat: 'mp3' };
          if (type === 'image') return { ...item, targetFormat: 'webp' };
        } else if (strategy === 'master') {
          if (type === 'video') return { ...item, targetFormat: 'mkv' };
          if (type === 'audio') return { ...item, targetFormat: 'flac' };
          if (type === 'image') return { ...item, targetFormat: 'png' };
        }
        return item;
      })
    );
  };

  // Queue metrics
  const totalOriginalBytes = useMemo(() => {
    return queue.reduce((acc, item) => acc + item.file.size, 0);
  }, [queue]);

  const videoCount = queue.filter((i) => detectMediaType(i.file.name) === 'video').length;
  const audioCount = queue.filter((i) => detectMediaType(i.file.name) === 'audio').length;
  const imageCount = queue.filter((i) => detectMediaType(i.file.name) === 'image').length;
  const completedCount = queue.filter((i) => i.status === 'COMPLETED').length;

  const estimatedOutputBytes = Math.round(totalOriginalBytes * 0.35); // ~65% reduction on average

  const filteredQueue = queue.filter((item) => {
    if (filterType === 'all') return true;
    return detectMediaType(item.file.name) === filterType;
  });

  const handleStartBatch = async () => {
    const pendingItems = queue.filter((item) => item.status === 'PENDING' || item.status === 'FAILED');
    if (pendingItems.length === 0) return;

    setIsProcessing(true);
    setError(null);
    setBatchCompleted(false);
    setOverallProgress(0);

    try {
      const conversionItems = [];

      for (let i = 0; i < queue.length; i++) {
        const item = queue[i];
        if (item.status === 'COMPLETED') continue;

        setQueue((prev) =>
          prev.map((q, idx) => (idx === i ? { ...q, status: 'UPLOADING', errorMessage: undefined } : q))
        );

        const uploadResp = await apiClient.uploadFile(item.file);
        const inputFormat = item.file.name.split('.').pop()?.toLowerCase();

        conversionItems.push({
          inputFileId: uploadResp.id || uploadResp.fileId,
          inputFormat,
          outputFormat: item.targetFormat,
        });

        const uploadProgress = Math.round(((i + 1) / queue.length) * 20);
        setOverallProgress(uploadProgress);
      }

      const batchResp = await apiClient.createBatchConversion({
        items: conversionItems,
      });

      setBatchId(batchResp.batchId);

      setQueue((prev) => {
        let jobIdx = 0;
        return prev.map((item) => {
          if (item.status === 'COMPLETED') return item;
          const correspondingJob = batchResp.jobs[jobIdx++];
          return {
            ...item,
            status: 'QUEUED',
            jobId: correspondingJob ? correspondingJob.id : undefined,
          };
        });
      });

      const jobIds = batchResp.jobs.map((j) => j.id);
      startBatchPolling(jobIds);
    } catch (err: any) {
      setIsProcessing(false);
      setError(err.message || 'Failed to submit batch conversion.');
    }
  };

  const startBatchPolling = (jobIds: string[]) => {
    cleanupPolling();
    pollIntervalRef.current = setInterval(async () => {
      try {
        let done = 0;
        let fail = 0;
        let totalPct = 0;

        for (let i = 0; i < jobIds.length; i++) {
          const jobId = jobIds[i];
          try {
            const prog = await apiClient.getJobProgress(jobId);
            totalPct += (prog.percentage ?? prog.progressPercentage ?? 0);

            setQueue((prev) =>
              prev.map((item) => {
                if (item.jobId !== jobId) return item;
                if (prog.completed || prog.status === 'COMPLETED') {
                  return { ...item, status: 'COMPLETED' };
                }
                if (prog.failed || prog.status === 'FAILED') {
                  return { ...item, status: 'FAILED', errorMessage: prog.errorMessage || 'Conversion failed' };
                }
                if (prog.status === 'PROCESSING') {
                  return { ...item, status: 'PROCESSING' };
                }
                return item;
              })
            );

            if (prog.completed || prog.status === 'COMPLETED') done++;
            else if (prog.failed || prog.status === 'FAILED') fail++;
          } catch {}
        }

        const avgProgress = Math.round(20 + (totalPct / (jobIds.length * 100)) * 80);
        setOverallProgress(Math.min(100, avgProgress));

        if (done + fail >= jobIds.length) {
          cleanupPolling();
          setIsProcessing(false);
          setBatchCompleted(true);
          setOverallProgress(100);
        }
      } catch {}
    }, 1200);
  };

  return (
    <div className="w-full max-w-7xl mx-auto px-gutter py-space-md flex flex-col gap-space-md">
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        onChange={handleFileChange}
        className="hidden"
      />

      {/* Header Context Bar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-space-md pb-space-xs">
        <div className="flex flex-col gap-1">
          <div className="flex flex-wrap items-center gap-space-xs text-xs font-semibold text-on-surface-variant">
            <span className="flex items-center gap-1 text-sm font-bold text-primary">
              <Layers className="w-4 h-4 text-primary" />
              <span>Batch Converter</span>
            </span>
            <span className="text-outline-variant">/</span>
            <span className="font-mono text-on-surface font-semibold">{queue.length} Files in Queue</span>
            <span className="text-outline-variant">·</span>
            <span className="px-2 py-0.5 rounded-full bg-surface-container dark:bg-slate-800 text-[11px]">
              {videoCount} Video
            </span>
            <span className="px-2 py-0.5 rounded-full bg-surface-container dark:bg-slate-800 text-[11px]">
              {audioCount} Audio
            </span>
            <span className="px-2 py-0.5 rounded-full bg-surface-container dark:bg-slate-800 text-[11px]">
              {imageCount} Image
            </span>
            <span className="text-outline-variant">·</span>
            <span className="font-mono">
              Total Original: <strong className="text-on-surface">{formatFileSize(totalOriginalBytes)}</strong>
            </span>
          </div>
          <div className="flex items-center gap-2 pt-0.5 text-xs text-on-surface-variant">
            <span className="w-2 h-2 rounded-full bg-tertiary-container animate-pulse" />
            <span>Multi-Threaded Parallel Execution Active</span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handleClear}
            disabled={queue.length === 0}
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-surface-container-low dark:bg-slate-800 text-rose-600 hover:bg-rose-50 font-semibold text-xs transition-colors disabled:opacity-40"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Clear Queue</span>
          </button>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-primary-container text-white hover:bg-primary font-semibold text-xs transition-all shadow-xs"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Files</span>
          </button>
        </div>
      </div>

      {/* Main Grid: 8-col Queue / 4-col Inspector */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-space-lg items-start">
        {/* Left Column (8 cols) */}
        <div className="lg:col-span-8 flex flex-col gap-space-md">
          {/* Multi-file Drag & Drop Dropzone */}
          <div
            onClick={() => fileInputRef.current?.click()}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              if (e.dataTransfer.files) addFilesToQueue(Array.from(e.dataTransfer.files));
            }}
            className="p-space-md rounded-3xl bg-surface-container-lowest dark:bg-slate-900 border-2 border-dashed border-outline-variant/50 hover:border-primary/50 transition-colors cursor-pointer group shadow-sm"
          >
            <div className="flex flex-col sm:flex-row items-center justify-between gap-space-md p-space-md rounded-2xl bg-surface-container-low/70 dark:bg-slate-800/40">
              <div className="flex items-center gap-space-md">
                <div className="w-12 h-12 rounded-2xl bg-primary-fixed dark:bg-slate-800 flex items-center justify-center text-primary group-hover:scale-105 transition-transform shadow-sm">
                  <UploadCloud className="w-6 h-6" />
                </div>
                <div className="flex flex-col">
                  <span className="text-sm font-bold text-on-surface">Drag & drop files or folders here</span>
                  <span className="text-xs text-on-surface-variant">
                    Supports Video, Audio, and Image formats up to 2GB per file
                  </span>
                </div>
              </div>
              <span className="px-4 py-2 rounded-full bg-surface-container-lowest dark:bg-slate-800 text-primary font-semibold text-xs shadow-xs">
                Browse Files
              </span>
            </div>
          </div>

          {/* Controls & Filter Strip */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-space-sm p-2 rounded-2xl bg-surface-container-lowest dark:bg-slate-900 border border-outline-variant/30 shadow-sm">
            <div className="flex items-center gap-1">
              <span className="text-xs font-semibold text-on-surface-variant px-2">Filter:</span>
              {(['all', 'video', 'audio', 'image'] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setFilterType(t)}
                  className={`px-3 py-1 rounded-full text-xs font-semibold capitalize transition-all ${
                    filterType === t
                      ? 'bg-primary text-white shadow-xs'
                      : 'text-on-surface-variant hover:text-on-surface'
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs text-on-surface-variant font-mono">
                {completedCount}/{queue.length} Converted
              </span>
            </div>
          </div>

          {/* Queue List Cards */}
          {queue.length === 0 ? (
            <div className="p-12 text-center rounded-3xl bg-surface-container-lowest dark:bg-slate-900 border border-outline-variant/30 space-y-3">
              <Layers className="w-12 h-12 text-outline mx-auto" />
              <h3 className="text-base font-bold text-on-surface">Batch Queue is Empty</h3>
              <p className="text-xs text-on-surface-variant max-w-sm mx-auto">
                Add multiple videos, songs, or images to transcode concurrently in background threads.
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {filteredQueue.map((item) => {
                const type = detectMediaType(item.file.name);
                const compatFormats = getCompatibleOutputFormats(item.file.name);
                return (
                  <div
                    key={item.id}
                    className="p-4 rounded-2xl bg-surface-container-lowest dark:bg-slate-900 border border-outline-variant/30 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <div className="w-10 h-10 rounded-xl bg-surface-container-high dark:bg-slate-800 flex items-center justify-center shrink-0">
                        {type === 'video' ? (
                          <VideoIcon className="w-5 h-5 text-primary" />
                        ) : type === 'audio' ? (
                          <Music className="w-5 h-5 text-secondary" />
                        ) : (
                          <ImageIcon className="w-5 h-5 text-tertiary" />
                        )}
                      </div>
                      <div className="flex flex-col min-w-0">
                        <span className="text-xs font-bold text-on-surface truncate">{item.file.name}</span>
                        <div className="flex items-center gap-2 text-[11px] font-mono text-on-surface-variant">
                          <span className="uppercase">{type}</span>
                          <span>•</span>
                          <span>{formatFileSize(item.file.size)}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0">
                      <div className="flex items-center gap-1.5">
                        <ArrowRight className="w-3.5 h-3.5 text-outline" />
                        <select
                          value={item.targetFormat}
                          onChange={(e) => handleItemFormatChange(item.id, e.target.value)}
                          disabled={item.status !== 'PENDING' && item.status !== 'FAILED'}
                          className="px-2 py-1 bg-surface-container-low dark:bg-slate-800 rounded-lg text-xs font-bold uppercase focus:outline-none"
                        >
                          {compatFormats.map((fmt) => (
                            <option key={fmt} value={fmt}>
                              {fmt.toUpperCase()}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="flex items-center gap-2 pl-2">
                        {item.status === 'PENDING' && (
                          <span className="px-2.5 py-0.5 rounded-full bg-surface-container-low text-on-surface-variant text-[11px] font-semibold">
                            Ready
                          </span>
                        )}
                        {item.status === 'UPLOADING' && (
                          <span className="px-2.5 py-0.5 rounded-full bg-primary-fixed text-primary text-[11px] font-semibold animate-pulse">
                            Uploading
                          </span>
                        )}
                        {item.status === 'QUEUED' && (
                          <span className="px-2.5 py-0.5 rounded-full bg-surface-container text-on-surface-variant text-[11px] font-semibold">
                            Queued
                          </span>
                        )}
                        {item.status === 'PROCESSING' && (
                          <span className="px-2.5 py-0.5 rounded-full bg-primary-container text-white text-[11px] font-semibold animate-pulse">
                            Converting
                          </span>
                        )}
                        {item.status === 'COMPLETED' && (
                          <span className="px-2.5 py-0.5 rounded-full bg-tertiary-fixed text-on-tertiary-fixed text-[11px] font-semibold flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3 text-tertiary" />
                            <span>Done</span>
                          </span>
                        )}
                        {item.status === 'FAILED' && (
                          <span className="px-2.5 py-0.5 rounded-full bg-rose-100 text-rose-700 text-[11px] font-semibold">
                            Failed
                          </span>
                        )}

                        <button
                          type="button"
                          onClick={() => handleRemove(item.id)}
                          disabled={isProcessing}
                          className="w-8 h-8 rounded-full flex items-center justify-center text-outline hover:text-rose-500 hover:bg-rose-50 transition-colors disabled:opacity-30"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Engine Banner */}
          <div className="p-space-md rounded-2xl bg-surface-container-lowest dark:bg-slate-900 border border-outline-variant/30 flex items-center justify-between text-xs text-on-surface-variant">
            <div className="flex items-center gap-2">
              <Cpu className="w-4 h-4 text-primary" />
              <span>FFmpeg 7.0 Multi-Threaded Engine · In-Memory Queue</span>
            </div>
            <span className="font-mono">4 Parallel Workers</span>
          </div>
        </div>

        {/* Right Column (4 cols) */}
        <div className="lg:col-span-4 flex flex-col gap-space-md lg:sticky lg:top-24">
          <div className="bg-surface-container-lowest dark:bg-slate-900 rounded-3xl p-space-md shadow-sm border border-outline-variant/30 flex flex-col gap-space-md">
            {/* Header */}
            <div className="flex items-center justify-between pb-1 border-b border-outline-variant/20">
              <div className="flex items-center gap-2">
                <Sliders className="w-4 h-4 text-primary" />
                <h2 className="text-base font-bold text-on-surface">Batch Settings</h2>
              </div>
              <span className="px-2.5 py-0.5 rounded-full bg-primary-fixed text-primary text-xs font-semibold">
                Parallel Pipeline
              </span>
            </div>

            {/* Global Pipeline Strategy */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-on-surface">Global Strategy Preset</label>
              <div className="grid grid-cols-2 gap-1 p-1 bg-surface-container-low dark:bg-slate-800 rounded-2xl text-xs">
                {[
                  { id: 'web', label: 'Web Optimized' },
                  { id: 'master', label: 'Archive / Master' },
                  { id: 'audio', label: 'Extract Audio' },
                  { id: 'custom', label: 'Custom' },
                ].map((strat) => (
                  <button
                    key={strat.id}
                    type="button"
                    onClick={() => applyGlobalStrategy(strat.id as any)}
                    className={`py-2 px-2 rounded-xl font-semibold transition-all ${
                      globalStrategy === strat.id
                        ? 'bg-surface-container-lowest dark:bg-slate-700 text-primary shadow-xs'
                        : 'text-on-surface-variant hover:text-on-surface'
                    }`}
                  >
                    {strat.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Pipeline Flags */}
            <div className="space-y-2 pt-1 border-t border-outline-variant/20 text-xs">
              <label className="flex items-center gap-2 text-on-surface cursor-pointer font-medium">
                <input
                  type="checkbox"
                  checked={packageZip}
                  onChange={(e) => setPackageZip(e.target.checked)}
                  className="rounded accent-primary"
                />
                <span>Package output into single ZIP</span>
              </label>
              <label className="flex items-center gap-2 text-on-surface cursor-pointer font-medium">
                <input
                  type="checkbox"
                  checked={stripMetadata}
                  onChange={(e) => setStripMetadata(e.target.checked)}
                  className="rounded accent-primary"
                />
                <span>Strip private EXIF & author metadata</span>
              </label>
            </div>

            {/* Size Estimation Card */}
            <div className="bg-surface-container-low dark:bg-slate-800/60 rounded-2xl p-space-md flex flex-col gap-2 border border-outline-variant/30">
              <div className="flex items-center justify-between">
                <span className="text-xs uppercase tracking-wider text-outline font-bold">Estimated Batch Payload</span>
                <span className="px-2 py-0.5 rounded-full bg-tertiary-fixed text-on-tertiary-fixed font-mono text-xs font-bold">
                  ↓ -65% Reduction
                </span>
              </div>

              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-extrabold text-on-surface font-mono">
                  ~{formatFileSize(estimatedOutputBytes)}
                </span>
                <span className="font-mono text-xs text-outline line-through">
                  {formatFileSize(totalOriginalBytes)}
                </span>
              </div>

              <p className="text-xs text-on-surface-variant leading-snug">
                Combined output calculation across {queue.length} assets.
              </p>
            </div>

            {/* Error Message */}
            {error && (
              <div className="p-3 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            {/* Primary Action Button */}
            <div className="flex flex-col gap-2 pt-1">
              {!isProcessing && !batchCompleted && (
                <button
                  type="button"
                  onClick={handleStartBatch}
                  disabled={queue.length === 0}
                  className="w-full h-12 rounded-full bg-primary-container hover:bg-primary text-white font-semibold text-sm flex items-center justify-center gap-2 shadow-md shadow-primary/25 transition-all hover:scale-[1.01] active:scale-95 disabled:opacity-50"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>Convert All ({queue.length} Files)</span>
                </button>
              )}

              {isProcessing && (
                <div className="space-y-3">
                  <div className="w-full bg-surface-container dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                    <div
                      className="bg-primary h-full rounded-full transition-all duration-300"
                      style={{ width: `${overallProgress}%` }}
                    />
                  </div>
                  <div className="flex items-center justify-between text-xs text-on-surface-variant font-mono">
                    <span>Batch in progress...</span>
                    <span>{overallProgress}%</span>
                  </div>
                </div>
              )}

              {batchCompleted && (
                <div className="space-y-2">
                  <div className="p-3 rounded-2xl bg-tertiary-fixed/40 border border-tertiary/40 flex items-center gap-2 text-tertiary text-xs font-semibold">
                    <CheckCircle2 className="w-4 h-4 text-tertiary shrink-0" />
                    <span>Batch complete! All files processed successfully.</span>
                  </div>
                  {batchId && (
                    <a
                      href={apiClient.getDownloadUrl(batchId)}
                      download
                      className="w-full h-12 rounded-full bg-tertiary-container hover:bg-tertiary text-white font-semibold text-sm flex items-center justify-center gap-2 shadow-md transition-all active:scale-95"
                    >
                      <FolderArchive className="w-4 h-4" />
                      <span>Download All as ZIP</span>
                    </a>
                  )}
                  <button
                    type="button"
                    onClick={handleClear}
                    className="w-full h-10 rounded-full bg-surface-container-low text-on-surface text-xs font-semibold hover:bg-surface-container transition-colors"
                  >
                    Convert Another Batch
                  </button>
                </div>
              )}

              <div className="flex items-center justify-center gap-1.5 text-center text-on-surface-variant text-xs pt-1">
                <Shield className="w-3.5 h-3.5 text-tertiary" />
                <span>Zero Database · Ephemeral Queue Memory</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
