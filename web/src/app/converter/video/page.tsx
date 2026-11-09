'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Video, ArrowRight, Settings, Info } from 'lucide-react';
import { apiClient } from '@/services/apiClient';
import { JobResponse } from '@/types/api';
import { FileDropzone } from '@/components/feedback/FileDropzone';
import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/Select';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { JobStatusBadge } from '@/components/feedback/JobStatusBadge';
import { ErrorAlert } from '@/components/feedback/ErrorAlert';

export default function VideoConverterPage() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [targetFormat, setTargetFormat] = useState('mp4');
  const [resolution, setResolution] = useState('1080p');
  const [videoBitrate, setVideoBitrate] = useState('2500k');
  const [audioBitrate, setAudioBitrate] = useState('192k');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [createdJob, setCreatedJob] = useState<JobResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleConvert = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) {
      setError('Please select or drop a video file to convert.');
      return;
    }

    setIsSubmitting(true);
    setError(null);
    setCreatedJob(null);

    try {
      // In Phase 02/03 backend, file upload creates an input record or conversion job
      const job = await apiClient.createConversionJob({
        sourceFileId: 'temp-' + Math.random().toString(36).substring(2, 10),
        sourceFileName: selectedFile.name,
        targetFormat,
        mediaType: 'VIDEO',
        options: {
          resolution,
          videoBitrate,
          audioBitrate,
        },
      });
      setCreatedJob(job);
    } catch (err: any) {
      setError(err.message || 'Failed to submit video conversion job.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="text-center space-y-3">
        <div className="inline-flex items-center gap-2 rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold text-blue-700 dark:bg-blue-950/60 dark:text-blue-300">
          <Video className="h-3.5 w-3.5" />
          <span>Universal Video Transcoder</span>
        </div>
        <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-slate-100 sm:text-4xl">
          Convert Video Files
        </h1>
        <p className="mx-auto max-w-xl text-sm text-slate-600 dark:text-slate-400">
          Transcode MP4, MKV, WebM, AVI, and MOV files with customized codecs, resolutions, and bitrates.
        </p>
      </div>

      <Card className="mt-8 p-6 sm:p-8">
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
                  { label: 'WEBM (VP9 / Opus) — Optimized for web and browsers', value: 'webm' },
                  { label: 'MKV (Matroska) — High fidelity multi-track container', value: 'mkv' },
                  { label: 'AVI — Legacy compatibility', value: 'avi' },
                  { label: 'MOV (QuickTime) — Apple ecosystem standard', value: 'mov' },
                ]}
              />

              <Select
                label="Output Resolution"
                value={resolution}
                onChange={(e) => setResolution(e.target.value)}
                options={[
                  { label: 'Keep Source Resolution', value: 'source' },
                  { label: '1080p (1920x1080 Full HD)', value: '1080p' },
                  { label: '720p (1280x720 HD)', value: '720p' },
                  { label: '480p (854x480 SD)', value: '480p' },
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
                ]}
              />

              <Select
                label="Audio Bitrate"
                value={audioBitrate}
                onChange={(e) => setAudioBitrate(e.target.value)}
                options={[
                  { label: 'Auto (Match Source)', value: 'auto' },
                  { label: '320 kbps (High Fidelity)', value: '320k' },
                  { label: '192 kbps (Standard Audio)', value: '192k' },
                  { label: '128 kbps (Voice / Efficient)', value: '128k' },
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
            leftIcon={<Video className="h-5 w-5" />}
          >
            Start Video Conversion
          </Button>
        </form>

        {createdJob && (
          <div className="mt-8 rounded-2xl border border-blue-200 bg-blue-50/50 p-6 dark:border-blue-900 dark:bg-blue-950/20">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <Badge variant="success">Job Created (HTTP 202)</Badge>
                  <JobStatusBadge status={createdJob.status} />
                </div>
                <h3 className="mt-2 text-base font-semibold text-slate-900 dark:text-slate-100">
                  Job ID: <span className="font-mono text-blue-600 dark:text-blue-400">{createdJob.id}</span>
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Target: {(createdJob.targetFormat || createdJob.outputFormat || targetFormat).toUpperCase()} ({resolution})
                </p>
              </div>

              <Link href={`/jobs/${createdJob.id}`}>
                <Button variant="primary" rightIcon={<ArrowRight className="h-4 w-4" />}>
                  Track Conversion Progress
                </Button>
              </Link>
            </div>

            <div className="mt-4 flex items-start gap-2 rounded-lg bg-white/80 p-3 text-xs text-slate-600 dark:bg-slate-900/80 dark:text-slate-300">
              <Info className="h-4 w-4 shrink-0 text-blue-500 mt-0.5" />
              <span>
                <strong>Pipeline Notice:</strong> Video conversion job queued in Spring Boot. Hardware-accelerated FFmpeg worker processing is scheduled for <strong>Phase 05</strong>.
              </span>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
