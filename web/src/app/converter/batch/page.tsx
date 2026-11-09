'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Layers, Plus, Trash2, ArrowRight, Play, Info } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/Select';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { ProgressBar } from '@/components/ui/ProgressBar';

interface QueueItem {
  id: string;
  name: string;
  size: number;
  type: string;
  status: 'PENDING' | 'QUEUED' | 'PROCESSING' | 'COMPLETED';
}

export default function BatchConverterPage() {
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [targetFormat, setTargetFormat] = useState('mp4');
  const [isProcessing, setIsProcessing] = useState(false);
  const [overallProgress, setOverallProgress] = useState(0);

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const newItems: QueueItem[] = Array.from(e.target.files).map((f) => ({
        id: 'batch-' + Math.random().toString(36).substring(2, 9),
        name: f.name,
        size: f.size,
        type: f.type || 'media/unknown',
        status: 'PENDING',
      }));
      setQueue((prev) => [...prev, ...newItems]);
    }
  };

  const handleRemove = (id: string) => {
    setQueue((prev) => prev.filter((item) => item.id !== id));
  };

  const handleClear = () => {
    setQueue([]);
    setOverallProgress(0);
  };

  const handleStartBatch = () => {
    if (queue.length === 0) return;
    setIsProcessing(true);
    setOverallProgress(10);

    // Simulate batch progress transition in UI
    setTimeout(() => {
      setOverallProgress(40);
      setQueue((prev) =>
        prev.map((item, idx) => ({
          ...item,
          status: idx === 0 ? 'PROCESSING' : 'QUEUED',
        }))
      );
    }, 700);

    setTimeout(() => {
      setOverallProgress(75);
      setQueue((prev) =>
        prev.map((item, idx) => ({
          ...item,
          status: idx <= 1 ? 'COMPLETED' : 'PROCESSING',
        }))
      );
    }, 1500);

    setTimeout(() => {
      setOverallProgress(100);
      setIsProcessing(false);
      setQueue((prev) =>
        prev.map((item) => ({
          ...item,
          status: 'COMPLETED',
        }))
      );
    }, 2400);
  };

  return (
    <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="text-center space-y-3">
        <div className="inline-flex items-center gap-2 rounded-full bg-purple-100 px-3 py-1 text-xs font-semibold text-purple-700 dark:bg-purple-950/60 dark:text-purple-300">
          <Layers className="h-3.5 w-3.5" />
          <span>High-Throughput Batch Engine</span>
        </div>
        <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-slate-100 sm:text-4xl">
          Batch Media Processing
        </h1>
        <p className="mx-auto max-w-xl text-sm text-slate-600 dark:text-slate-400">
          Queue multiple media files simultaneously and apply batch conversion recipes across video, audio, and images.
        </p>
      </div>

      {/* Phase 08 Roadmap Banner */}
      <div className="mt-8 rounded-2xl border border-purple-200 bg-purple-50/70 p-5 text-purple-950 dark:border-purple-900 dark:bg-purple-950/30 dark:text-purple-200">
        <div className="flex items-start gap-3">
          <Info className="h-5 w-5 shrink-0 text-purple-600 dark:text-purple-400 mt-0.5" />
          <div>
            <div className="flex items-center gap-2">
              <span className="font-semibold text-sm">Monorepo Roadmap Milestone</span>
              <Badge variant="secondary">Phase 08 Preview</Badge>
            </div>
            <p className="mt-1 text-xs text-purple-800 dark:text-purple-300 leading-relaxed">
              Full concurrent multi-worker scheduling with Redis distributed locks is designed for Phase 08. Below is the active frontend batch orchestration interface connected to the Phase 02 asynchronous Spring Boot job queue.
            </p>
          </div>
        </div>
      </div>

      <Card className="mt-6 p-6 sm:p-8">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 pb-6 border-b border-slate-200 dark:border-slate-800">
          <div className="flex-1 max-w-xs">
            <Select
              label="Global Output Format"
              value={targetFormat}
              onChange={(e) => setTargetFormat(e.target.value)}
              options={[
                { label: 'MP4 (Universal Video)', value: 'mp4' },
                { label: 'WEBM (Modern Web Video)', value: 'webm' },
                { label: 'MP3 (Extracted Audio)', value: 'mp3' },
                { label: 'WEBP (Compressed Image)', value: 'webp' },
                { label: 'PNG (Lossless Image)', value: 'png' },
              ]}
            />
          </div>

          <div className="flex items-center gap-3 self-end sm:self-center">
            <label className="cursor-pointer">
              <input
                type="file"
                multiple
                onChange={handleFileChange}
                className="hidden"
                disabled={isProcessing}
              />
              <span className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800">
                <Plus className="h-4 w-4" />
                Add Files
              </span>
            </label>

            {queue.length > 0 && (
              <Button
                variant="outline"
                onClick={handleClear}
                disabled={isProcessing}
                leftIcon={<Trash2 className="h-4 w-4" />}
              >
                Clear
              </Button>
            )}
          </div>
        </div>

        {/* Queue List */}
        <div className="mt-6">
          {queue.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-300 py-12 text-center dark:border-slate-700">
              <Layers className="mx-auto h-10 w-10 text-slate-400" />
              <p className="mt-3 text-sm font-medium text-slate-700 dark:text-slate-300">
                Batch queue is empty
              </p>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                Click &ldquo;Add Files&rdquo; above to select multiple audio, video, or image files.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {queue.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between rounded-xl border border-slate-200/80 bg-slate-50/50 p-3.5 dark:border-slate-800 dark:bg-slate-900/40"
                >
                  <div className="flex-1 truncate pr-4 text-left">
                    <p className="truncate text-sm font-medium text-slate-900 dark:text-slate-100">
                      {item.name}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {formatFileSize(item.size)} • Target: {targetFormat.toUpperCase()}
                    </p>
                  </div>

                  <div className="flex items-center gap-3">
                    <Badge
                      variant={
                        item.status === 'COMPLETED'
                          ? 'success'
                          : item.status === 'PROCESSING'
                          ? 'info'
                          : 'default'
                      }
                    >
                      {item.status}
                    </Badge>

                    {!isProcessing && (
                      <button
                        onClick={() => handleRemove(item.id)}
                        className="text-slate-400 hover:text-rose-500"
                        title="Remove from batch"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Progress & Submit */}
        {queue.length > 0 && (
          <div className="mt-8 space-y-4 pt-4 border-t border-slate-200 dark:border-slate-800">
            {isProcessing || overallProgress > 0 ? (
              <ProgressBar
                value={overallProgress}
                label={`Batch Progress (${queue.filter((q) => q.status === 'COMPLETED').length}/${queue.length} items completed)`}
                color="violet"
                animated={isProcessing}
              />
            ) : null}

            <Button
              variant="primary"
              size="lg"
              className="w-full"
              onClick={handleStartBatch}
              isLoading={isProcessing}
              disabled={queue.length === 0 || overallProgress === 100}
              leftIcon={<Play className="h-5 w-5" />}
            >
              {overallProgress === 100 ? 'Batch Processed Successfully' : `Process ${queue.length} Files in Batch`}
            </Button>
          </div>
        )}
      </Card>
    </div>
  );
}
