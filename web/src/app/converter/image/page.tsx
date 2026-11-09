'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Image as ImageIcon, ArrowRight, Settings, Info } from 'lucide-react';
import { apiClient } from '@/services/apiClient';
import { JobResponse } from '@/types/api';
import { FileDropzone } from '@/components/feedback/FileDropzone';
import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/Select';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { JobStatusBadge } from '@/components/feedback/JobStatusBadge';
import { ErrorAlert } from '@/components/feedback/ErrorAlert';

export default function ImageConverterPage() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [targetFormat, setTargetFormat] = useState('webp');
  const [quality, setQuality] = useState('85');
  const [resizeMode, setResizeMode] = useState('original');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [createdJob, setCreatedJob] = useState<JobResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleConvert = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) {
      setError('Please select or drop an image file to convert.');
      return;
    }

    setIsSubmitting(true);
    setError(null);
    setCreatedJob(null);

    try {
      const job = await apiClient.createConversionJob({
        sourceFileId: 'temp-' + Math.random().toString(36).substring(2, 10),
        sourceFileName: selectedFile.name,
        targetFormat,
        mediaType: 'IMAGE',
        options: {
          quality,
          resizeMode,
        },
      });
      setCreatedJob(job);
    } catch (err: any) {
      setError(err.message || 'Failed to submit image conversion job.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="text-center space-y-3">
        <div className="inline-flex items-center gap-2 rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-700 dark:bg-amber-950/60 dark:text-amber-300">
          <ImageIcon className="h-3.5 w-3.5" />
          <span>Universal Image Converter</span>
        </div>
        <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-slate-100 sm:text-4xl">
          Convert Image Files
        </h1>
        <p className="mx-auto max-w-xl text-sm text-slate-600 dark:text-slate-400">
          Transform PNG, JPEG, WEBP, GIF, and BMP images with quality preservation and compression optimization.
        </p>
      </div>

      <Card className="mt-8 p-6 sm:p-8">
        <form onSubmit={handleConvert} className="space-y-6">
          {/* File Dropzone */}
          <FileDropzone
            accept="image/*,.png,.jpg,.jpeg,.webp,.gif,.bmp,.tiff"
            selectedFile={selectedFile}
            onFileSelect={setSelectedFile}
            label="Upload Image"
            description="Drag and drop PNG, JPEG, WEBP, or GIF file (up to 50MB)"
            maxSizeBytes={50 * 1024 * 1024}
          />

          {/* Format & Image Options */}
          <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-4 dark:border-slate-800 dark:bg-slate-900/50">
            <div className="flex items-center gap-2 mb-4 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              <Settings className="h-4 w-4" />
              <span>Image Optimization Parameters</span>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <Select
                label="Target Format"
                value={targetFormat}
                onChange={(e) => setTargetFormat(e.target.value)}
                options={[
                  { label: 'WEBP (Next-Gen Compressed)', value: 'webp' },
                  { label: 'PNG (Lossless with Alpha)', value: 'png' },
                  { label: 'JPEG (Universal Photo)', value: 'jpeg' },
                  { label: 'GIF (Animated / Graphic)', value: 'gif' },
                  { label: 'BMP (Bitmap)', value: 'bmp' },
                ]}
              />

              <Select
                label="Compression Quality"
                value={quality}
                onChange={(e) => setQuality(e.target.value)}
                options={[
                  { label: '100% (Lossless / Maximum)', value: '100' },
                  { label: '90% (Very High Quality)', value: '90' },
                  { label: '85% (Balanced Recommended)', value: '85' },
                  { label: '70% (Web Optimized)', value: '70' },
                  { label: '50% (High Compression)', value: '50' },
                ]}
              />

              <Select
                label="Dimensions / Resize"
                value={resizeMode}
                onChange={(e) => setResizeMode(e.target.value)}
                options={[
                  { label: 'Original Dimensions', value: 'original' },
                  { label: 'Scale Down 50%', value: 'half' },
                  { label: 'Max 1920x1080 (Full HD)', value: '1080p' },
                  { label: 'Max 800x800 (Thumbnail)', value: 'thumbnail' },
                ]}
              />
            </div>
          </div>

          {error && <ErrorAlert title="Conversion Error" message={error} onClose={() => setError(null)} />}

          <Button
            type="submit"
            variant="primary"
            size="lg"
            className="w-full"
            isLoading={isSubmitting}
            disabled={!selectedFile}
            leftIcon={<ImageIcon className="h-5 w-5" />}
          >
            Start Image Conversion
          </Button>
        </form>

        {createdJob && (
          <div className="mt-8 rounded-2xl border border-amber-200 bg-amber-50/50 p-6 dark:border-amber-900 dark:bg-amber-950/20">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <Badge variant="success">Job Created (HTTP 202)</Badge>
                  <JobStatusBadge status={createdJob.status} />
                </div>
                <h3 className="mt-2 text-base font-semibold text-slate-900 dark:text-slate-100">
                  Job ID: <span className="font-mono text-amber-600 dark:text-amber-400">{createdJob.id}</span>
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Target: {(createdJob.targetFormat || createdJob.outputFormat || targetFormat).toUpperCase()} ({quality}% quality)
                </p>
              </div>

              <Link href={`/jobs/${createdJob.id}`}>
                <Button variant="primary" rightIcon={<ArrowRight className="h-4 w-4" />}>
                  Track Conversion Progress
                </Button>
              </Link>
            </div>

            <div className="mt-4 flex items-start gap-2 rounded-lg bg-white/80 p-3 text-xs text-slate-600 dark:bg-slate-900/80 dark:text-slate-300">
              <Info className="h-4 w-4 shrink-0 text-amber-500 mt-0.5" />
              <span>
                <strong>Pipeline Notice:</strong> Image conversion job registered in Spring Boot database. Image processing engine is scheduled for <strong>Phase 05</strong>.
              </span>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
