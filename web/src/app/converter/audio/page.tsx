'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Music, ArrowRight, Settings, Info } from 'lucide-react';
import { apiClient } from '@/services/apiClient';
import { JobResponse } from '@/types/api';
import { FileDropzone } from '@/components/feedback/FileDropzone';
import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/Select';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { JobStatusBadge } from '@/components/feedback/JobStatusBadge';
import { ErrorAlert } from '@/components/feedback/ErrorAlert';

export default function AudioConverterPage() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [targetFormat, setTargetFormat] = useState('mp3');
  const [bitrate, setBitrate] = useState('320k');
  const [sampleRate, setSampleRate] = useState('44100');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [createdJob, setCreatedJob] = useState<JobResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleConvert = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) {
      setError('Please select or drop an audio file to convert.');
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
        mediaType: 'AUDIO',
        options: {
          audioBitrate: bitrate,
          sampleRate,
        },
      });
      setCreatedJob(job);
    } catch (err: any) {
      setError(err.message || 'Failed to submit audio conversion job.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="text-center space-y-3">
        <div className="inline-flex items-center gap-2 rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300">
          <Music className="h-3.5 w-3.5" />
          <span>High-Fidelity Audio Transcoder</span>
        </div>
        <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-slate-100 sm:text-4xl">
          Convert Audio Files
        </h1>
        <p className="mx-auto max-w-xl text-sm text-slate-600 dark:text-slate-400">
          Convert audio to MP3, WAV, FLAC, AAC, or M4A with lossless fidelity and configurable sample rates.
        </p>
      </div>

      <Card className="mt-8 p-6 sm:p-8">
        <form onSubmit={handleConvert} className="space-y-6">
          {/* File Dropzone */}
          <FileDropzone
            accept="audio/*,.mp3,.wav,.flac,.aac,.m4a,.ogg,.wma"
            selectedFile={selectedFile}
            onFileSelect={setSelectedFile}
            label="Upload Audio"
            description="Drag and drop MP3, WAV, FLAC, AAC, or M4A file (up to 200MB)"
          />

          {/* Format & Audio Options */}
          <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-4 dark:border-slate-800 dark:bg-slate-900/50">
            <div className="flex items-center gap-2 mb-4 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              <Settings className="h-4 w-4" />
              <span>Acoustic Parameters</span>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <Select
                label="Target Format"
                value={targetFormat}
                onChange={(e) => setTargetFormat(e.target.value)}
                options={[
                  { label: 'MP3 (MPEG Audio Layer III)', value: 'mp3' },
                  { label: 'WAV (Uncompressed PCM)', value: 'wav' },
                  { label: 'FLAC (Free Lossless Audio)', value: 'flac' },
                  { label: 'AAC (Advanced Audio Coding)', value: 'aac' },
                  { label: 'M4A (Apple Audio)', value: 'm4a' },
                  { label: 'OGG (Vorbis)', value: 'ogg' },
                ]}
              />

              <Select
                label="Audio Bitrate"
                value={bitrate}
                onChange={(e) => setBitrate(e.target.value)}
                options={[
                  { label: '320 kbps (Extreme High Quality)', value: '320k' },
                  { label: '256 kbps (High Fidelity)', value: '256k' },
                  { label: '192 kbps (Standard CD Quality)', value: '192k' },
                  { label: '128 kbps (Voice / Light)', value: '128k' },
                ]}
              />

              <Select
                label="Sample Rate"
                value={sampleRate}
                onChange={(e) => setSampleRate(e.target.value)}
                options={[
                  { label: '44.1 kHz (CD Standard)', value: '44100' },
                  { label: '48.0 kHz (Studio Video Standard)', value: '48000' },
                  { label: '96.0 kHz (Hi-Res Audio)', value: '96000' },
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
            leftIcon={<Music className="h-5 w-5" />}
          >
            Start Audio Conversion
          </Button>
        </form>

        {createdJob && (
          <div className="mt-8 rounded-2xl border border-emerald-200 bg-emerald-50/50 p-6 dark:border-emerald-900 dark:bg-emerald-950/20">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <Badge variant="success">Job Created (HTTP 202)</Badge>
                  <JobStatusBadge status={createdJob.status} />
                </div>
                <h3 className="mt-2 text-base font-semibold text-slate-900 dark:text-slate-100">
                  Job ID: <span className="font-mono text-emerald-600 dark:text-emerald-400">{createdJob.id}</span>
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Target: {(createdJob.targetFormat || createdJob.outputFormat || targetFormat).toUpperCase()} ({bitrate}, {sampleRate} Hz)
                </p>
              </div>

              <Link href={`/jobs/${createdJob.id}`}>
                <Button variant="primary" rightIcon={<ArrowRight className="h-4 w-4" />}>
                  Track Conversion Progress
                </Button>
              </Link>
            </div>

            <div className="mt-4 flex items-start gap-2 rounded-lg bg-white/80 p-3 text-xs text-slate-600 dark:bg-slate-900/80 dark:text-slate-300">
              <Info className="h-4 w-4 shrink-0 text-emerald-500 mt-0.5" />
              <span>
                <strong>Pipeline Notice:</strong> Audio conversion job registered in Spring Boot database. Audio transcoding engine is scheduled for <strong>Phase 05</strong>.
              </span>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
