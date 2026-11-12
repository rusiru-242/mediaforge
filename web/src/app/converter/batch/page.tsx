'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { Layers, Plus, Trash2, ArrowRight, Download, XCircle, RefreshCw, CheckCircle, File, UploadCloud, Music, Image as ImageIcon } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/Select';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { ErrorAlert } from '@/components/feedback/ErrorAlert';
import { apiClient } from '@/services/apiClient';
import { JobResponse } from '@/types/api';
import {
  detectMediaType,
  getCompatibleOutputFormats,
  getDefaultOutputFormat,
  VIDEO_PRESETS,
  AUDIO_PRESETS,
  IMAGE_PRESETS,
} from '@/utils/presets';

interface BatchQueueItem {
  id: string;
  file: File;
  targetFormat: string;
  qualityPreset?: string;
  status: 'PENDING' | 'UPLOADING' | 'QUEUED' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
  jobId?: string;
  errorMessage?: string;
}

export default function BatchConverterPage() {
  const [queue, setQueue] = useState<BatchQueueItem[]>([]);
  const [globalTargetFormat, setGlobalTargetFormat] = useState('auto');
  const [isProcessing, setIsProcessing] = useState(false);
  const [overallProgress, setOverallProgress] = useState(0);
  const [batchId, setBatchId] = useState<string | null>(null);
  const [batchCompleted, setBatchCompleted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);

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
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
  };

  const addFilesToQueue = (files: File[]) => {
    const newItems: BatchQueueItem[] = files.map((f) => ({
      id: 'batch-' + Math.random().toString(36).substring(2, 9),
      file: f,
      targetFormat: globalTargetFormat !== 'auto' ? globalTargetFormat : getDefaultOutputFormat(f.name),
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

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      addFilesToQueue(Array.from(e.dataTransfer.files));
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

  const handleApplyPresetToAll = (fmt: string) => {
    setGlobalTargetFormat(fmt);
    setQueue((prev) =>
      prev.map((item) => {
        if (item.status !== 'PENDING') return item;
        const compatible = getCompatibleOutputFormats(item.file.name);
        return compatible.includes(fmt) ? { ...item, targetFormat: fmt } : item;
      })
    );
  };

  const handleExtractAllAudio = () => {
    setQueue((prev) =>
      prev.map((item) => {
        if (item.status !== 'PENDING') return item;
        const type = detectMediaType(item.file.name);
        if (type === 'video' || type === 'audio') {
          return { ...item, targetFormat: 'mp3' };
        }
        return item;
      })
    );
  };

  const handleConvertAllImagesWebp = () => {
    setQueue((prev) =>
      prev.map((item) => {
        if (item.status !== 'PENDING') return item;
        const type = detectMediaType(item.file.name);
        if (type === 'image') {
          return { ...item, targetFormat: 'webp' };
        }
        return item;
      })
    );
  };

  const handleStartBatch = async () => {
    const pendingItems = queue.filter((item) => item.status === 'PENDING' || item.status === 'FAILED');
    if (pendingItems.length === 0) return;

    setIsProcessing(true);
    setError(null);
    setBatchCompleted(false);
    setOverallProgress(0);

    try {
      // Step 1: Upload pending files
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

      // Step 2: Submit batch conversion request
      const batchResp = await apiClient.createBatchConversion({
        items: conversionItems,
      });

      setBatchId(batchResp.batchId);

      // Map created jobs back to queue
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

      // Step 3: Start polling batch jobs progress
      const jobIds = batchResp.jobs.map((j) => j.id);
      startBatchPolling(jobIds, batchResp.batchId);
    } catch (err: any) {
      setIsProcessing(false);
      setError(err.message || 'Failed to submit batch conversion.');
    }
  };

  const startBatchPolling = (jobIds: string[], bId: string) => {
    cleanupPolling();
    pollIntervalRef.current = setInterval(async () => {
      try {
        let completedCount = 0;
        let failedCount = 0;
        let totalPct = 0;

        setQueue((prevQueue) => {
          const updated = [...prevQueue];
          return updated;
        });

        for (let i = 0; i < jobIds.length; i++) {
          const jobId = jobIds[i];
          try {
            const prog = await apiClient.getJobProgress(jobId);
            totalPct += prog.percentage || 0;

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

            if (prog.completed || prog.status === 'COMPLETED') completedCount++;
            else if (prog.failed || prog.status === 'FAILED') failedCount++;
          } catch {
            // Keep polling
          }
        }

        const avgProgress = Math.round(20 + (totalPct / (jobIds.length * 100)) * 80);
        setOverallProgress(Math.min(100, avgProgress));

        if (completedCount + failedCount >= jobIds.length) {
          cleanupPolling();
          setIsProcessing(false);
          setBatchCompleted(true);
          setOverallProgress(100);
        }
      } catch (err: unknown) {
        // Polling transient errors
      }
    }, 1500);
  };

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="text-center space-y-3">
        <div className="inline-flex items-center gap-2 rounded-full bg-purple-100 px-3 py-1 text-xs font-semibold text-purple-700 dark:bg-purple-950/60 dark:text-purple-300">
          <Layers className="h-3.5 w-3.5" />
          <span>High-Throughput Batch Engine</span>
        </div>
        <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-slate-100 sm:text-4xl">
          Batch Media Conversion
        </h1>
        <p className="mx-auto max-w-2xl text-sm text-slate-600 dark:text-slate-400">
          Queue multiple video, audio, or image files for parallel background conversion with intelligent format selection and packaged ZIP download.
        </p>
      </div>

      <Card className="mt-8 p-6 sm:p-8 space-y-6">
        {/* Quick Actions & Global Controls */}
        <div className="flex flex-col gap-4 rounded-xl border border-slate-200 bg-slate-50/50 p-4 dark:border-slate-800 dark:bg-slate-900/50">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Quick Apply:
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={handleExtractAllAudio}
                disabled={isProcessing || queue.length === 0}
                leftIcon={<Music className="h-3.5 w-3.5" />}
              >
                All Videos &rarr; MP3
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleConvertAllImagesWebp}
                disabled={isProcessing || queue.length === 0}
                leftIcon={<ImageIcon className="h-3.5 w-3.5" />}
              >
                All Images &rarr; WebP
              </Button>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="file"
                multiple
                ref={fileInputRef}
                onChange={handleFileChange}
                disabled={isProcessing}
                className="hidden"
              />
              <Button
                variant="outline"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                disabled={isProcessing}
                leftIcon={<Plus className="h-4 w-4" />}
              >
                Add Files
              </Button>
              {queue.length > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleClear}
                  disabled={isProcessing}
                  leftIcon={<Trash2 className="h-4 w-4 text-red-500" />}
                >
                  Clear Queue
                </Button>
              )}
            </div>
          </div>
        </div>

        {error && <ErrorAlert title="Batch Error" message={error} onClose={() => setError(null)} />}

        {/* Progress Display */}
        {(isProcessing || batchCompleted) && (
          <div className="rounded-xl border border-purple-200 bg-purple-50/50 p-4 dark:border-purple-900 dark:bg-purple-950/20 space-y-3">
            <div className="flex items-center justify-between text-xs font-semibold text-purple-900 dark:text-purple-200">
              <span>Overall Batch Progress: {overallProgress}%</span>
              <span>
                {queue.filter((q) => q.status === 'COMPLETED').length} of {queue.length} Finished
              </span>
            </div>
            <ProgressBar value={overallProgress} />

            {batchCompleted && batchId && (
              <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-3">
                <div className="flex items-center gap-2 text-xs font-medium text-emerald-600 dark:text-emerald-400">
                  <CheckCircle className="h-4 w-4" />
                  <span>All conversions finished! Ready to download archive.</span>
                </div>
                <a href={apiClient.getBatchZipUrl(batchId)} download>
                  <Button variant="primary" size="sm" leftIcon={<Download className="h-4 w-4" />}>
                    Download Batch as ZIP
                  </Button>
                </a>
              </div>
            )}
          </div>
        )}

        {/* Queue Dropzone & Table */}
        {queue.length === 0 ? (
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`cursor-pointer border-2 border-dashed rounded-xl p-10 text-center transition ${
              isDragOver
                ? 'border-purple-500 bg-purple-50/50 dark:bg-purple-950/20'
                : 'border-slate-300 hover:border-purple-400 dark:border-slate-700 dark:hover:border-purple-500'
            }`}
          >
            <UploadCloud className="h-10 w-10 text-slate-400 mx-auto mb-2" />
            <h4 className="text-sm font-semibold text-slate-800 dark:text-slate-200">
              No files in the batch queue
            </h4>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Drag &amp; drop multiple media files here, or click to browse.
            </p>
          </div>
        ) : (
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className="space-y-3"
          >
            <div className="overflow-hidden rounded-lg border border-slate-200 dark:border-slate-800">
              <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-800 text-xs">
                <thead className="bg-slate-50 dark:bg-slate-900/60 font-semibold text-slate-600 dark:text-slate-300">
                  <tr>
                    <th className="px-4 py-3 text-left">File Name</th>
                    <th className="px-4 py-3 text-left">Size</th>
                    <th className="px-4 py-3 text-left">Target Format</th>
                    <th className="px-4 py-3 text-left">Status</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800 bg-white dark:bg-slate-900">
                  {queue.map((item) => {
                    const compatibleFormats = getCompatibleOutputFormats(item.file.name);
                    return (
                      <tr key={item.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                        <td className="px-4 py-3 font-medium text-slate-900 dark:text-slate-100 flex items-center gap-2">
                          <File className="h-3.5 w-3.5 text-slate-400 flex-shrink-0" />
                          <span className="truncate max-w-xs">{item.file.name}</span>
                        </td>
                        <td className="px-4 py-3 text-slate-500 dark:text-slate-400 whitespace-nowrap">
                          {formatFileSize(item.file.size)}
                        </td>
                        <td className="px-4 py-3">
                          <select
                            value={item.targetFormat}
                            onChange={(e) => handleItemFormatChange(item.id, e.target.value)}
                            disabled={isProcessing || item.status === 'COMPLETED'}
                            className="rounded-md border border-slate-300 bg-white px-2 py-1 text-xs font-mono uppercase text-slate-700 shadow-sm focus:border-purple-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                          >
                            {compatibleFormats.map((fmt) => (
                              <option key={fmt} value={fmt}>
                                {fmt.toUpperCase()}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="px-4 py-3">
                          <Badge
                            variant={
                              item.status === 'COMPLETED'
                                ? 'success'
                                : item.status === 'PROCESSING' || item.status === 'UPLOADING'
                                ? 'info'
                                : item.status === 'FAILED'
                                ? 'danger'
                                : 'neutral'
                            }
                          >
                            {item.status}
                          </Badge>
                          {item.errorMessage && (
                            <p className="text-[10px] text-red-500 mt-1 max-w-[180px] truncate" title={item.errorMessage}>
                              {item.errorMessage}
                            </p>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right whitespace-nowrap">
                          {!isProcessing && (
                            <button
                              type="button"
                              onClick={() => handleRemove(item.id)}
                              className="text-red-500 hover:text-red-700 p-1"
                              title="Remove from queue"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          )}
                          {item.jobId && (
                            <Link href={`/jobs/${item.jobId}`} className="ml-2 text-blue-500 hover:underline">
                              Logs
                            </Link>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <p className="text-[11px] text-slate-400 text-center">
              Tip: Drag and drop more files directly into the list above.
            </p>
          </div>
        )}

        {/* Start Batch Button */}
        {queue.length > 0 && !batchCompleted && (
          <Button
            variant="primary"
            size="lg"
            className="w-full"
            onClick={handleStartBatch}
            disabled={isProcessing}
            isLoading={isProcessing}
            leftIcon={<Layers className="h-5 w-5" />}
          >
            {isProcessing ? 'Processing Batch...' : `Convert All ${queue.length} Files`}
          </Button>
        )}
      </Card>
    </div>
  );
}
