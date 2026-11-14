'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import Link from 'next/link';
import {
  Video,
  ArrowRight,
  Settings,
  Download,
  XCircle,
  RefreshCw,
  CheckCircle,
  VolumeX,
  Scissors,
  Crop,
  Sliders,
  ChevronDown,
  ChevronUp,
  Plus,
  Trash2,
  Info,
  Clock
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
import { VIDEO_PRESETS } from '@/utils/presets';

export default function VideoConverterPage() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [videoDuration, setVideoDuration] = useState<number>(0);
  const [videoWidth, setVideoWidth] = useState<number>(0);
  const [videoHeight, setVideoHeight] = useState<number>(0);

  // Conversion Parameters
  const [targetFormat, setTargetFormat] = useState('mp4');
  const [selectedPreset, setSelectedPreset] = useState<string>('high');
  const [resolution, setResolution] = useState('1080p');
  const [videoBitrate, setVideoBitrate] = useState('2500k');
  const [audioBitrate, setAudioBitrate] = useState('256k');
  const [stripAudio, setStripAudio] = useState(false);

  // Advanced Editing Controls
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [showTrimCut, setShowTrimCut] = useState(false);
  const [showCrop, setShowCrop] = useState(false);

  // Trim & Cut
  const [startTime, setStartTime] = useState<number>(0);
  const [endTime, setEndTime] = useState<number>(0);
  const [cutSegments, setCutSegments] = useState<TimeRangeDto[]>([]);

  // Crop
  const [cropAspectRatio, setCropAspectRatio] = useState<string>('custom');
  const [cropX, setCropX] = useState<number>(0);
  const [cropY, setCropY] = useState<number>(0);
  const [cropWidth, setCropWidth] = useState<number>(0);
  const [cropHeight, setCropHeight] = useState<number>(0);

  // Advanced Quality & Audio
  const [crf, setCrf] = useState<number>(23);
  const [videoCodec, setVideoCodec] = useState<string>('auto');
  const [frameRate, setFrameRate] = useState<number | undefined>(undefined);
  const [volume, setVolume] = useState<number>(1.0);
  const [removeSilence, setRemoveSilence] = useState<boolean>(false);
  const [fadeInDuration, setFadeInDuration] = useState<number>(0);
  const [fadeOutDuration, setFadeOutDuration] = useState<number>(0);

  // Output Size Estimation
  const [sizeEstimate, setSizeEstimate] = useState<SizeEstimationResponse | null>(null);
  const [isEstimating, setIsEstimating] = useState<boolean>(false);

  // Stages & Job Tracking
  const [stage, setStage] = useState<'IDLE' | 'UPLOADING' | 'PROCESSING' | 'COMPLETED' | 'FAILED' | 'CANCELLED'>('IDLE');
  const [error, setError] = useState<string | null>(null);
  const [currentJob, setCurrentJob] = useState<JobResponse | null>(null);
  const [progress, setProgress] = useState<ConversionProgressResponse | null>(null);
  const [outputFileId, setOutputFileId] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const estimateTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Create preview object URL when file is selected
  useEffect(() => {
    if (selectedFile) {
      const url = URL.createObjectURL(selectedFile);
      setPreviewUrl(url);
      return () => {
        URL.revokeObjectURL(url);
      };
    } else {
      setPreviewUrl(null);
      setVideoDuration(0);
      setVideoWidth(0);
      setVideoHeight(0);
    }
  }, [selectedFile]);

  // Handle video metadata loaded
  const handleLoadedMetadata = (e: React.SyntheticEvent<HTMLVideoElement, Event>) => {
    const video = e.currentTarget;
    const dur = Math.round(video.duration * 10) / 10;
    setVideoDuration(dur);
    setStartTime(0);
    setEndTime(dur);
    setVideoWidth(video.videoWidth);
    setVideoHeight(video.videoHeight);
    setCropWidth(video.videoWidth);
    setCropHeight(video.videoHeight);
    setCropX(0);
    setCropY(0);
  };

  const handlePresetChange = (presetId: string) => {
    setSelectedPreset(presetId);
    const found = VIDEO_PRESETS.find((p) => p.id === presetId);
    if (found) {
      setResolution(found.resolution);
      setVideoBitrate(found.videoBitrate);
      setAudioBitrate(found.audioBitrate);
    }
    if (presetId === 'high') setCrf(20);
    else if (presetId === 'balanced' || presetId === 'medium') setCrf(23);
    else if (presetId === 'small' || presetId === 'low') setCrf(28);
    else if (presetId === 'best') setCrf(18);
  };

  // Crop Aspect Ratio selection
  const handleAspectRatioPreset = (preset: string) => {
    setCropAspectRatio(preset);
    if (!videoWidth || !videoHeight) return;

    let targetW = videoWidth;
    let targetH = videoHeight;

    if (preset === '16:9') {
      targetH = Math.round((videoWidth * 9) / 16);
      if (targetH > videoHeight) {
        targetH = videoHeight;
        targetW = Math.round((videoHeight * 16) / 9);
      }
    } else if (preset === '9:16') {
      targetW = Math.round((videoHeight * 9) / 16);
      if (targetW > videoWidth) {
        targetW = videoWidth;
        targetH = Math.round((videoWidth * 16) / 9);
      }
    } else if (preset === '1:1') {
      const minDim = Math.min(videoWidth, videoHeight);
      targetW = minDim;
      targetH = minDim;
    } else if (preset === '4:3') {
      targetH = Math.round((videoWidth * 3) / 4);
      if (targetH > videoHeight) {
        targetH = videoHeight;
        targetW = Math.round((videoHeight * 4) / 3);
      }
    }

    targetW = targetW - (targetW % 2);
    targetH = targetH - (targetH % 2);
    const startX = Math.max(0, Math.floor((videoWidth - targetW) / 2));
    const startY = Math.max(0, Math.floor((videoHeight - targetH) / 2));

    setCropWidth(targetW);
    setCropHeight(targetH);
    setCropX(startX);
    setCropY(startY);
  };

  // Add cut segment
  const addCutSegment = () => {
    if (videoDuration <= 0) return;
    const defaultStart = Math.min(videoDuration * 0.25, 5);
    const defaultEnd = Math.min(videoDuration * 0.5, 10);
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

  // Calculate live effective duration
  const effectiveDuration = useMemo(() => {
    if (!videoDuration) return 0;
    let dur = Math.max(0, (endTime > 0 ? endTime : videoDuration) - startTime);
    cutSegments.forEach((seg) => {
      const s = Math.max(startTime, seg.start);
      const e = Math.min(endTime > 0 ? endTime : videoDuration, seg.end);
      if (e > s) {
        dur -= (e - s);
      }
    });
    return Math.max(0.1, Math.round(dur * 10) / 10);
  }, [videoDuration, startTime, endTime, cutSegments]);

  // Debounced Output Size Estimation
  useEffect(() => {
    if (estimateTimerRef.current) {
      clearTimeout(estimateTimerRef.current);
    }

    estimateTimerRef.current = setTimeout(async () => {
      try {
        setIsEstimating(true);
        const est = await apiClient.estimateOutputSize({
          mediaType: 'video',
          outputFormat: targetFormat,
          sourceDuration: videoDuration > 0 ? videoDuration : 60,
          sourceWidth: videoWidth || 1920,
          sourceHeight: videoHeight || 1080,
          sourceFileSize: selectedFile ? selectedFile.size : undefined,
          targetResolution: resolution !== 'source' ? resolution : undefined,
          videoBitrate: videoBitrate !== 'auto' ? videoBitrate : undefined,
          audioBitrate: audioBitrate !== 'auto' ? parseInt(audioBitrate.replace('k', ''), 10) : undefined,
          qualityPreset: selectedPreset !== 'custom' ? selectedPreset : undefined,
          crf: selectedPreset === 'custom' ? crf : undefined,
          stripAudio,
          startTime: startTime > 0 ? startTime : undefined,
          endTime: endTime > 0 && endTime < videoDuration ? endTime : undefined,
          removeSegments: cutSegments.length > 0 ? cutSegments : undefined,
          cropWidth: showCrop && cropWidth > 0 ? cropWidth : undefined,
          cropHeight: showCrop && cropHeight > 0 ? cropHeight : undefined,
        });
        setSizeEstimate(est);
      } catch {
        // Fallback gracefully
      } finally {
        setIsEstimating(false);
      }
    }, 300);

    return () => {
      if (estimateTimerRef.current) clearTimeout(estimateTimerRef.current);
    };
  }, [
    selectedFile,
    targetFormat,
    resolution,
    videoBitrate,
    audioBitrate,
    selectedPreset,
    crf,
    stripAudio,
    startTime,
    endTime,
    cutSegments,
    showCrop,
    cropWidth,
    cropHeight,
    videoDuration,
    videoWidth,
    videoHeight,
  ]);

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
            if (updatedJob.outputFileId) {
              setOutputFileId(updatedJob.outputFileId);
            } else {
              setOutputFileId(jobId);
            }
          } catch {
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
      } catch {
        consecutiveErrors++;
        if (consecutiveErrors > 15) {
          cleanupPolling();
          setStage('FAILED');
          setError('Lost connection while polling conversion progress. Please check Jobs Manager.');
        }
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
      // Step 1: Upload file
      const uploadResp = await apiClient.uploadFile(selectedFile);

      // Step 2: Submit conversion job with complete editing parameters
      setStage('PROCESSING');
      const inputFormat = selectedFile.name.split('.').pop()?.toLowerCase();

      const hasTrim = startTime > 0 || (endTime > 0 && endTime < videoDuration);
      const hasCropConfig = showCrop && cropWidth > 0 && cropHeight > 0 && (cropWidth !== videoWidth || cropHeight !== videoHeight || cropX > 0 || cropY > 0);

      const job = await apiClient.createConversionJob({
        inputFileId: uploadResp.id || uploadResp.fileId,
        inputFormat,
        outputFormat: targetFormat,
        qualityPreset: selectedPreset !== 'custom' ? selectedPreset : undefined,
        targetResolution: resolution !== 'source' ? resolution : undefined,
        videoBitrate: videoBitrate !== 'auto' ? videoBitrate : undefined,
        audioBitrate: audioBitrate !== 'auto' ? parseInt(audioBitrate.replace('k', ''), 10) : undefined,
        stripAudio,
        // Trim & Cut
        startTime: hasTrim && startTime > 0 ? startTime : undefined,
        endTime: hasTrim && endTime > 0 ? endTime : undefined,
        removeSegments: cutSegments.length > 0 ? cutSegments : undefined,
        // Crop
        cropX: hasCropConfig ? cropX : undefined,
        cropY: hasCropConfig ? cropY : undefined,
        cropWidth: hasCropConfig ? cropWidth : undefined,
        cropHeight: hasCropConfig ? cropHeight : undefined,
        aspectRatio: showCrop ? cropAspectRatio : undefined,
        // Advanced
        crf: selectedPreset === 'custom' ? crf : undefined,
        videoCodec: videoCodec !== 'auto' ? videoCodec : undefined,
        frameRate: frameRate && frameRate > 0 ? frameRate : undefined,
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
          <span>Advanced Video Editor & Transcoder</span>
        </div>
        <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-slate-100 sm:text-4xl">
          Convert Video Files
        </h1>
        <p className="mx-auto max-w-xl text-sm text-slate-600 dark:text-slate-400">
          Trim, cut unwanted segments, crop aspect ratios, change resolutions, and convert formats with real FFmpeg processing.
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

            {/* Video Interactive Preview */}
            {previewUrl && (
              <div className="rounded-xl border border-slate-200 bg-slate-900/90 p-4 dark:border-slate-800 text-slate-100 space-y-3">
                <div className="flex items-center justify-between text-xs text-slate-300">
                  <div className="flex items-center gap-2">
                    <Video className="h-4 w-4 text-blue-400" />
                    <span className="font-semibold">Source Preview</span>
                  </div>
                  <span>
                    Dimensions: {videoWidth}x{videoHeight} | Duration: {videoDuration}s
                  </span>
                </div>

                <div className="relative aspect-video max-h-72 w-full overflow-hidden rounded-lg bg-black flex items-center justify-center">
                  <video
                    ref={videoRef}
                    src={previewUrl}
                    controls
                    onLoadedMetadata={handleLoadedMetadata}
                    className="max-h-full max-w-full rounded"
                  />
                  {showCrop && cropWidth > 0 && cropHeight > 0 && videoWidth > 0 && videoHeight > 0 && (
                    <div
                      className="absolute border-2 border-dashed border-amber-400 bg-amber-400/10 pointer-events-none"
                      style={{
                        left: `${(cropX / videoWidth) * 100}%`,
                        top: `${(cropY / videoHeight) * 100}%`,
                        width: `${(cropWidth / videoWidth) * 100}%`,
                        height: `${(cropHeight / videoHeight) * 100}%`,
                      }}
                    >
                      <span className="absolute top-1 left-1 bg-amber-500 text-black text-[10px] font-bold px-1 rounded">
                        {cropWidth}x{cropHeight}
                      </span>
                    </div>
                  )}
                </div>
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
                    <Scissors className="h-4 w-4 text-blue-500" />
                    <span>Trim & Cut Unwanted Segments</span>
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
                          max={endTime || videoDuration}
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
                          max={videoDuration || 3600}
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
                          Remove Unwanted Segments (e.g. 10–20s):
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

                    <div className="flex items-center gap-1.5 text-xs text-blue-600 dark:text-blue-400">
                      <Clock className="h-3.5 w-3.5" />
                      <span>Effective Output Duration: <strong>{effectiveDuration} seconds</strong></span>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Video Cropping Section */}
            {selectedFile && (
              <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-4 dark:border-slate-800 dark:bg-slate-900/50 space-y-4">
                <button
                  type="button"
                  onClick={() => setShowCrop(!showCrop)}
                  className="w-full flex items-center justify-between text-left text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300"
                >
                  <div className="flex items-center gap-2">
                    <Crop className="h-4 w-4 text-emerald-500" />
                    <span>Crop Video & Aspect Ratio</span>
                  </div>
                  {showCrop ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </button>

                {showCrop && (
                  <div className="space-y-4 pt-2 border-t border-slate-200 dark:border-slate-800">
                    <div>
                      <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-2">
                        Aspect Ratio Presets:
                      </label>
                      <div className="flex flex-wrap gap-2">
                        {['custom', '16:9', '9:16', '1:1', '4:3'].map((preset) => (
                          <button
                            key={preset}
                            type="button"
                            onClick={() => handleAspectRatioPreset(preset)}
                            className={`px-3 py-1 rounded text-xs font-medium transition ${
                              cropAspectRatio === preset
                                ? 'bg-emerald-600 text-white'
                                : 'bg-slate-200 text-slate-700 hover:bg-slate-300 dark:bg-slate-800 dark:text-slate-300'
                            }`}
                          >
                            {preset.toUpperCase()}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                      <div>
                        <label className="block text-[11px] text-slate-500 mb-1">X Offset</label>
                        <input
                          type="number"
                          min="0"
                          value={cropX}
                          onChange={(e) => setCropX(parseInt(e.target.value, 10) || 0)}
                          className="w-full rounded border border-slate-300 bg-white px-2 py-1 text-xs dark:border-slate-700 dark:bg-slate-800"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] text-slate-500 mb-1">Y Offset</label>
                        <input
                          type="number"
                          min="0"
                          value={cropY}
                          onChange={(e) => setCropY(parseInt(e.target.value, 10) || 0)}
                          className="w-full rounded border border-slate-300 bg-white px-2 py-1 text-xs dark:border-slate-700 dark:bg-slate-800"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] text-slate-500 mb-1">Crop Width</label>
                        <input
                          type="number"
                          min="2"
                          value={cropWidth}
                          onChange={(e) => setCropWidth(parseInt(e.target.value, 10) || 2)}
                          className="w-full rounded border border-slate-300 bg-white px-2 py-1 text-xs dark:border-slate-700 dark:bg-slate-800"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] text-slate-500 mb-1">Crop Height</label>
                        <input
                          type="number"
                          min="2"
                          value={cropHeight}
                          onChange={(e) => setCropHeight(parseInt(e.target.value, 10) || 2)}
                          className="w-full rounded border border-slate-300 bg-white px-2 py-1 text-xs dark:border-slate-700 dark:bg-slate-800"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Format & Encoding Options */}
            <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-4 dark:border-slate-800 dark:bg-slate-900/50">
              <div className="flex items-center gap-2 mb-4 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                <Settings className="h-4 w-4" />
                <span>Transcoding Parameters</span>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <Select
                    label="Quality & Compression Preset"
                    value={selectedPreset}
                    onChange={(e) => handlePresetChange(e.target.value)}
                    options={[
                      ...VIDEO_PRESETS.map((p) => ({
                        label: `${p.label} — ${p.description}`,
                        value: p.id,
                      })),
                      { label: 'Best Available (Maximum Quality, CRF 18)', value: 'best' },
                      { label: 'Custom Configuration', value: 'custom' },
                    ]}
                  />
                </div>

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
                    { label: '2160p (4K UHD 3840x2160)', value: '2160p' },
                    { label: '1440p (2K QHD 2560x1440)', value: '1440p' },
                    { label: '1080p (1920x1080 Full HD)', value: '1080p' },
                    { label: '720p (1280x720 HD)', value: '720p' },
                    { label: '480p (854x480 SD)', value: '480p' },
                    { label: '360p (640x360 Compact)', value: '360p' },
                    { label: '240p (426x240 Mobile)', value: '240p' },
                  ]}
                />

                <Select
                  label="Video Bitrate"
                  value={videoBitrate}
                  onChange={(e) => setVideoBitrate(e.target.value)}
                  options={[
                    { label: 'Auto (Recommended)', value: 'auto' },
                    { label: '8000 kbps (High Bitrate 2K/4K)', value: '8000k' },
                    { label: '5000 kbps (1080p High Quality)', value: '5000k' },
                    { label: '2500 kbps (Standard 1080p/720p)', value: '2500k' },
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
                    { label: '256 kbps (High Quality)', value: '256k' },
                    { label: '192 kbps (Standard Audio)', value: '192k' },
                    { label: '128 kbps (Voice / Efficient)', value: '128k' },
                    { label: '64 kbps (Compact Voice)', value: '64k' },
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

              {/* Advanced Settings Collapsible */}
              <div className="mt-4 pt-3 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowAdvanced(!showAdvanced)}
                  className="flex items-center gap-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
                >
                  <Sliders className="h-3.5 w-3.5" />
                  <span>Advanced Codec, CRF & Audio Filters</span>
                  {showAdvanced ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                </button>

                {showAdvanced && (
                  <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                        CRF Quality Factor ({crf}):
                      </label>
                      <input
                        type="range"
                        min="16"
                        max="35"
                        value={crf}
                        onChange={(e) => setCrf(parseInt(e.target.value, 10))}
                        className="w-full accent-blue-600"
                      />
                      <span className="text-[10px] text-slate-500">18 (Near Lossless) to 28 (High Compression)</span>
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                        Video Codec Override:
                      </label>
                      <select
                        value={videoCodec}
                        onChange={(e) => setVideoCodec(e.target.value)}
                        className="w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                      >
                        <option value="auto">Auto (Match Container)</option>
                        <option value="libx264">H.264 (libx264)</option>
                        <option value="libvpx-vp9">VP9 (libvpx-vp9)</option>
                        <option value="msmpeg4v2">MPEG-4 (msmpeg4v2)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                        Volume Adjustment ({Math.round(volume * 100)}%):
                      </label>
                      <input
                        type="range"
                        min="0.1"
                        max="2.0"
                        step="0.05"
                        value={volume}
                        onChange={(e) => setVolume(parseFloat(e.target.value))}
                        className="w-full accent-blue-600"
                      />
                    </div>

                    <div className="flex items-center gap-2 mt-4">
                      <input
                        type="checkbox"
                        id="removeSilence"
                        checked={removeSilence}
                        onChange={(e) => setRemoveSilence(e.target.checked)}
                        className="h-4 w-4 rounded border-slate-300 text-blue-600"
                      />
                      <label htmlFor="removeSilence" className="text-xs text-slate-700 dark:text-slate-300">
                        Automatic Audio Silence Removal
                      </label>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Output Size Estimation Box */}
            <div className="rounded-xl border border-blue-200 bg-blue-50/60 p-4 dark:border-blue-900/60 dark:bg-blue-950/30 flex items-start gap-3">
              <Info className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
              <div className="space-y-1">
                <div className="text-xs font-semibold text-blue-900 dark:text-blue-200">
                  {isEstimating ? (
                    'Calculating estimated output size...'
                  ) : sizeEstimate ? (
                    <>
                      Estimated Output Size: <span className="font-bold text-blue-700 dark:text-blue-300">{sizeEstimate.formattedEstimate}</span> ({sizeEstimate.formattedRange})
                    </>
                  ) : (
                    'Size will be calculated after conversion'
                  )}
                </div>
                <p className="text-[11px] text-blue-700 dark:text-blue-300">
                  {sizeEstimate?.disclaimer || 'Estimated size based on encoding parameters and container overhead. Upscaling resolution does not restore missing source detail.'}
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
