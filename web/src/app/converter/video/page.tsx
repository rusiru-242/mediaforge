'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import Link from 'next/link';
import {
  Film,
  Play,
  Pause,
  RotateCcw,
  RotateCw,
  Scissors,
  Crop as CropIcon,
  Sliders,
  Volume2,
  VolumeX,
  Maximize,
  Download,
  Upload,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  XCircle,
  Shield,
  Layers,
  ChevronDown,
  Trash2,
  Plus,
  TrendingDown,
  Sparkles,
} from 'lucide-react';
import { apiClient } from '@/services/apiClient';
import { JobResponse, ConversionProgressResponse, SizeEstimationResponse, TimeRangeDto } from '@/types/api';
import { VIDEO_PRESETS } from '@/utils/presets';

export default function VideoConverterPage() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [videoDuration, setVideoDuration] = useState<number>(0);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [videoWidth, setVideoWidth] = useState<number>(0);
  const [videoHeight, setVideoHeight] = useState<number>(0);

  // Conversion Parameters
  const [targetFormat, setTargetFormat] = useState('mp4');
  const [selectedPreset, setSelectedPreset] = useState<string>('high');
  const [resolution, setResolution] = useState('1080p');
  const [videoBitrate, setVideoBitrate] = useState('4500k');
  const [audioBitrate, setAudioBitrate] = useState('192k');
  const [stripAudio, setStripAudio] = useState(false);

  // Active Tool Mode in Workspace
  const [activeTool, setActiveTool] = useState<'select' | 'split' | 'cut' | 'crop'>('select');

  // Trim & Cut
  const [startTime, setStartTime] = useState<number>(0);
  const [endTime, setEndTime] = useState<number>(0);
  const [cutSegments, setCutSegments] = useState<TimeRangeDto[]>([]);

  // Crop
  const [cropAspectRatio, setCropAspectRatio] = useState<string>('16:9');
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
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const estimateTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Object URL lifecycle
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

  const handleTimeUpdate = () => {
    if (videoRef.current) {
      setCurrentTime(videoRef.current.currentTime);
      if (endTime > 0 && videoRef.current.currentTime >= endTime) {
        videoRef.current.pause();
        setIsPlaying(false);
      }
    }
  };

  const togglePlay = () => {
    if (!videoRef.current) return;
    if (isPlaying) {
      videoRef.current.pause();
      setIsPlaying(false);
    } else {
      if (videoRef.current.currentTime < startTime || (endTime > 0 && videoRef.current.currentTime >= endTime)) {
        videoRef.current.currentTime = startTime;
      }
      videoRef.current.play();
      setIsPlaying(true);
    }
  };

  const seekRelative = (seconds: number) => {
    if (!videoRef.current) return;
    videoRef.current.currentTime = Math.max(0, Math.min(videoDuration, videoRef.current.currentTime + seconds));
  };

  const handleTimelineScrub = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!videoRef.current || videoDuration <= 0) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const pos = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const target = pos * videoDuration;
    videoRef.current.currentTime = target;
    setCurrentTime(target);
  };

  const formatTime = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    const ms = Math.floor((sec % 1) * 100);
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}.${String(ms).padStart(2, '0')}`;
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

  const effectiveDuration = useMemo(() => {
    if (!videoDuration) return 0;
    let dur = Math.max(0, (endTime > 0 ? endTime : videoDuration) - startTime);
    cutSegments.forEach((seg) => {
      const s = Math.max(startTime, seg.start);
      const e = Math.min(endTime > 0 ? endTime : videoDuration, seg.end);
      if (e > s) {
        dur -= e - s;
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
          cropWidth: activeTool === 'crop' && cropWidth > 0 ? cropWidth : undefined,
          cropHeight: activeTool === 'crop' && cropHeight > 0 ? cropHeight : undefined,
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
    activeTool,
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
            setOutputFileId(updatedJob.outputFileId || jobId);
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
          setError('Lost connection while polling conversion progress.');
        }
      }
    }, 1000);
  };

  const handleConvert = async () => {
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
      const uploadResp = await apiClient.uploadFile(selectedFile);
      setStage('PROCESSING');
      const inputFormat = selectedFile.name.split('.').pop()?.toLowerCase();

      const hasTrim = startTime > 0 || (endTime > 0 && endTime < videoDuration);
      const hasCropConfig =
        activeTool === 'crop' &&
        cropWidth > 0 &&
        cropHeight > 0 &&
        (cropWidth !== videoWidth || cropHeight !== videoHeight || cropX > 0 || cropY > 0);

      const job = await apiClient.createConversionJob({
        inputFileId: uploadResp.id || uploadResp.fileId,
        inputFormat,
        outputFormat: targetFormat,
        qualityPreset: selectedPreset !== 'custom' ? selectedPreset : undefined,
        targetResolution: resolution !== 'source' ? resolution : undefined,
        videoBitrate: videoBitrate !== 'auto' ? videoBitrate : undefined,
        audioBitrate: audioBitrate !== 'auto' ? parseInt(audioBitrate.replace('k', ''), 10) : undefined,
        stripAudio,
        startTime: hasTrim && startTime > 0 ? startTime : undefined,
        endTime: hasTrim && endTime > 0 ? endTime : undefined,
        removeSegments: cutSegments.length > 0 ? cutSegments : undefined,
        cropX: hasCropConfig ? cropX : undefined,
        cropY: hasCropConfig ? cropY : undefined,
        cropWidth: hasCropConfig ? cropWidth : undefined,
        cropHeight: hasCropConfig ? cropHeight : undefined,
        aspectRatio: activeTool === 'crop' ? cropAspectRatio : undefined,
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

  const handleResetTrims = () => {
    setStartTime(0);
    setEndTime(videoDuration);
    setCutSegments([]);
    if (videoRef.current) {
      videoRef.current.currentTime = 0;
      setCurrentTime(0);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
      setStage('IDLE');
      setError(null);
    }
  };

  return (
    <div className="w-full max-w-7xl mx-auto px-gutter py-space-md flex flex-col gap-space-md">
      {/* Top Workspace Status Bar */}
      <div className="w-full bg-surface-container-lowest dark:bg-slate-900 rounded-2xl p-space-sm sm:px-space-md shadow-sm border border-outline-variant/30 flex flex-wrap items-center justify-between gap-space-sm">
        <div className="flex items-center gap-space-sm flex-wrap min-w-0">
          <div className="flex items-center gap-1.5 text-on-surface-variant font-medium text-xs">
            <Film className="w-4 h-4 text-primary" />
            <Link href="/" className="hover:text-on-surface transition-colors">
              Studio
            </Link>
            <span className="text-outline-variant">/</span>
            <span className="font-semibold text-on-surface truncate max-w-[220px] sm:max-w-xs">
              {selectedFile ? selectedFile.name : 'No video selected'}
            </span>
          </div>
          {selectedFile && videoDuration > 0 && (
            <div className="hidden lg:flex items-center gap-1.5 px-3 py-1 rounded-full bg-surface-container-low dark:bg-slate-800 text-on-surface-variant font-mono text-xs">
              <span className="w-1.5 h-1.5 rounded-full bg-tertiary-container animate-pulse" />
              <span>
                {videoWidth}×{videoHeight} · {formatTime(videoDuration)} · {(selectedFile.size / (1024 * 1024)).toFixed(1)} MB
              </span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2">
          <button
            type="button"
            onClick={handleResetTrims}
            disabled={!selectedFile}
            className="px-3 h-8 rounded-full bg-surface-container-low dark:bg-slate-800 text-on-surface-variant font-semibold text-xs hover:bg-surface-container hover:text-on-surface transition-colors flex items-center gap-1.5 disabled:opacity-40"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Reset Trims</span>
          </button>

          <label className="px-3.5 h-8 rounded-full bg-primary-fixed text-on-primary-fixed-variant dark:bg-slate-800 dark:text-primary font-semibold text-xs hover:bg-primary-fixed/80 transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs">
            <Upload className="w-3.5 h-3.5" />
            <span>{selectedFile ? 'Replace File' : 'Choose Video'}</span>
            <input
              ref={fileInputRef}
              type="file"
              accept="video/*,.mp4,.mkv,.webm,.avi,.mov,.flv,.m4v"
              onChange={handleFileChange}
              className="hidden"
            />
          </label>
        </div>
      </div>

      {/* Main Workspace: Asymmetric Grid (8 Col Canvas / 4 Col Inspector) */}
      <div className="w-full grid grid-cols-1 lg:grid-cols-12 gap-space-md items-start">
        {/* Left Workstation (Cols 1-8) */}
        <div className="lg:col-span-8 flex flex-col gap-space-md">
          {/* 16:9 Video Canvas Surface */}
          <div className="relative w-full bg-surface-container-lowest dark:bg-slate-900 rounded-3xl overflow-hidden shadow-sm border border-outline-variant/30 flex flex-col group">
            <div className="relative w-full aspect-video bg-inverse-surface flex items-center justify-center overflow-hidden">
              {previewUrl ? (
                <video
                  ref={videoRef}
                  src={previewUrl}
                  onLoadedMetadata={handleLoadedMetadata}
                  onTimeUpdate={handleTimeUpdate}
                  className="w-full h-full object-contain"
                  playsInline
                />
              ) : (
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="flex flex-col items-center justify-center text-center p-8 cursor-pointer hover:opacity-90 transition-opacity"
                >
                  <div className="w-16 h-16 rounded-full bg-primary/20 text-primary flex items-center justify-center mb-4">
                    <Upload className="w-8 h-8" />
                  </div>
                  <h3 className="text-lg font-bold text-white mb-1">Click to Upload Video</h3>
                  <p className="text-xs text-slate-400 max-w-sm">
                    Drop MP4, MKV, WebM, MOV, or AVI files here to begin editing and trimming locally.
                  </p>
                </div>
              )}

              {/* Floating Top Badges */}
              {previewUrl && (
                <div className="absolute top-4 left-4 flex items-center gap-2 z-10 pointer-events-none">
                  <span className="px-2.5 py-1 rounded-full bg-inverse-surface/80 backdrop-blur-md text-white font-mono text-[11px] flex items-center gap-1.5 shadow-sm">
                    <span className="w-2 h-2 rounded-full bg-tertiary-fixed animate-ping" />
                    <span>HW PREVIEW</span>
                  </span>
                  <span className="px-2.5 py-1 rounded-full bg-surface-container-lowest/80 backdrop-blur-md text-on-surface font-semibold text-xs shadow-sm">
                    {cropAspectRatio} {activeTool === 'crop' ? 'Crop' : 'Aspect'}
                  </span>
                </div>
              )}

              {/* Big Centered Play/Pause Overlay */}
              {previewUrl && (
                <button
                  type="button"
                  onClick={togglePlay}
                  className="absolute z-20 w-16 h-16 rounded-full bg-surface-container-lowest/90 text-primary flex items-center justify-center shadow-xl hover:scale-105 active:scale-95 transition-all focus:outline-none"
                >
                  {isPlaying ? <Pause className="w-8 h-8" /> : <Play className="w-8 h-8 ml-1" />}
                </button>
              )}

              {/* Bottom Floating Player Bar Overlaid On Video */}
              {previewUrl && (
                <div className="absolute bottom-3 inset-x-3 z-20 flex flex-col gap-1.5 p-2 rounded-2xl bg-inverse-surface/85 backdrop-blur-md text-white shadow-md">
                  {/* Micro Quick Scrub Rail */}
                  <div
                    onClick={handleTimelineScrub}
                    className="relative w-full h-1.5 bg-white/20 rounded-full cursor-pointer overflow-hidden group/scrub"
                  >
                    <div
                      className="h-full bg-primary-container rounded-full"
                      style={{
                        width: `${videoDuration > 0 ? (currentTime / videoDuration) * 100 : 0}%`,
                      }}
                    />
                  </div>

                  <div className="flex items-center justify-between gap-2 pt-1">
                    {/* Left Controls */}
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={togglePlay}
                        className="w-8 h-8 rounded-full hover:bg-white/10 flex items-center justify-center transition-colors"
                      >
                        {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                      </button>
                      <button
                        type="button"
                        onClick={() => seekRelative(-5)}
                        title="Step -5s"
                        className="w-7 h-7 rounded-full hover:bg-white/10 flex items-center justify-center transition-colors"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => seekRelative(5)}
                        title="Step +5s"
                        className="w-7 h-7 rounded-full hover:bg-white/10 flex items-center justify-center transition-colors"
                      >
                        <RotateCw className="w-3.5 h-3.5" />
                      </button>
                      <div className="h-4 w-px bg-white/20 mx-1" />
                      {/* Timecode */}
                      <div className="font-mono text-xs tracking-wider text-slate-200">
                        <span className="font-semibold text-white">{formatTime(currentTime)}</span>
                        <span className="opacity-70"> / {formatTime(videoDuration)}</span>
                      </div>
                    </div>

                    {/* Right Controls */}
                    <div className="flex items-center gap-1.5">
                      <div className="flex items-center gap-1 px-2 py-0.5 rounded-full hover:bg-white/10 transition-colors">
                        <button
                          type="button"
                          onClick={() => setVolume((v) => (v > 0 ? 0 : 1))}
                          className="w-6 h-6 flex items-center justify-center"
                        >
                          {volume === 0 ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
                        </button>
                        <input
                          type="range"
                          min="0"
                          max="1.5"
                          step="0.05"
                          value={volume}
                          onChange={(e) => {
                            const val = parseFloat(e.target.value);
                            setVolume(val);
                            if (videoRef.current) videoRef.current.volume = Math.min(1, val);
                          }}
                          className="w-14 h-1 accent-primary bg-white/30 rounded-full cursor-pointer hidden sm:block"
                        />
                      </div>
                      <div className="hidden sm:flex items-center bg-white/10 rounded-full p-0.5 text-xs font-semibold">
                        {(['16:9', '9:16', '1:1'] as const).map((ratio) => (
                          <button
                            key={ratio}
                            type="button"
                            onClick={() => handleAspectRatioPreset(ratio)}
                            className={`px-2 py-0.5 rounded-full transition-all ${
                              cropAspectRatio === ratio ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-300 hover:text-white'
                            }`}
                          >
                            {ratio}
                          </button>
                        ))}
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          if (videoRef.current) {
                            if (document.fullscreenElement) {
                              document.exitFullscreen();
                            } else {
                              videoRef.current.requestFullscreen();
                            }
                          }
                        }}
                        className="w-8 h-8 rounded-full hover:bg-white/10 flex items-center justify-center transition-colors"
                        title="Toggle Fullscreen"
                      >
                        <Maximize className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Timeline Control Strip & Visual Editing Stage */}
          <div className="w-full bg-surface-container-lowest dark:bg-slate-900 rounded-3xl p-space-md shadow-sm border border-outline-variant/30 flex flex-col gap-space-sm">
            {/* Timeline Action Bar */}
            <div className="flex flex-wrap items-center justify-between gap-space-sm pb-1">
              <div className="flex items-center p-1 bg-surface-container-low dark:bg-slate-800 rounded-full">
                <button
                  type="button"
                  onClick={() => setActiveTool('select')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
                    activeTool === 'select'
                      ? 'bg-surface-container-lowest dark:bg-slate-700 text-on-surface shadow-xs'
                      : 'text-on-surface-variant hover:text-on-surface'
                  }`}
                >
                  <Film className="w-3.5 h-3.5 text-primary" />
                  <span>Select Range</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setActiveTool('cut');
                    addCutSegment();
                  }}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
                    activeTool === 'cut'
                      ? 'bg-surface-container-lowest dark:bg-slate-700 text-on-surface shadow-xs'
                      : 'text-on-surface-variant hover:text-on-surface'
                  }`}
                >
                  <Scissors className="w-3.5 h-3.5 text-primary" />
                  <span>Cut Segments</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTool('crop')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
                    activeTool === 'crop'
                      ? 'bg-surface-container-lowest dark:bg-slate-700 text-on-surface shadow-xs'
                      : 'text-on-surface-variant hover:text-on-surface'
                  }`}
                >
                  <CropIcon className="w-3.5 h-3.5 text-primary" />
                  <span>Crop Canvas</span>
                </button>
              </div>

              <div className="flex items-center gap-2 font-mono text-xs">
                <span className="px-3 py-1.5 rounded-full bg-primary-fixed text-on-primary-fixed-variant dark:bg-slate-800 dark:text-primary font-bold">
                  Effective: {effectiveDuration.toFixed(1)}s
                </span>
              </div>
            </div>

            {/* Visual Timeline Canvas Area */}
            <div className="w-full flex flex-col gap-2 pt-2">
              {/* Ruler */}
              <div className="relative w-full h-5 font-mono text-[11px] text-on-surface-variant flex justify-between px-1 select-none">
                <span>00:00</span>
                <span>{formatTime(videoDuration * 0.25)}</span>
                <span>{formatTime(videoDuration * 0.5)}</span>
                <span>{formatTime(videoDuration * 0.75)}</span>
                <span>{formatTime(videoDuration)}</span>
              </div>

              {/* Interactive Trim Track */}
              <div
                onClick={handleTimelineScrub}
                className="relative w-full h-20 bg-surface-container-low dark:bg-slate-950 rounded-2xl overflow-hidden select-none cursor-pointer border border-outline-variant/30 flex flex-col justify-between"
              >
                {/* Visual Frame Strip Representation */}
                <div className="w-full h-12 grid grid-cols-8 gap-0.5 opacity-40 overflow-hidden">
                  {[...Array(8)].map((_, i) => (
                    <div key={i} className="h-full bg-gradient-to-br from-primary/30 to-secondary/30" />
                  ))}
                </div>

                {/* Audio Waveform Sub-track */}
                <div className="w-full h-8 bg-surface-container-high/40 dark:bg-slate-900/60 px-2 flex items-center justify-between">
                  <svg className="w-full h-6 text-secondary/60" preserveAspectRatio="none" viewBox="0 0 500 24">
                    <path
                      d="M0,12 L10,6 L20,16 L30,4 L40,20 L50,8 L60,16 L70,5 L80,19 L90,8 L100,12 L120,4 L140,20 L160,8 L180,18 L200,12 L220,6 L240,18 L260,8 L280,16 L300,12 L320,4 L340,20 L360,9 L380,17 L400,12 L420,6 L440,18 L460,9 L480,15 L500,12 Z"
                      fill="currentColor"
                    />
                  </svg>
                </div>

                {/* Dimmed Left Out-of-Bounds Region */}
                {videoDuration > 0 && startTime > 0 && (
                  <div
                    className="absolute inset-y-0 left-0 bg-black/60 pointer-events-none z-10"
                    style={{ width: `${(startTime / videoDuration) * 100}%` }}
                  />
                )}

                {/* Dimmed Right Out-of-Bounds Region */}
                {videoDuration > 0 && endTime < videoDuration && (
                  <div
                    className="absolute inset-y-0 right-0 bg-black/60 pointer-events-none z-10"
                    style={{ width: `${((videoDuration - endTime) / videoDuration) * 100}%` }}
                  />
                )}

                {/* Active Highlight Frame */}
                {videoDuration > 0 && (
                  <div
                    className="absolute inset-y-0 border-2 border-primary rounded-xl pointer-events-none z-10"
                    style={{
                      left: `${(startTime / videoDuration) * 100}%`,
                      width: `${((endTime - startTime) / videoDuration) * 100}%`,
                    }}
                  />
                )}

                {/* Needle Playhead */}
                {videoDuration > 0 && (
                  <div
                    className="absolute inset-y-0 w-0.5 bg-rose-500 z-30 pointer-events-none flex flex-col items-center"
                    style={{ left: `${(currentTime / videoDuration) * 100}%` }}
                  >
                    <div className="w-3 h-3 rounded-full bg-rose-500 -mt-1 shadow-md" />
                  </div>
                )}
              </div>

              {/* Start / End Trim Sliders */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                <div className="flex flex-col gap-1">
                  <div className="flex justify-between text-xs text-on-surface-variant font-mono">
                    <span>Trim Start Time:</span>
                    <strong className="text-primary">{formatTime(startTime)}</strong>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max={endTime > 0 ? endTime - 0.1 : videoDuration}
                    step="0.1"
                    value={startTime}
                    onChange={(e) => setStartTime(parseFloat(e.target.value))}
                    className="w-full accent-primary h-1.5 bg-surface-container-high dark:bg-slate-800 rounded-full cursor-pointer"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <div className="flex justify-between text-xs text-on-surface-variant font-mono">
                    <span>Trim End Time:</span>
                    <strong className="text-primary">{formatTime(endTime || videoDuration)}</strong>
                  </div>
                  <input
                    type="range"
                    min={startTime + 0.1}
                    max={videoDuration || 100}
                    step="0.1"
                    value={endTime || videoDuration}
                    onChange={(e) => setEndTime(parseFloat(e.target.value))}
                    className="w-full accent-primary h-1.5 bg-surface-container-high dark:bg-slate-800 rounded-full cursor-pointer"
                  />
                </div>
              </div>
            </div>

            {/* Cut Segments Drawer (When Active) */}
            {activeTool === 'cut' && (
              <div className="mt-2 p-4 rounded-2xl bg-surface-container-low dark:bg-slate-950 border border-outline-variant/30 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-on-surface">Unwanted Segments to Splice & Remove:</span>
                  <button
                    type="button"
                    onClick={addCutSegment}
                    className="flex items-center gap-1 px-3 py-1 rounded-full bg-primary-container text-white text-xs font-semibold shadow-xs"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Cut Interval</span>
                  </button>
                </div>
                {cutSegments.length === 0 ? (
                  <p className="text-xs text-outline italic">No cut segments added yet.</p>
                ) : (
                  <div className="space-y-2">
                    {cutSegments.map((seg, idx) => (
                      <div
                        key={idx}
                        className="flex items-center gap-3 p-2 rounded-xl bg-surface-container-lowest dark:bg-slate-900 border border-outline-variant/20"
                      >
                        <span className="text-xs font-mono font-bold text-outline">#{idx + 1}</span>
                        <div className="flex items-center gap-2 text-xs">
                          <span className="text-on-surface-variant">Cut from:</span>
                          <input
                            type="number"
                            min="0"
                            max={seg.end}
                            step="0.1"
                            value={seg.start}
                            onChange={(e) => updateCutSegment(idx, 'start', parseFloat(e.target.value) || 0)}
                            className="w-20 px-2 py-1 rounded-lg bg-surface-container-low dark:bg-slate-800 font-mono text-xs focus:outline-none"
                          />
                          <span>s to</span>
                          <input
                            type="number"
                            min={seg.start}
                            max={videoDuration}
                            step="0.1"
                            value={seg.end}
                            onChange={(e) => updateCutSegment(idx, 'end', parseFloat(e.target.value) || 0)}
                            className="w-20 px-2 py-1 rounded-lg bg-surface-container-low dark:bg-slate-800 font-mono text-xs focus:outline-none"
                          />
                          <span>s</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => removeCutSegment(idx)}
                          className="ml-auto p-1.5 rounded-full hover:bg-rose-500/10 text-rose-500 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Crop Settings Drawer (When Active) */}
            {activeTool === 'crop' && (
              <div className="mt-2 p-4 rounded-2xl bg-surface-container-low dark:bg-slate-950 border border-outline-variant/30 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-on-surface">Crop Dimensions & Placement:</span>
                  <div className="flex items-center gap-1">
                    {(['16:9', '9:16', '1:1', '4:3'] as const).map((ratio) => (
                      <button
                        key={ratio}
                        type="button"
                        onClick={() => handleAspectRatioPreset(ratio)}
                        className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                          cropAspectRatio === ratio ? 'bg-primary text-white' : 'bg-surface-container dark:bg-slate-800 text-on-surface'
                        }`}
                      >
                        {ratio}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="grid grid-cols-4 gap-2 text-xs font-mono">
                  <div>
                    <label className="block text-outline text-[10px] mb-1">X Offset</label>
                    <input
                      type="number"
                      value={cropX}
                      onChange={(e) => setCropX(Math.max(0, parseInt(e.target.value, 10) || 0))}
                      className="w-full px-2 py-1 rounded-lg bg-surface-container-lowest dark:bg-slate-900 border border-outline-variant/30"
                    />
                  </div>
                  <div>
                    <label className="block text-outline text-[10px] mb-1">Y Offset</label>
                    <input
                      type="number"
                      value={cropY}
                      onChange={(e) => setCropY(Math.max(0, parseInt(e.target.value, 10) || 0))}
                      className="w-full px-2 py-1 rounded-lg bg-surface-container-lowest dark:bg-slate-900 border border-outline-variant/30"
                    />
                  </div>
                  <div>
                    <label className="block text-outline text-[10px] mb-1">Crop Width</label>
                    <input
                      type="number"
                      value={cropWidth}
                      onChange={(e) => setCropWidth(Math.max(2, parseInt(e.target.value, 10) || 2))}
                      className="w-full px-2 py-1 rounded-lg bg-surface-container-lowest dark:bg-slate-900 border border-outline-variant/30"
                    />
                  </div>
                  <div>
                    <label className="block text-outline text-[10px] mb-1">Crop Height</label>
                    <input
                      type="number"
                      value={cropHeight}
                      onChange={(e) => setCropHeight(Math.max(2, parseInt(e.target.value, 10) || 2))}
                      className="w-full px-2 py-1 rounded-lg bg-surface-container-lowest dark:bg-slate-900 border border-outline-variant/30"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Export Inspector & Dynamic Sizing Panel (Cols 9-12) */}
        <div className="lg:col-span-4 flex flex-col gap-space-md">
          <div className="w-full bg-surface-container-lowest dark:bg-slate-900 rounded-3xl p-space-md shadow-sm border border-outline-variant/30 flex flex-col gap-space-md">
            {/* Header */}
            <div className="flex items-center justify-between pb-1 border-b border-outline-variant/20">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-primary-fixed text-primary flex items-center justify-center font-bold">
                  <Sliders className="w-4 h-4" />
                </div>
                <h2 className="text-base font-bold text-on-surface">Export Settings</h2>
              </div>
              <span className="px-2.5 py-1 rounded-full bg-surface-container-low dark:bg-slate-800 text-on-surface-variant font-semibold text-xs">
                Web Ready
              </span>
            </div>

            {/* Container Format Pills */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-on-surface">Container Format</label>
              <div className="grid grid-cols-4 gap-1 p-1 bg-surface-container-low dark:bg-slate-800 rounded-2xl">
                {(['mp4', 'webm', 'mov', 'mkv'] as const).map((fmt) => (
                  <button
                    key={fmt}
                    type="button"
                    onClick={() => setTargetFormat(fmt)}
                    className={`py-2 rounded-xl text-xs font-bold uppercase transition-all ${
                      targetFormat === fmt
                        ? 'bg-surface-container-lowest dark:bg-slate-700 text-primary shadow-xs'
                        : 'text-on-surface-variant hover:text-on-surface'
                    }`}
                  >
                    {fmt}
                  </button>
                ))}
              </div>
            </div>

            {/* Resolution Target Cards */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-on-surface">Resolution Target</label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { id: '4k', label: '4K UHD', sub: '3840×2160' },
                  { id: '1080p', label: '1080p FHD', sub: '1920×1080 · Ideal' },
                  { id: '720p', label: '720p HD', sub: '1280×720 · Compact' },
                  { id: '480p', label: '480p SD', sub: '854×480 · Tiny' },
                ].map((res) => (
                  <button
                    key={res.id}
                    type="button"
                    onClick={() => setResolution(res.id)}
                    className={`p-2.5 rounded-2xl text-left flex flex-col transition-all border ${
                      resolution === res.id
                        ? 'bg-primary text-white border-primary shadow-xs'
                        : 'bg-surface-container-low dark:bg-slate-800 text-on-surface border-transparent hover:bg-surface-container'
                    }`}
                  >
                    <span className="text-xs font-bold">{res.label}</span>
                    <span className={`text-[11px] font-mono ${resolution === res.id ? 'text-primary-fixed' : 'text-outline'}`}>
                      {res.sub}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Quality Preset & Codec */}
            <div className="grid grid-cols-2 gap-2">
              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-on-surface">Quality Preset</label>
                <select
                  value={selectedPreset}
                  onChange={(e) => handlePresetChange(e.target.value)}
                  className="w-full h-10 px-3 bg-surface-container-low dark:bg-slate-800 rounded-xl text-on-surface text-xs font-semibold focus:outline-none"
                >
                  <option value="best">Best (Lossless-tier)</option>
                  <option value="high">High (Recommended)</option>
                  <option value="medium">Medium</option>
                  <option value="low">Low (Draft)</option>
                </select>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-on-surface">Video Codec</label>
                <select
                  value={videoCodec}
                  onChange={(e) => setVideoCodec(e.target.value)}
                  className="w-full h-10 px-3 bg-surface-container-low dark:bg-slate-800 rounded-xl text-on-surface text-xs font-semibold focus:outline-none"
                >
                  <option value="auto">Auto-detect</option>
                  <option value="h264">H.264 / AVC</option>
                  <option value="hevc">H.265 / HEVC</option>
                  <option value="av1">AV1</option>
                  <option value="vp9">VP9</option>
                </select>
              </div>
            </div>

            {/* Collapsible Bitrate & Audio Parameters */}
            <details className="group rounded-2xl bg-surface-container-low dark:bg-slate-800/60 overflow-hidden border border-outline-variant/20">
              <summary className="flex items-center justify-between px-3.5 py-3 cursor-pointer select-none text-xs font-bold text-on-surface">
                <span className="flex items-center gap-2">
                  <Sliders className="w-4 h-4 text-primary" />
                  <span>Bitrate & Audio Tuning</span>
                </span>
                <ChevronDown className="w-4 h-4 text-on-surface-variant transition-transform group-open:rotate-180" />
              </summary>
              <div className="p-3.5 pt-1 flex flex-col gap-3">
                {/* Video Bitrate */}
                <div className="flex flex-col gap-1">
                  <div className="flex justify-between text-xs">
                    <span className="text-on-surface-variant">Video Bitrate:</span>
                    <span className="font-mono text-primary font-bold">{videoBitrate}</span>
                  </div>
                  <input
                    type="range"
                    min="1000"
                    max="15000"
                    step="500"
                    value={parseInt(videoBitrate.replace('k', ''), 10) || 4500}
                    onChange={(e) => setVideoBitrate(`${e.target.value}k`)}
                    className="w-full h-1.5 accent-primary bg-surface-container-high dark:bg-slate-700 rounded-full cursor-pointer"
                  />
                </div>

                {/* Audio Stream */}
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[11px] text-on-surface-variant mb-1">Audio Bitrate</label>
                    <select
                      value={audioBitrate}
                      onChange={(e) => setAudioBitrate(e.target.value)}
                      className="w-full h-8 px-2 bg-surface-container-lowest dark:bg-slate-900 rounded-lg text-xs"
                    >
                      <option value="320k">320 kbps (Master)</option>
                      <option value="256k">256 kbps (Studio)</option>
                      <option value="192k">192 kbps (Standard)</option>
                      <option value="128k">128 kbps (Compact)</option>
                    </select>
                  </div>
                  <div className="flex items-center pt-4">
                    <label className="flex items-center gap-2 text-xs text-on-surface cursor-pointer">
                      <input
                        type="checkbox"
                        checked={stripAudio}
                        onChange={(e) => setStripAudio(e.target.checked)}
                        className="rounded accent-primary"
                      />
                      <span>Mute Audio</span>
                    </label>
                  </div>
                </div>
              </div>
            </details>

            {/* Output Size Estimation Card */}
            <div className="w-full bg-gradient-to-br from-surface-container-low to-surface-container dark:from-slate-800 dark:to-slate-800/60 rounded-3xl p-space-md flex flex-col gap-2 relative overflow-hidden border border-outline-variant/30">
              <div className="flex items-center justify-between">
                <span className="text-xs uppercase tracking-wider text-outline font-bold">Estimated Output Size</span>
                {sizeEstimate && sizeEstimate.reductionPercentage !== undefined && (
                  <span className="px-2.5 py-0.5 rounded-full bg-tertiary-fixed text-on-tertiary-fixed-variant font-mono text-xs font-bold flex items-center gap-1">
                    <TrendingDown className="w-3.5 h-3.5" />
                    <span>{sizeEstimate.reductionPercentage}% vs source</span>
                  </span>
                )}
              </div>

              <div className="flex items-baseline gap-2 pt-1">
                <span className="text-3xl font-extrabold text-on-surface tracking-tight font-mono">
                  {isEstimating ? (
                    <span className="animate-pulse">Calculating...</span>
                  ) : sizeEstimate ? (
                    sizeEstimate.formattedEstimate || sizeEstimate.formattedEstimatedSize
                  ) : (
                    '~42.8 MB'
                  )}
                </span>
                {selectedFile && (
                  <span className="text-on-surface-variant font-mono text-xs line-through">
                    {(selectedFile.size / (1024 * 1024)).toFixed(1)} MB
                  </span>
                )}
              </div>

              <p className="text-xs text-on-surface-variant leading-relaxed">
                Duration: <strong>{effectiveDuration.toFixed(1)}s</strong> · Target: <strong>{videoBitrate}</strong> {targetFormat.toUpperCase()}.
              </p>
            </div>

            {/* Error Message Alert */}
            {error && (
              <div className="p-3 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            {/* Progress & Actions */}
            <div className="flex flex-col gap-2 pt-1">
              {stage === 'IDLE' && (
                <button
                  type="button"
                  onClick={handleConvert}
                  disabled={!selectedFile}
                  className="w-full h-12 rounded-full bg-primary-container hover:bg-primary text-white font-semibold text-sm flex items-center justify-center gap-2 shadow-md shadow-primary/25 transition-all hover:scale-[1.01] active:scale-95 disabled:opacity-50"
                >
                  <Download className="w-4 h-4" />
                  <span>Export Trimmed Video</span>
                </button>
              )}

              {stage === 'UPLOADING' && (
                <div className="w-full h-12 rounded-full bg-primary-container/80 text-white font-semibold text-sm flex items-center justify-center gap-2">
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Uploading Media...</span>
                </div>
              )}

              {stage === 'PROCESSING' && (
                <div className="space-y-3">
                  <div className="w-full bg-surface-container dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                    <div
                      className="bg-primary h-full rounded-full transition-all duration-300"
                      style={{ width: `${progress ? (progress.percentage ?? progress.progressPercentage ?? 15) : 15}%` }}
                    />
                  </div>
                  <div className="flex items-center justify-between text-xs text-on-surface-variant font-mono">
                    <span>{progress ? (progress.stage || 'Transcoding video...') : 'Transcoding video...'}</span>
                    <span>{progress ? `${progress.percentage ?? progress.progressPercentage ?? 0}%` : 'Starting...'}</span>
                  </div>
                  <button
                    type="button"
                    onClick={handleCancel}
                    className="w-full h-10 rounded-full bg-surface-container-low hover:bg-surface-container text-rose-600 font-semibold text-xs transition-colors"
                  >
                    Cancel Conversion
                  </button>
                </div>
              )}

              {stage === 'COMPLETED' && (
                <div className="space-y-2">
                  <div className="p-3 rounded-2xl bg-tertiary-fixed/40 border border-tertiary/40 flex items-center gap-2 text-tertiary text-xs font-semibold">
                    <CheckCircle2 className="w-4 h-4 text-tertiary shrink-0" />
                    <span>Conversion complete! Pristine media ready for download.</span>
                  </div>
                  <a
                    href={outputFileId ? apiClient.getDownloadUrl(outputFileId) : '#'}
                    download
                    className="w-full h-12 rounded-full bg-tertiary-container hover:bg-tertiary text-white font-semibold text-sm flex items-center justify-center gap-2 shadow-md transition-all active:scale-95"
                  >
                    <Download className="w-4 h-4" />
                    <span>Download Converted Video</span>
                  </a>
                  <button
                    type="button"
                    onClick={() => {
                      setStage('IDLE');
                      setError(null);
                    }}
                    className="w-full h-10 rounded-full bg-surface-container-low text-on-surface text-xs font-semibold hover:bg-surface-container transition-colors"
                  >
                    Edit Another
                  </button>
                </div>
              )}

              {stage === 'FAILED' && (
                <button
                  type="button"
                  onClick={() => setStage('IDLE')}
                  className="w-full h-11 rounded-full bg-surface-container-low hover:bg-surface-container text-on-surface font-semibold text-xs transition-colors"
                >
                  Try Again
                </button>
              )}

              <div className="flex items-center justify-center gap-1.5 text-center text-on-surface-variant text-xs pt-1">
                <Shield className="w-3.5 h-3.5 text-tertiary" />
                <span>Zero Database · 24-Hour Ephemeral Retention</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
