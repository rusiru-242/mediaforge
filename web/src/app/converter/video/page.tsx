'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { Video, ArrowRight, Settings, Download, XCircle, RefreshCw, CheckCircle, VolumeX } from 'lucide-react';
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

export default function VideoConverterPage() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [targetFormat, setTargetFormat] = useState('mp4');
  const [resolution, setResolution] = useState('1080p');
  const [videoBitrate, setVideoBitrate] = useState('2500k');
  const [audioBitrate, setAudioBitrate] = useState('192k');
  const [stripAudio, setStripAudio] = useState(false);

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
          // Fetch full job to retrieve outputFileId
          const updatedJob = await apiClient.getJobById(jobId);
          setCurrentJob(updatedJob);
          if (updatedJob.outputFileId) {
            setOutputFileId(updatedJob.outputFileId);
          } else {
            setOutputFileId(jobId);
          }
        } else if (prog.failed || prog.status === 'FAILED') {
          cleanupPolling();
          setStage('FAILED');
          setError(prog.errorMessage || 'Video conversion failed.');
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
      setError('Please select or drop a video file to convert.');
      return;
    }

    setError(null);
    setStage('UPLOADING');
    setCurrentJob(null);
    setProgress(null);
    setOutputFileId(null);

    try {
      // Step 1: Upload file with magic byte verification
      const uploadResp = await apiClient.uploadFile(selectedFile);

      // Step 2: Submit conversion job
      setStage('PROCESSING');
      const inputFormat = selectedFile.name.split('.').pop()?.toLowerCase();
      const job = await apiClient.createConversionJob({
        inputFileId: uploadResp.id || uploadResp.fileId,
        inputFormat,
        outputFormat: targetFormat,
        targetResolution: resolution !== 'source' ? resolution : undefined,
        videoBitrate: videoBitrate !== 'auto' ? videoBitrate : undefined,
        audioBitrate: audioBitrate !== 'auto' ? parseInt(audioBitrate.replace('k', ''), 10) : undefined,
        stripAudio,
      });

      setCurrentJob(job);
      startPolling(job.id);
    } catch (err: any) {
      setStage('FAILED');
      setError(err.message || 'Failed to process video conversion.');
    }
  };

  const handleCancel = async () => {
    if (!currentJob) return;
    try {
      await apiClient.cancelJob(currentJob.id);
      cleanupPolling();
      setStage('CANCELLED');
    } catch (err: any) {
      setError(err.message || 'Failed to cancel conversion.');
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
        <div className="inline-flex items-center gap-2 rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold text-blue-700 dark:bg-blue-950/60 dark:text-blue-300">
          <Video className="h-3.5 w-3.5" />
          <span>Real-Time Video Transcoder</span>
        </div>
        <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-slate-100 sm:text-4xl">
          Convert Video Files
        </h1>
        <p className="mx-auto max-w-xl text-sm text-slate-600 dark:text-slate-400">
          Transcode MP4, MKV, WebM, AVI, and MOV files with customized codecs, resolutions, and bitrates via FFmpeg.
        </p>
      </div>

      <Card className="mt-8 p-6 sm:p-8">
        {stage === 'IDLE' && (
          <form onSubmit={handleConvert} className="space-y-6">
            {/* File Dropzone */}
            <FileDropzone
              accept="video/*,.mp4,.mkv,.webm,.avi,.mov,.flv,.m4v"
              selectedFile={selectedFile}
              onFileSelect={setSelectedFile}
              label="Upload Video"
              description="Drag and drop your MP4, MKV, WebM, or MOV file (up to 500MB)"
            />

            {/* Format & Encoding Options */}
            <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-4 dark:border-slate-800 dark:bg-slate-900/50">
              <div className="flex items-center gap-2 mb-4 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                <Settings className="h-4 w-4" />
                <span>Transcoding Parameters</span>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Select
                  label="Target Container Format"
                  value={targetFormat}
                  onChange={(e) => setTargetFormat(e.target.value)}
                  options={[
                    { label: 'MP4 (H.264 / AAC) — Universal compatibility', value: 'mp4' },
                    { label: 'WEBM (VP9 / Opus) — Optimized for web and streaming', value: 'webm' },
                    { label: 'MKV (Matroska) — High fidelity multi-track container', value: 'mkv' },
                    { label: 'AVI — Standard compatibility', value: 'avi' },
                    { label: 'MOV (QuickTime) — Apple ecosystem standard', value: 'mov' },
                  ]}
                />

                <Select
                  label="Output Resolution"
                  value={resolution}
                  onChange={(e) => setResolution(e.target.value)}
                  options={[
                    { label: 'Keep Source Resolution (No Upscaling)', value: 'source' },
                    { label: '1080p (1920x1080 Full HD)', value: '1080p' },
                    { label: '720p (1280x720 HD)', value: '720p' },
                    { label: '480p (854x480 SD)', value: '480p' },
                    { label: '360p (640x360 Compact)', value: '360p' },
                  ]}
                />

                <Select
                  label="Video Bitrate"
                  value={videoBitrate}
                  onChange={(e) => setVideoBitrate(e.target.value)}
                  options={[
                    { label: 'Auto (Recommended)', value: 'auto' },
                    { label: '5000 kbps (High Quality)', value: '5000k' },
                    { label: '2500 kbps (Standard)', value: '2500k' },
                    { label: '1000 kbps (Compressed / Low Bandwidth)', value: '1000k' },
                    { label: '500 kbps (Ultra Compact)', value: '500k' },
                  ]}
                />

                <Select
                  label="Audio Bitrate"
                  value={audioBitrate}
                  onChange={(e) => setAudioBitrate(e.target.value)}
                  disabled={stripAudio}
                  options={[
                    { label: 'Auto (Match Source)', value: 'auto' },
                    { label: '320 kbps (High Fidelity)', value: '320k' },
                    { label: '192 kbps (Standard Audio)', value: '192k' },
                    { label: '128 kbps (Voice / Efficient)', value: '128k' },
                  ]}
                />
              </div>

              {/* Strip Audio Option */}
              <div className="mt-4 flex items-center gap-2">
                <input
                  type="checkbox"
                  id="stripAudio"
                  checked={stripAudio}
                  onChange={(e) => setStripAudio(e.target.checked)}
                  className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 dark:border-slate-700 dark:bg-slate-800"
                />
                <label htmlFor="stripAudio" className="flex items-center gap-1.5 text-xs text-slate-700 dark:text-slate-300">
                  <VolumeX className="h-3.5 w-3.5 text-slate-500" />
                  <span>Mute / Remove Audio Track from Output</span>
                </label>
              </div>
            </div>

            {error && <ErrorAlert title="Conversion Error" message={error} onClose={() => setError(null)} />}

            <Button
              type="submit"
              variant="primary"
              size="lg"
              className="w-full"
              disabled={!selectedFile}
              leftIcon={<Video className="h-5 w-5" />}
            >
              Start Video Conversion
            </Button>
          </form>
        )}

        {/* Uploading Stage */}
        {stage === 'UPLOADING' && (
          <div className="py-12 text-center space-y-4">
            <RefreshCw className="h-10 w-10 text-blue-500 animate-spin mx-auto" />
            <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
              Uploading & Verifying Media...
            </h3>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Verifying file signatures, MIME types, and allocating secure scratch storage.
            </p>
          </div>
        )}

        {/* Processing Stage */}
        {stage === 'PROCESSING' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <Badge variant="info">FFmpeg Transcoding</Badge>
                  <JobStatusBadge status="PROCESSING" />
                </div>
                <h3 className="mt-2 text-base font-semibold text-slate-900 dark:text-slate-100">
                  Converting to <span className="uppercase text-blue-600 dark:text-blue-400">{targetFormat}</span>
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
                <span>
                  {progress?.speed && `Speed: ${progress.speed}`}
                  {progress?.fps ? ` | ${progress.fps} fps` : ''}
                  {progress?.timeRemainingSeconds ? ` | ETA: ${progress.timeRemainingSeconds}s` : ''}
                </span>
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
                Conversion Complete!
              </h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                Your video was successfully converted to <strong className="uppercase">{targetFormat}</strong> with FFmpeg.
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
                    Download Converted Video
                  </Button>
                </a>
              )}

              <Button variant="outline" size="lg" onClick={handleReset} leftIcon={<RefreshCw className="h-4 w-4" />}>
                Convert Another Video
              </Button>
            </div>
          </div>
        )}

        {/* Failed or Cancelled */}
        {(stage === 'FAILED' || stage === 'CANCELLED') && (
          <div className="py-6 space-y-4">
            <ErrorAlert
              title={stage === 'CANCELLED' ? 'Conversion Cancelled' : 'Conversion Failed'}
              message={error || (stage === 'CANCELLED' ? 'Job was cancelled by user request.' : 'An error occurred during transcoding.')}
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
