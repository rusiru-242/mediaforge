'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { Image as ImageIcon, ArrowRight, Settings, Download, XCircle, RefreshCw, CheckCircle, RotateCw } from 'lucide-react';
import { apiClient } from '@/services/apiClient';
import { JobResponse, ConversionProgressResponse } from '@/types/api';
import { FileDropzone } from '@/components/feedback/FileDropzone';
import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/Select';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { JobStatusBadge } from '@/components/feedback/JobStatusBadge';
import { ErrorAlert } from '@/components/feedback/ErrorAlert';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { IMAGE_PRESETS } from '@/utils/presets';

export default function ImageConverterPage() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [targetFormat, setTargetFormat] = useState('webp');
  const [selectedPreset, setSelectedPreset] = useState<string>('balanced');
  const [quality, setQuality] = useState('75');
  const [resizeMode, setResizeMode] = useState('original');
  const [customWidth, setCustomWidth] = useState('');
  const [customHeight, setCustomHeight] = useState('');
  const [rotateDegrees, setRotateDegrees] = useState('0');

  const handlePresetChange = (presetId: string) => {
    setSelectedPreset(presetId);
    const found = IMAGE_PRESETS.find((p) => p.id === presetId);
    if (found) {
      setQuality(found.quality.toString());
    }
  };

  const [stage, setStage] = useState<'IDLE' | 'UPLOADING' | 'PROCESSING' | 'COMPLETED' | 'FAILED' | 'CANCELLED'>('IDLE');
  const [error, setError] = useState<string | null>(null);
  const [currentJob, setCurrentJob] = useState<JobResponse | null>(null);
  const [progress, setProgress] = useState<ConversionProgressResponse | null>(null);
  const [outputFileId, setOutputFileId] = useState<string | null>(null);

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

  const startPolling = (jobId: string) => {
    cleanupPolling();
    pollIntervalRef.current = setInterval(async () => {
      try {
        const prog = await apiClient.getJobProgress(jobId);
        setProgress(prog);

        if (prog.completed || prog.status === 'COMPLETED') {
          cleanupPolling();
          setStage('COMPLETED');
          const updatedJob = await apiClient.getJobById(jobId);
          setCurrentJob(updatedJob);
          setOutputFileId(updatedJob.outputFileId || jobId);
        } else if (prog.failed || prog.status === 'FAILED') {
          cleanupPolling();
          setStage('FAILED');
          setError(prog.errorMessage || 'Image conversion failed.');
        } else if (prog.status === 'CANCELLED') {
          cleanupPolling();
          setStage('CANCELLED');
        }
      } catch (err: unknown) {
        // Polling transient errors
      }
    }, 1000);
  };

  const handleConvert = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) {
      setError('Please select or drop an image file to convert.');
      return;
    }

    setError(null);
    setStage('UPLOADING');
    setCurrentJob(null);
    setProgress(null);
    setOutputFileId(null);

    let resizeWidth: number | undefined;
    let resizeHeight: number | undefined;

    if (resizeMode === '1920x1080') {
      resizeWidth = 1920;
      resizeHeight = 1080;
    } else if (resizeMode === '1280x720') {
      resizeWidth = 1280;
      resizeHeight = 720;
    } else if (resizeMode === '800x600') {
      resizeWidth = 800;
      resizeHeight = 600;
    } else if (resizeMode === 'custom') {
      if (customWidth) resizeWidth = parseInt(customWidth, 10);
      if (customHeight) resizeHeight = parseInt(customHeight, 10);
    }

    try {
      // Step 1: Upload image file
      const uploadResp = await apiClient.uploadFile(selectedFile);

      // Step 2: Create image conversion job
      setStage('PROCESSING');
      const inputFormat = selectedFile.name.split('.').pop()?.toLowerCase();
      const job = await apiClient.createConversionJob({
        inputFileId: uploadResp.id || uploadResp.fileId,
        inputFormat,
        outputFormat: targetFormat,
        qualityPreset: selectedPreset !== 'custom' ? selectedPreset : undefined,
        quality: parseInt(quality, 10),
        resizeWidth,
        resizeHeight,
        rotateDegrees: parseInt(rotateDegrees, 10) || undefined,
      });

      setCurrentJob(job);
      startPolling(job.id);
    } catch (err: any) {
      setStage('FAILED');
      setError(err.message || 'Failed to process image conversion.');
    }
  };

  const handleCancel = async () => {
    if (!currentJob) return;
    try {
      await apiClient.cancelJob(currentJob.id);
      cleanupPolling();
      setStage('CANCELLED');
    } catch (err: any) {
      setError(err.message || 'Failed to cancel image conversion.');
    }
  };

  const handleReset = () => {
    cleanupPolling();
    setSelectedFile(null);
    setStage('IDLE');
    setError(null);
    setCurrentJob(null);
    setProgress(null);
    setOutputFileId(null);
  };

  return (
    <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="text-center space-y-3">
        <div className="inline-flex items-center gap-2 rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-700 dark:bg-amber-950/60 dark:text-amber-300">
          <ImageIcon className="h-3.5 w-3.5" />
          <span>Universal Image Converter & Optimizer</span>
        </div>
        <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-slate-100 sm:text-4xl">
          Convert & Optimize Images
        </h1>
        <p className="mx-auto max-w-xl text-sm text-slate-600 dark:text-slate-400">
          Transform PNG, JPEG, WEBP, and AVIF images with lossless compression, resizing, and rotation.
        </p>
      </div>

      <Card className="mt-8 p-6 sm:p-8">
        {stage === 'IDLE' && (
          <form onSubmit={handleConvert} className="space-y-6">
            {/* File Dropzone */}
            <FileDropzone
              accept="image/*,.png,.jpg,.jpeg,.webp,.gif,.bmp,.tiff,.avif"
              selectedFile={selectedFile}
              onFileSelect={setSelectedFile}
              label="Upload Image"
              description="Drag and drop PNG, JPEG, WEBP, or AVIF file (up to 50MB)"
              maxSizeBytes={50 * 1024 * 1024}
            />

            {/* Format & Image Options */}
            <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-4 dark:border-slate-800 dark:bg-slate-900/50">
              <div className="flex items-center gap-2 mb-4 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                <Settings className="h-4 w-4" />
                <span>Image Optimization Parameters</span>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <Select
                  label="Quality Preset"
                  value={selectedPreset}
                  onChange={(e) => handlePresetChange(e.target.value)}
                  options={[
                    ...IMAGE_PRESETS.map((p) => ({
                      label: `${p.label}`,
                      value: p.id,
                    })),
                    { label: 'Custom', value: 'custom' },
                  ]}
                />

                <Select
                  label="Target Format"
                  value={targetFormat}
                  onChange={(e) => setTargetFormat(e.target.value)}
                  options={[
                    { label: 'WEBP (Next-Gen Compressed)', value: 'webp' },
                    { label: 'PNG (Lossless with Alpha)', value: 'png' },
                    { label: 'JPEG (Universal Photo)', value: 'jpeg' },
                    { label: 'AVIF (Ultra-High Efficiency)', value: 'avif' },
                  ]}
                />

                <Select
                  label="Compression Quality"
                  value={quality}
                  onChange={(e) => setQuality(e.target.value)}
                  options={[
                    { label: '95% (Near Lossless / Maximum Fidelity)', value: '95' },
                    { label: '85% (Optimal Web Balance)', value: '85' },
                    { label: '70% (Compact)', value: '70' },
                    { label: '50% (High Compression)', value: '50' },
                  ]}
                />

                <Select
                  label="Resize Dimensions"
                  value={resizeMode}
                  onChange={(e) => setResizeMode(e.target.value)}
                  options={[
                    { label: 'Keep Original Dimensions', value: 'original' },
                    { label: '1920x1080 (Full HD)', value: '1920x1080' },
                    { label: '1280x720 (HD Ready)', value: '1280x720' },
                    { label: '800x600 (Web Standard)', value: '800x600' },
                    { label: 'Custom Dimensions...', value: 'custom' },
                  ]}
                />
              </div>

              {resizeMode === 'custom' && (
                <div className="mt-4 grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                      Target Width (px)
                    </label>
                    <input
                      type="number"
                      placeholder="e.g. 1200"
                      value={customWidth}
                      onChange={(e) => setCustomWidth(e.target.value)}
                      className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                      Target Height (px)
                    </label>
                    <input
                      type="number"
                      placeholder="e.g. 800"
                      value={customHeight}
                      onChange={(e) => setCustomHeight(e.target.value)}
                      className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800"
                    />
                  </div>
                </div>
              )}

              <div className="mt-4 flex items-center gap-3">
                <RotateCw className="h-4 w-4 text-slate-500" />
                <span className="text-xs font-medium text-slate-700 dark:text-slate-300">Rotate:</span>
                {['0', '90', '180', '270'].map((deg) => (
                  <button
                    key={deg}
                    type="button"
                    onClick={() => setRotateDegrees(deg)}
                    className={`rounded px-2.5 py-1 text-xs font-medium transition ${
                      rotateDegrees === deg
                        ? 'bg-amber-500 text-white'
                        : 'bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                    }`}
                  >
                    {deg}°
                  </button>
                ))}
              </div>
            </div>

            {error && <ErrorAlert title="Conversion Error" message={error} onClose={() => setError(null)} />}

            <Button
              type="submit"
              variant="primary"
              size="lg"
              className="w-full"
              disabled={!selectedFile}
              leftIcon={<ImageIcon className="h-5 w-5" />}
            >
              Start Image Conversion
            </Button>
          </form>
        )}

        {/* Uploading Stage */}
        {stage === 'UPLOADING' && (
          <div className="py-12 text-center space-y-4">
            <RefreshCw className="h-10 w-10 text-amber-500 animate-spin mx-auto" />
            <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
              Uploading & Inspecting Image...
            </h3>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Validating pixel bounds, aspect ratios, and verifying headers with FFprobe.
            </p>
          </div>
        )}

        {/* Processing Stage */}
        {stage === 'PROCESSING' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <Badge variant="info">Image Processing Engine</Badge>
                  <JobStatusBadge status="PROCESSING" />
                </div>
                <h3 className="mt-2 text-base font-semibold text-slate-900 dark:text-slate-100">
                  Converting to <span className="uppercase text-amber-600 dark:text-amber-400">{targetFormat}</span>
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-mono">
                  Job ID: {currentJob?.id}
                </p>
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={handleCancel}
                leftIcon={<XCircle className="h-4 w-4 text-red-500" />}
              >
                Cancel Job
              </Button>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between text-xs text-slate-600 dark:text-slate-400">
                <span>Progress: {progress?.percentage ?? currentJob?.progress ?? 0}%</span>
              </div>
              <ProgressBar value={progress?.percentage ?? currentJob?.progress ?? 0} />
            </div>

            <div className="flex justify-end">
              <Link href={`/jobs/${currentJob?.id}`}>
                <Button variant="ghost" size="sm" rightIcon={<ArrowRight className="h-3.5 w-3.5" />}>
                  Inspect Job Logs
                </Button>
              </Link>
            </div>
          </div>
        )}

        {/* Completed Stage */}
        {stage === 'COMPLETED' && (
          <div className="py-8 text-center space-y-6">
            <div className="h-16 w-16 bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 rounded-full flex items-center justify-center mx-auto">
              <CheckCircle className="h-8 w-8" />
            </div>

            <div>
              <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100">
                Image Conversion Complete!
              </h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                Your image was successfully converted to <strong className="uppercase">{targetFormat}</strong> ({quality}% quality).
              </p>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              {outputFileId && (
                <a
                  href={apiClient.getFileDownloadUrl(outputFileId)}
                  download
                  className="w-full sm:w-auto"
                >
                  <Button variant="primary" size="lg" leftIcon={<Download className="h-5 w-5" />}>
                    Download Converted Image
                  </Button>
                </a>
              )}

              <Button variant="outline" size="lg" onClick={handleReset} leftIcon={<RefreshCw className="h-4 w-4" />}>
                Convert Another Image
              </Button>
            </div>
          </div>
        )}

        {/* Failed or Cancelled */}
        {(stage === 'FAILED' || stage === 'CANCELLED') && (
          <div className="py-6 space-y-4">
            <ErrorAlert
              title={stage === 'CANCELLED' ? 'Conversion Cancelled' : 'Conversion Failed'}
              message={error || (stage === 'CANCELLED' ? 'Job was cancelled by user request.' : 'An error occurred during image conversion.')}
            />
            <div className="flex justify-center">
              <Button variant="primary" onClick={handleReset} leftIcon={<RefreshCw className="h-4 w-4" />}>
                Try Again
              </Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
