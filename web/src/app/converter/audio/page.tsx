'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import Link from 'next/link';
import {
  Music,
  ArrowRight,
  Settings,
  Download,
  XCircle,
  RefreshCw,
  CheckCircle,
  Scissors,
  Sliders,
  ChevronDown,
  ChevronUp,
  Plus,
  Trash2,
  Info,
  Clock,
  Volume2
} from 'lucide-react';
import { apiClient } from '@/services/apiClient';
import { JobResponse, ConversionProgressResponse, SizeEstimationResponse, TimeRangeDto } from '@/types/api';
import { FileDropzone } from '@/components/feedback/FileDropzone';
import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/Select';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { JobStatusBadge } from '@/components/feedback/JobStatusBadge';
import { ErrorAlert } from '@/components/feedback/ErrorAlert';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { AUDIO_PRESETS } from '@/utils/presets';

export default function AudioConverterPage() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [audioDuration, setAudioDuration] = useState<number>(0);

  // Conversion Parameters
  const [targetFormat, setTargetFormat] = useState('mp3');
  const [selectedPreset, setSelectedPreset] = useState<string>('standard');
  const [bitrate, setBitrate] = useState('192k');
  const [sampleRate, setSampleRate] = useState('44100');
  const [channels, setChannels] = useState<number>(2);

  // Advanced Editing
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [showTrimCut, setShowTrimCut] = useState(false);

  // Trim & Cut
  const [startTime, setStartTime] = useState<number>(0);
  const [endTime, setEndTime] = useState<number>(0);
  const [cutSegments, setCutSegments] = useState<TimeRangeDto[]>([]);

  // Volume & Filters
  const [volume, setVolume] = useState<number>(1.0);
  const [removeSilence, setRemoveSilence] = useState<boolean>(false);
  const [fadeInDuration, setFadeInDuration] = useState<number>(0);
  const [fadeOutDuration, setFadeOutDuration] = useState<number>(0);

  // Output Size Estimation
  const [sizeEstimate, setSizeEstimate] = useState<SizeEstimationResponse | null>(null);
  const [isEstimating, setIsEstimating] = useState<boolean>(false);

  // Stage & Tracking
  const [stage, setStage] = useState<'IDLE' | 'UPLOADING' | 'PROCESSING' | 'COMPLETED' | 'FAILED' | 'CANCELLED'>('IDLE');
  const [error, setError] = useState<string | null>(null);
  const [currentJob, setCurrentJob] = useState<JobResponse | null>(null);
  const [progress, setProgress] = useState<ConversionProgressResponse | null>(null);
  const [outputFileId, setOutputFileId] = useState<string | null>(null);

  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const estimateTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Create preview object URL
  useEffect(() => {
    if (selectedFile) {
      const url = URL.createObjectURL(selectedFile);
      setPreviewUrl(url);
      return () => {
        URL.revokeObjectURL(url);
      };
    } else {
      setPreviewUrl(null);
      setAudioDuration(0);
    }
  }, [selectedFile]);

  const handleLoadedMetadata = (e: React.SyntheticEvent<HTMLAudioElement, Event>) => {
    const audio = e.currentTarget;
    const dur = Math.round(audio.duration * 10) / 10;
    setAudioDuration(dur);
    setStartTime(0);
    setEndTime(dur);
  };

  const handlePresetChange = (presetId: string) => {
    setSelectedPreset(presetId);
    const found = AUDIO_PRESETS.find((p) => p.id === presetId);
    if (found) {
      setBitrate(found.bitrate);
      setSampleRate(found.sampleRate.toString());
    }
  };

  const addCutSegment = () => {
    if (audioDuration <= 0) return;
    const defaultStart = Math.min(audioDuration * 0.25, 5);
    const defaultEnd = Math.min(audioDuration * 0.5, 10);
    setCutSegments([...cutSegments, { start: Math.round(defaultStart), end: Math.round(defaultEnd) }]);
  };

  const removeCutSegment = (idx: number) => {
    setCutSegments(cutSegments.filter((_, i) => i !== idx));
  };

  const updateCutSegment = (idx: number, field: 'start' | 'end', val: number) => {
    const updated = [...cutSegments];
    updated[idx] = { ...updated[idx], [field]: Math.max(0, val) };
    setCutSegments(updated);
  };

  // Effective duration
  const effectiveDuration = useMemo(() => {
    if (!audioDuration) return 0;
    let dur = Math.max(0, (endTime > 0 ? endTime : audioDuration) - startTime);
    cutSegments.forEach((seg) => {
      const s = Math.max(startTime, seg.start);
      const e = Math.min(endTime > 0 ? endTime : audioDuration, seg.end);
      if (e > s) {
        dur -= (e - s);
      }
    });
    return Math.max(0.1, Math.round(dur * 10) / 10);
  }, [audioDuration, startTime, endTime, cutSegments]);

  // Size estimation
  useEffect(() => {
    if (estimateTimerRef.current) {
      clearTimeout(estimateTimerRef.current);
    }

    estimateTimerRef.current = setTimeout(async () => {
      try {
        setIsEstimating(true);
        const est = await apiClient.estimateOutputSize({
          mediaType: 'audio',
          outputFormat: targetFormat,
          sourceDuration: audioDuration > 0 ? audioDuration : 180,
          sourceFileSize: selectedFile ? selectedFile.size : undefined,
          audioBitrate: parseInt(bitrate.replace('k', ''), 10) || 192,
          startTime: startTime > 0 ? startTime : undefined,
          endTime: endTime > 0 && endTime < audioDuration ? endTime : undefined,
          removeSegments: cutSegments.length > 0 ? cutSegments : undefined,
        });
        setSizeEstimate(est);
      } catch {
        // Fallback
      } finally {
        setIsEstimating(false);
      }
    }, 300);

    return () => {
      if (estimateTimerRef.current) clearTimeout(estimateTimerRef.current);
    };
  }, [selectedFile, targetFormat, bitrate, sampleRate, startTime, endTime, cutSegments, audioDuration]);

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
    if (!jobId || jobId === 'undefined') {
      setStage('FAILED');
      setError('Unable to track conversion: No valid Job ID was received from the server.');
      return;
    }
    let consecutiveErrors = 0;
    pollIntervalRef.current = setInterval(async () => {
      try {
        const prog = await apiClient.getJobProgress(jobId);
        setProgress(prog);
        consecutiveErrors = 0;

        if (prog.completed || prog.status === 'COMPLETED') {
          cleanupPolling();
          setStage('COMPLETED');
          try {
            const updatedJob = await apiClient.getJobById(jobId);
            setCurrentJob(updatedJob);
            setOutputFileId(updatedJob.outputFileId || jobId);
          } catch {
            setOutputFileId(jobId);
          }
        } else if (prog.failed || prog.status === 'FAILED') {
          cleanupPolling();
          setStage('FAILED');
          setError(prog.errorMessage || 'Audio conversion failed.');
        } else if (prog.status === 'CANCELLED') {
          cleanupPolling();
          setStage('CANCELLED');
        }
      } catch {
        consecutiveErrors++;
        if (consecutiveErrors > 15) {
          cleanupPolling();
          setStage('FAILED');
          setError('Lost connection while polling audio conversion progress.');
        }
      }
    }, 1000);
  };

  const handleConvert = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) {
      setError('Please select or drop an audio or video file to convert.');
      return;
    }

    setError(null);
    setStage('UPLOADING');
    setCurrentJob(null);
    setProgress(null);
    setOutputFileId(null);

    try {
      const uploadResp = await apiClient.uploadFile(selectedFile);
      setStage('PROCESSING');
      const inputFormat = selectedFile.name.split('.').pop()?.toLowerCase();
      const hasTrim = startTime > 0 || (endTime > 0 && endTime < audioDuration);

      const job = await apiClient.createConversionJob({
        inputFileId: uploadResp.id || uploadResp.fileId,
        inputFormat,
        outputFormat: targetFormat,
        audioBitrate: parseInt(bitrate.replace('k', ''), 10) || 192,
        sampleRate: parseInt(sampleRate, 10) || 44100,
        audioChannels: channels,
        startTime: hasTrim && startTime > 0 ? startTime : undefined,
        endTime: hasTrim && endTime > 0 ? endTime : undefined,
        removeSegments: cutSegments.length > 0 ? cutSegments : undefined,
        volume: volume !== 1.0 ? volume : undefined,
        removeSilence: removeSilence ? true : undefined,
        fadeInDuration: fadeInDuration > 0 ? fadeInDuration : undefined,
        fadeOutDuration: fadeOutDuration > 0 ? fadeOutDuration : undefined,
      });

      const effectiveJobId = job.id || (job as any).jobId;
      if (!effectiveJobId) {
        throw new Error('Backend accepted conversion but did not return a valid Job ID.');
      }
      job.id = effectiveJobId;
      setCurrentJob(job);
      startPolling(effectiveJobId);
    } catch (err: any) {
      setStage('FAILED');
      setError(err.message || 'Failed to process audio conversion.');
    }
  };

  const handleCancel = async () => {
    if (!currentJob) return;
    try {
      await apiClient.cancelJob(currentJob.id);
      cleanupPolling();
      setStage('CANCELLED');
    } catch (err: any) {
      setError(err.message || 'Failed to cancel audio conversion.');
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
        <div className="inline-flex items-center gap-2 rounded-full bg-violet-100 px-3 py-1 text-xs font-semibold text-violet-700 dark:bg-violet-950/60 dark:text-violet-300">
          <Music className="h-3.5 w-3.5" />
          <span>Advanced Audio Studio & Converter</span>
        </div>
        <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-slate-100 sm:text-4xl">
          Convert Audio Files & Extract Soundtracks
        </h1>
        <p className="mx-auto max-w-xl text-sm text-slate-600 dark:text-slate-400">
          Trim, cut segments, adjust volume, apply silence removal, and transcode between MP3, WAV, AAC, FLAC, and OGG.
        </p>
      </div>

      <Card className="mt-8 p-6 sm:p-8">
        {stage === 'IDLE' && (
          <form onSubmit={handleConvert} className="space-y-6">
            <FileDropzone
              accept="audio/*,video/*,.mp3,.wav,.aac,.flac,.ogg,.m4a,.wma,.mp4,.mkv,.webm"
              selectedFile={selectedFile}
              onFileSelect={setSelectedFile}
              label="Upload Audio or Video"
              description="Drop audio to convert or video to extract and edit MP3 audio"
            />

            {/* Audio Preview Player */}
            {previewUrl && (
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-900/50 space-y-2">
                <div className="flex items-center justify-between text-xs text-slate-600 dark:text-slate-400">
                  <span className="font-semibold flex items-center gap-1.5">
                    <Volume2 className="h-4 w-4 text-violet-500" />
                    Audio Source Preview
                  </span>
                  <span>Duration: {audioDuration}s</span>
                </div>
                <audio
                  src={previewUrl}
                  controls
                  onLoadedMetadata={handleLoadedMetadata}
                  className="w-full"
                />
              </div>
            )}

            {/* Trimming & Cutting Section */}
            {selectedFile && (
              <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-4 dark:border-slate-800 dark:bg-slate-900/50 space-y-4">
                <button
                  type="button"
                  onClick={() => setShowTrimCut(!showTrimCut)}
                  className="w-full flex items-center justify-between text-left text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300"
                >
                  <div className="flex items-center gap-2">
                    <Scissors className="h-4 w-4 text-violet-500" />
                    <span>Audio Trimming & Segment Cutting</span>
                  </div>
                  {showTrimCut ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </button>

                {showTrimCut && (
                  <div className="space-y-4 pt-2 border-t border-slate-200 dark:border-slate-800">
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <div>
                        <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                          Trim Start (seconds)
                        </label>
                        <input
                          type="number"
                          step="0.1"
                          min="0"
                          max={endTime || audioDuration}
                          value={startTime}
                          onChange={(e) => setStartTime(parseFloat(e.target.value) || 0)}
                          className="w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                          Trim End (seconds)
                        </label>
                        <input
                          type="number"
                          step="0.1"
                          min={startTime}
                          max={audioDuration || 3600}
                          value={endTime}
                          onChange={(e) => setEndTime(parseFloat(e.target.value) || 0)}
                          className="w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                        />
                      </div>
                    </div>

                    {/* Cut Removal Segments */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-medium text-slate-700 dark:text-slate-300">
                          Remove Unwanted Audio Segments:
                        </span>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={addCutSegment}
                          leftIcon={<Plus className="h-3 w-3" />}
                        >
                          Add Segment
                        </Button>
                      </div>

                      {cutSegments.map((seg, idx) => (
                        <div key={idx} className="flex items-center gap-2">
                          <input
                            type="number"
                            step="0.1"
                            min="0"
                            placeholder="Start (s)"
                            value={seg.start}
                            onChange={(e) => updateCutSegment(idx, 'start', parseFloat(e.target.value) || 0)}
                            className="w-24 rounded border border-slate-300 bg-white px-2 py-1 text-xs text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                          />
                          <span className="text-xs text-slate-500">to</span>
                          <input
                            type="number"
                            step="0.1"
                            min={seg.start}
                            placeholder="End (s)"
                            value={seg.end}
                            onChange={(e) => updateCutSegment(idx, 'end', parseFloat(e.target.value) || 0)}
                            className="w-24 rounded border border-slate-300 bg-white px-2 py-1 text-xs text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                          />
                          <button
                            type="button"
                            onClick={() => removeCutSegment(idx)}
                            className="text-red-500 hover:text-red-700 p-1"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>

                    <div className="flex items-center gap-1.5 text-xs text-violet-600 dark:text-violet-400">
                      <Clock className="h-3.5 w-3.5" />
                      <span>Effective Output Duration: <strong>{effectiveDuration} seconds</strong></span>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Encoding & Bitrate Options */}
            <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-4 dark:border-slate-800 dark:bg-slate-900/50">
              <div className="flex items-center gap-2 mb-4 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                <Settings className="h-4 w-4" />
                <span>Acoustic Parameters</span>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <Select
                    label="Audio Quality Preset"
                    value={selectedPreset}
                    onChange={(e) => handlePresetChange(e.target.value)}
                    options={AUDIO_PRESETS.map((p) => ({
                      label: `${p.label} — ${p.description}`,
                      value: p.id,
                    }))}
                  />
                </div>

                <Select
                  label="Target Audio Format"
                  value={targetFormat}
                  onChange={(e) => setTargetFormat(e.target.value)}
                  options={[
                    { label: 'MP3 — Universal Audio', value: 'mp3' },
                    { label: 'WAV — Uncompressed Studio Quality', value: 'wav' },
                    { label: 'AAC — High Efficiency Standard', value: 'aac' },
                    { label: 'FLAC — Lossless Audio', value: 'flac' },
                    { label: 'OGG — Vorbis Open Audio', value: 'ogg' },
                    { label: 'M4A — Apple AAC Audio', value: 'm4a' },
                  ]}
                />

                <Select
                  label="Audio Bitrate"
                  value={bitrate}
                  onChange={(e) => setBitrate(e.target.value)}
                  disabled={targetFormat === 'wav' || targetFormat === 'flac'}
                  options={[
                    { label: '320 kbps (High Fidelity Audiophile)', value: '320k' },
                    { label: '256 kbps (High Quality Music)', value: '256k' },
                    { label: '192 kbps (Standard Quality)', value: '192k' },
                    { label: '128 kbps (Voice / Streaming)', value: '128k' },
                    { label: '96 kbps (Compact Audio)', value: '96k' },
                    { label: '64 kbps (Speech / Minimum)', value: '64k' },
                  ]}
                />

                <Select
                  label="Sample Rate"
                  value={sampleRate}
                  onChange={(e) => setSampleRate(e.target.value)}
                  options={[
                    { label: '96000 Hz (Studio Master)', value: '96000' },
                    { label: '48000 Hz (Standard Digital Audio / Video)', value: '48000' },
                    { label: '44100 Hz (Standard CD Quality)', value: '44100' },
                    { label: '32000 Hz (Broadcast / Efficient)', value: '32000' },
                    { label: '22050 Hz (Low Bandwidth Speech)', value: '22050' },
                  ]}
                />

                <Select
                  label="Channels (Stereo / Mono)"
                  value={channels.toString()}
                  onChange={(e) => setChannels(parseInt(e.target.value, 10))}
                  options={[
                    { label: '2 Channels (Stereo)', value: '2' },
                    { label: '1 Channel (Mono)', value: '1' },
                  ]}
                />
              </div>

              {/* Advanced Audio Controls Collapsible */}
              <div className="mt-4 pt-3 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowAdvanced(!showAdvanced)}
                  className="flex items-center gap-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
                >
                  <Sliders className="h-3.5 w-3.5" />
                  <span>Advanced Audio Controls (Volume, Silence, Fades)</span>
                  {showAdvanced ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                </button>

                {showAdvanced && (
                  <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                        Volume Adjustment ({Math.round(volume * 100)}%):
                      </label>
                      <input
                        type="range"
                        min="0.2"
                        max="2.5"
                        step="0.05"
                        value={volume}
                        onChange={(e) => setVolume(parseFloat(e.target.value))}
                        className="w-full accent-violet-600"
                      />
                    </div>

                    <div className="flex items-center gap-2 mt-4">
                      <input
                        type="checkbox"
                        id="removeSilence"
                        checked={removeSilence}
                        onChange={(e) => setRemoveSilence(e.target.checked)}
                        className="h-4 w-4 rounded border-slate-300 text-violet-600"
                      />
                      <label htmlFor="removeSilence" className="text-xs text-slate-700 dark:text-slate-300">
                        Remove Leading & Trailing Silence
                      </label>
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                        Fade In Duration (seconds):
                      </label>
                      <input
                        type="number"
                        min="0"
                        max="10"
                        step="0.5"
                        value={fadeInDuration}
                        onChange={(e) => setFadeInDuration(parseFloat(e.target.value) || 0)}
                        className="w-full rounded border border-slate-300 bg-white px-2 py-1 text-xs dark:border-slate-700 dark:bg-slate-800"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                        Fade Out Duration (seconds):
                      </label>
                      <input
                        type="number"
                        min="0"
                        max="10"
                        step="0.5"
                        value={fadeOutDuration}
                        onChange={(e) => setFadeOutDuration(parseFloat(e.target.value) || 0)}
                        className="w-full rounded border border-slate-300 bg-white px-2 py-1 text-xs dark:border-slate-700 dark:bg-slate-800"
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Output Size Estimation Box */}
            <div className="rounded-xl border border-violet-200 bg-violet-50/60 p-4 dark:border-violet-900/60 dark:bg-violet-950/30 flex items-start gap-3">
              <Info className="h-5 w-5 text-violet-600 dark:text-violet-400 mt-0.5 flex-shrink-0" />
              <div className="space-y-1">
                <div className="text-xs font-semibold text-violet-900 dark:text-violet-200">
                  {isEstimating ? (
                    'Calculating estimated output size...'
                  ) : sizeEstimate ? (
                    <>
                      Estimated Output Size: <span className="font-bold text-violet-700 dark:text-violet-300">{sizeEstimate.formattedEstimate}</span> ({sizeEstimate.formattedRange})
                    </>
                  ) : (
                    'Size will be calculated after conversion'
                  )}
                </div>
                <p className="text-[11px] text-violet-700 dark:text-violet-300">
                  {sizeEstimate?.disclaimer || 'Estimated size based on audio duration and encoding bitrate.'}
                </p>
              </div>
            </div>

            {error && <ErrorAlert title="Conversion Error" message={error} onClose={() => setError(null)} />}

            <Button
              type="submit"
              variant="primary"
              size="lg"
              className="w-full"
              disabled={!selectedFile}
              leftIcon={<Music className="h-5 w-5" />}
            >
              Start Audio Conversion
            </Button>
          </form>
        )}

        {/* Uploading Stage */}
        {stage === 'UPLOADING' && (
          <div className="py-12 text-center space-y-4">
            <RefreshCw className="h-10 w-10 text-violet-500 animate-spin mx-auto" />
            <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
              Uploading & Verifying Audio Stream...
            </h3>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Allocating secure temporary workspace and initializing FFmpeg audio transcoder.
            </p>
          </div>
        )}

        {/* Processing Stage */}
        {stage === 'PROCESSING' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <Badge variant="info">Audio Transcoding</Badge>
                  <JobStatusBadge status="PROCESSING" />
                </div>
                <h3 className="mt-2 text-base font-semibold text-slate-900 dark:text-slate-100">
                  Transcoding to <span className="uppercase text-violet-600 dark:text-violet-400">{targetFormat}</span>
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
                  {progress?.timeRemainingSeconds ? `ETA: ${progress.timeRemainingSeconds}s` : ''}
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
                Audio Conversion Complete!
              </h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                Your audio was successfully processed and saved in <strong className="uppercase">{targetFormat}</strong> format.
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
                    Download Audio File
                  </Button>
                </a>
              )}

              <Button variant="outline" size="lg" onClick={handleReset} leftIcon={<RefreshCw className="h-4 w-4" />}>
                Convert Another Audio
              </Button>
            </div>
          </div>
        )}

        {/* Failed or Cancelled */}
        {(stage === 'FAILED' || stage === 'CANCELLED') && (
          <div className="py-6 space-y-4">
            <ErrorAlert
              title={stage === 'CANCELLED' ? 'Conversion Cancelled' : 'Conversion Failed'}
              message={error || (stage === 'CANCELLED' ? 'Job was cancelled by user request.' : 'An error occurred during audio processing.')}
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
