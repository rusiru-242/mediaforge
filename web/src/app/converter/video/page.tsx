'use client';

import { useTrimmedPlayback } from '@/hooks/useTrimmedPlayback';
import { useNavigationGuard } from '@/hooks/useNavigationGuard';
import { ClearWorkspaceButton } from '@/components/editor/ClearWorkspaceButton';
import { TrimHandles } from '@/components/editor/TrimHandles';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import Link from 'next/link';
import {
  Film,
  Play,
  Pause,
  RotateCcw,
  RotateCw,
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
  Layers,
  ChevronDown,
  Sparkles,
} from 'lucide-react';
import { apiClient } from '@/services/apiClient';
import { JobResponse, ConversionProgressResponse } from '@/types/api';
import { clampCrop, zoomCrop, CropRect } from '@/utils/videoCrop';
import { useAudioPreview } from '@/hooks/useAudioPreview';
import { AUDIO_EFFECTS, AudioEffect } from '@/utils/audioEffects';
import { IMAGE_FILTERS } from '@/utils/imageFilters';


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
  const [exportMode, setExportMode] = useState<'video' | 'audio'>('video');
  const [audioFormat, setAudioFormat] = useState('mp3');
  const [downloaded, setDownloaded] = useState(false);
  const [exportKey, setExportKey] = useState<string | null>(null);
  const outputFormat = exportMode === 'audio' ? audioFormat : targetFormat;
  const [resolution, setResolution] = useState('1080p');
  const [videoBitrate, setVideoBitrate] = useState('8000k');
  const [audioBitrate, setAudioBitrate] = useState('256k');
  const [audioEffects, setAudioEffects] = useState<AudioEffect[]>([]);
  const [audioEffectLevels, setAudioEffectLevels] = useState<Partial<Record<AudioEffect, number>>>({});
  const [stripAudio, setStripAudio] = useState(false);
  const [videoFilter, setVideoFilter] = useState<string>('original');
  const colorFilter = IMAGE_FILTERS.find(filter => filter.id === videoFilter) ?? IMAGE_FILTERS[0];

  // Active Tool Mode in Workspace
  const [activeTool, setActiveTool] = useState<'select' | 'crop'>('select');

  // Trim & Cut
  const [startTime, setStartTime] = useState<number>(0);
  const [endTime, setEndTime] = useState<number>(0);

  // Crop
  const [cropAspectRatio, setCropAspectRatio] = useState<string>('original');
  const [cropMenuOpen, setCropMenuOpen] = useState(false);
  const cropMenuButton = useRef<HTMLButtonElement | null>(null);
  const [cropX, setCropX] = useState<number>(0);
  const [cropY, setCropY] = useState<number>(0);
  const [cropWidth, setCropWidth] = useState<number>(0);
  const [cropHeight, setCropHeight] = useState<number>(0);

  // Advanced Quality & Audio
  const crf = 20;
  const videoCodec = 'auto';
  const [frameRate, setFrameRate] = useState<number | undefined>(undefined);
  const [volume, setVolume] = useState<number>(1.0);
  const [removeSilence, setRemoveSilence] = useState<boolean>(false);

  // Stages & Job Tracking
  const [stage, setStage] = useState<'IDLE' | 'UPLOADING' | 'PROCESSING' | 'COMPLETED' | 'FAILED' | 'CANCELLED'>('IDLE');
  const [error, setError] = useState<string | null>(null);
  const [currentJob, setCurrentJob] = useState<JobResponse | null>(null);
  const [progress, setProgress] = useState<ConversionProgressResponse | null>(null);
  const [outputFileId, setOutputFileId] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const audioPreview = useAudioPreview(videoRef, previewUrl, { effects: stripAudio && exportMode === 'video' ? [] : audioEffects, levels: audioEffectLevels, volume: stripAudio && exportMode === 'video' ? 0 : volume, start: startTime, end: endTime, fadeIn: 0, fadeOut: 0 });
  const playback = useTrimmedPlayback(videoRef, previewUrl, startTime, endTime, videoDuration, setCurrentTime, setIsPlaying);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const cropDrag = useRef<{clientX: number; clientY: number; rect: CropRect; scaleX: number; scaleY: number; resize?: boolean} | null>(null);
  const settingsKey = JSON.stringify({ selectedFile: selectedFile && [selectedFile.name, selectedFile.size, selectedFile.lastModified],
    exportMode, outputFormat, resolution, videoBitrate, audioBitrate, stripAudio, startTime, endTime,
    cropX, cropY, cropWidth, cropHeight, crf, videoCodec, frameRate, volume, removeSilence, audioEffects, audioEffectLevels, videoFilter });
  const isProcessing = stage === 'UPLOADING' || stage === 'PROCESSING';
  const hasUnsavedWork = Boolean(selectedFile && (!downloaded || settingsKey !== exportKey));
  useNavigationGuard(isProcessing || hasUnsavedWork, isProcessing
    ? 'Your video is uploading or processing. Leave this page?'
    : 'This clip has unsaved work. Leave this page and discard it?');
  useEffect(() => {
    if (stage === 'COMPLETED' && exportKey !== settingsKey) {
      setStage('IDLE'); setOutputFileId(null); setDownloaded(false);
    }
  }, [settingsKey, exportKey, stage]);

  const updateCrop = (rect: CropRect) => {
    if (!videoWidth || !videoHeight) return;
    const next = clampCrop(rect, videoWidth, videoHeight);
    setCropX(next.x); setCropY(next.y); setCropWidth(next.width); setCropHeight(next.height);
  };
  const cropRatio = cropAspectRatio === 'original' ? videoWidth / videoHeight
    : cropAspectRatio === 'custom' ? cropWidth / cropHeight
    : Number(cropAspectRatio.split(':')[0]) / Number(cropAspectRatio.split(':')[1]);
  const cropZoom = cropWidth > 0 && Number.isFinite(cropRatio)
    ? Math.max(100, Math.round(Math.min(videoWidth, videoHeight * cropRatio) / cropWidth * 100)) : 100;
  const handleCropZoom = (percent: number) => updateCrop(zoomCrop(
    { x: cropX, y: cropY, width: cropWidth, height: cropHeight }, videoWidth, videoHeight, percent, cropRatio));

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
    setCropAspectRatio('original');
  };

  const togglePlay = async () => {
    if (!videoRef.current) return;
    if (isPlaying) {
      videoRef.current.pause();
      setIsPlaying(false);
    } else {
      if (videoRef.current.currentTime < startTime || (endTime > 0 && videoRef.current.currentTime >= endTime)) {
        videoRef.current.currentTime = startTime;
      }
      if (typeof AudioContext !== 'undefined') await audioPreview.start();
      await videoRef.current.play();
      setIsPlaying(true);
    }
  };

  const seekRelative = (seconds: number) => {
    if (!videoRef.current) return;
    playback.seek(videoRef.current.currentTime + seconds);
  };

  const handleTimelineScrub = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!videoRef.current || videoDuration <= 0) return;
    const rect = e.currentTarget.getBoundingClientRect();
    if (rect.width <= 0) return;
    const pos = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    playback.seek(pos * videoDuration);
  };

  const formatTime = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    const ms = Math.floor((sec % 1) * 100);
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}.${String(ms).padStart(2, '0')}`;
  };

  const handleAspectRatioPreset = (preset: string) => {
    setCropAspectRatio(preset); setActiveTool('crop');
    if (!videoWidth || !videoHeight || preset === 'custom') return;
    let width = videoWidth, height = videoHeight;
    if (preset !== 'original') {
      const [rw, rh] = preset.split(':').map(Number);
      const ratio = rw / rh;
      if (videoWidth / videoHeight > ratio) width = videoHeight * ratio;
      else height = videoWidth / ratio;
    }
    updateCrop({ x: (videoWidth - width) / 2, y: (videoHeight - height) / 2, width, height });
  };

  const effectiveDuration = Math.max(0, (endTime || videoDuration) - startTime);

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
    setExportKey(settingsKey);
    setDownloaded(false);
    setCurrentJob(null);
    setProgress(null);
    setOutputFileId(null);

    try {
      const uploadResp = await apiClient.uploadFile(selectedFile);
      setStage('PROCESSING');
      const inputFormat = selectedFile.name.split('.').pop()?.toLowerCase();

      const hasTrim = startTime > 0 || (endTime > 0 && endTime < videoDuration);
      const hasCropConfig =
        exportMode === 'video' &&
        cropWidth > 0 &&
        cropHeight > 0 &&
        (cropWidth !== videoWidth || cropHeight !== videoHeight || cropX > 0 || cropY > 0);

      const job = await apiClient.createConversionJob({
        inputFileId: uploadResp.id || uploadResp.fileId,
        inputFormat,
        outputFormat,
        qualityPreset: undefined,
        brightness: exportMode === 'video' ? colorFilter.brightness : undefined,
        contrast: exportMode === 'video' ? colorFilter.contrast : undefined,
        saturation: exportMode === 'video' ? colorFilter.saturation : undefined,
        warmth: exportMode === 'video' ? colorFilter.warmth : undefined,
        targetResolution: exportMode === 'video' && resolution !== 'source' ? resolution : undefined,
        videoBitrate: exportMode === 'video' && videoBitrate !== 'auto' ? videoBitrate : undefined,
        audioBitrate: outputFormat !== 'wav' && audioBitrate !== 'auto' ? parseInt(audioBitrate.replace('k', ''), 10) : undefined,
        stripAudio: exportMode === 'video' ? stripAudio : false,
        startTime: hasTrim && startTime > 0 ? startTime : undefined,
        endTime: hasTrim && endTime > 0 ? endTime : undefined,
        cropX: hasCropConfig ? cropX : undefined,
        cropY: hasCropConfig ? cropY : undefined,
        cropWidth: hasCropConfig ? cropWidth : undefined,
        cropHeight: hasCropConfig ? cropHeight : undefined,
        aspectRatio: undefined, // Explicit crop coordinates are the authoritative rectangle.
        crf: exportMode === 'video' ? crf : undefined,
        videoCodec: exportMode === 'video' && videoCodec !== 'auto' ? videoCodec : undefined,
        frameRate: exportMode === 'video' && frameRate && frameRate > 0 ? frameRate : undefined,
        volume: volume !== 1.0 ? volume : undefined,
        removeSilence: removeSilence ? true : undefined,
        audioEffects: exportMode === 'video' && stripAudio ? [] : audioEffects,
        audioEffectLevels,
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

    if (videoRef.current) {
      videoRef.current.currentTime = 0;
      setCurrentTime(0);
    }
  };

  const removeClip = () => {
    if (isProcessing) return;
    videoRef.current?.pause();
    cleanupPolling();
    setSelectedFile(null); setCurrentTime(0); setIsPlaying(false); setVideoFilter('original');
    setVideoDuration(0); setVideoWidth(0); setVideoHeight(0);
    setStartTime(0); setEndTime(0); setCropX(0); setCropY(0);
    setCropWidth(0); setCropHeight(0); setCropAspectRatio('original');
    setCropMenuOpen(false); setActiveTool('select');
    setAudioEffects([]); setAudioEffectLevels({}); setVolume(1); setStripAudio(false);
    setStage('IDLE'); setError(null); setCurrentJob(null); setProgress(null);
    setOutputFileId(null); setDownloaded(false); setExportKey(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && !isProcessing) {
      removeClip();
      setSelectedFile(file);
    }
    e.target.value = '';
  };

  return (
    <div className="video-editor w-full max-w-7xl mx-auto px-gutter py-space-md flex flex-col gap-space-md text-slate-900 dark:text-slate-100">
      {/* Top Workspace Status Bar */}
      <div className="w-full bg-surface-container-lowest dark:bg-slate-900 rounded-2xl p-space-sm sm:px-space-md shadow-sm border border-outline-variant/30 flex flex-wrap items-center justify-between gap-space-sm">
        <div className="flex items-center gap-space-sm flex-wrap min-w-0">
          <div className="flex items-center gap-1.5 text-on-surface-variant dark:text-slate-200 font-medium text-xs">
            <Film className="w-4 h-4 text-primary dark:text-violet-200" />
            <Link href="/" className="hover:text-on-surface transition-colors">
              Studio
            </Link>
            <span className="text-outline-variant dark:text-slate-500">/</span>
            <span className="font-semibold text-on-surface dark:text-slate-100 truncate max-w-[220px] sm:max-w-xs">
              {selectedFile ? selectedFile.name : 'No video selected'}
            </span>
          </div>
          {selectedFile && videoDuration > 0 && (
            <div className="hidden lg:flex items-center gap-1.5 px-3 py-1 rounded-full bg-surface-container-low dark:bg-slate-800 text-on-surface-variant dark:text-slate-200 font-mono text-xs">
              <span className="w-1.5 h-1.5 rounded-full bg-tertiary-container animate-pulse" />
              <span>
                {videoWidth}×{videoHeight} · {formatTime(videoDuration)}
              </span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2">
          <button
            type="button"
            onClick={handleResetTrims}
            disabled={!selectedFile}
            className="px-3 h-8 rounded-full bg-surface-container-low dark:bg-slate-800 text-on-surface-variant dark:text-slate-200 font-semibold text-xs hover:bg-surface-container hover:text-on-surface transition-colors flex items-center gap-1.5 disabled:opacity-40 dark:disabled:opacity-100 dark:disabled:text-slate-400"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Reset Trims</span>
          </button>

          <label className="px-3.5 h-8 rounded-full bg-primary-fixed text-on-primary-fixed-variant dark:bg-slate-800 dark:text-violet-200 font-semibold text-xs hover:bg-primary-fixed/80 dark:hover:bg-slate-700 transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs">
            <Upload className="w-3.5 h-3.5" />
            <span>{selectedFile ? 'Replace File' : 'Choose Video'}</span>
            <input
              ref={fileInputRef}
              type="file"
              accept="video/*,.mp4,.mkv,.webm,.avi,.mov,.flv,.m4v"
              onChange={handleFileChange}
              disabled={isProcessing}
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
            <div className="relative w-full aspect-video bg-slate-50 dark:bg-slate-900 flex items-center justify-center overflow-hidden">
              {previewUrl ? (
                <video
                  ref={videoRef}
                  src={previewUrl}
                  style={{ filter: `brightness(${1 + colorFilter.brightness}) contrast(${colorFilter.contrast}) saturate(${colorFilter.saturation}) sepia(${Math.abs(colorFilter.warmth) * 0.3}) hue-rotate(${colorFilter.warmth < 0 ? 180 : 0}deg)` }}
                  onLoadedMetadata={handleLoadedMetadata}
                  
                  className="w-full h-full object-contain"
                  playsInline
                />
              ) : (
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="flex flex-col items-center justify-center text-center p-8 cursor-pointer hover:opacity-90 transition-opacity"
                >
                  <div className="w-16 h-16 rounded-full bg-violet-100 dark:bg-violet-500/20 text-primary dark:text-violet-200 flex items-center justify-center mb-4">
                    <Upload className="w-8 h-8" />
                  </div>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 mb-1">Click to Upload Video</h3>
                  <p className="text-xs text-slate-600 dark:text-slate-300 max-w-sm">
                    Drop MP4, MKV, WebM, MOV, or AVI files here to begin editing and trimming locally.
                  </p>
                </div>
              )}

              {previewUrl && videoWidth > 0 && videoHeight > 0 && activeTool === 'crop' && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="relative overflow-hidden" style={{width: videoWidth / videoHeight >= 16 / 9 ? '100%' : `${videoWidth / videoHeight / (16 / 9) * 100}%`, height: videoWidth / videoHeight >= 16 / 9 ? `${(16 / 9) / (videoWidth / videoHeight) * 100}%` : '100%'}}>
                    <div role="region" aria-label="Crop selection" className="absolute border-2 border-white outline outline-2 outline-violet-500 cursor-move pointer-events-auto touch-none z-10"
                      style={{left: `${cropX / videoWidth * 100}%`, top: `${cropY / videoHeight * 100}%`, width: `${cropWidth / videoWidth * 100}%`, height: `${cropHeight / videoHeight * 100}%`, boxShadow: '0 0 0 9999px rgba(0,0,0,0.55)'}}
                      onPointerDown={e => { const bounds = e.currentTarget.parentElement!.getBoundingClientRect(); if (!bounds.width || !bounds.height) return; e.currentTarget.setPointerCapture(e.pointerId); cropDrag.current = {clientX: e.clientX, clientY: e.clientY, rect: {x: cropX, y: cropY, width: cropWidth, height: cropHeight}, scaleX: videoWidth / bounds.width, scaleY: videoHeight / bounds.height}; }}
                      onPointerMove={e => { const drag = cropDrag.current; if (drag) updateCrop(drag.resize ? {...drag.rect, width: Math.min(videoWidth - drag.rect.x, drag.rect.width + (e.clientX - drag.clientX) * drag.scaleX), height: Math.min(videoHeight - drag.rect.y, drag.rect.height + (e.clientY - drag.clientY) * drag.scaleY)} : {...drag.rect, x: drag.rect.x + (e.clientX - drag.clientX) * drag.scaleX, y: drag.rect.y + (e.clientY - drag.clientY) * drag.scaleY}); }}
                      onPointerUp={() => { cropDrag.current = null; }} onPointerCancel={() => { cropDrag.current = null; }}
                    >{cropAspectRatio === 'custom' && <button type="button" aria-label="Resize custom crop" className="absolute bottom-0 right-0 w-5 h-5 bg-violet-500 border-2 border-white cursor-nwse-resize touch-none"
                      onPointerDown={e => { e.preventDefault(); e.stopPropagation(); const bounds = e.currentTarget.parentElement!.parentElement!.getBoundingClientRect(); if (!bounds.width || !bounds.height) return; e.currentTarget.setPointerCapture(e.pointerId); cropDrag.current = {clientX: e.clientX, clientY: e.clientY, rect: {x: cropX, y: cropY, width: cropWidth, height: cropHeight}, scaleX: videoWidth / bounds.width, scaleY: videoHeight / bounds.height, resize: true}; }} />}</div>
                  </div>
                </div>
              )}
              {/* Floating Top Badges */}
              {previewUrl && (
                <div className="absolute top-4 left-4 flex items-center gap-2 z-10 pointer-events-none">
                  <span className="px-2.5 py-1 rounded-full bg-surface-container-lowest/80 backdrop-blur-md text-on-surface dark:text-slate-100 font-semibold text-xs shadow-sm">
                    {cropAspectRatio} {activeTool === 'crop' ? 'Crop' : 'Aspect'}
                  </span>
                </div>
              )}

              {/* Big Centered Play/Pause Overlay */}
              {previewUrl && activeTool !== 'crop' && (
                <button
                  type="button"
                  onClick={togglePlay}
                  className="absolute z-20 w-16 h-16 rounded-full bg-surface-container-lowest/90 text-primary dark:text-violet-200 flex items-center justify-center shadow-xl hover:scale-105 active:scale-95 transition-all focus:outline-none"
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
                          type="range" disabled={!selectedFile}
                          min="0"
                          max="1.5"
                          step="0.05"
                          value={volume}
                          onChange={(e) => {
                            const val = parseFloat(e.target.value);
                            setVolume(val);
                            if (videoRef.current && typeof AudioContext === 'undefined') videoRef.current.volume = Math.min(1, val);
                          }}
                          className="w-14 h-1 accent-primary dark:accent-violet-400 bg-white/30 rounded-full cursor-pointer hidden sm:block"
                        />
                      </div>
                      <button ref={cropMenuButton} type="button" aria-label="Crop options" aria-controls="video-crop-options" aria-expanded={cropMenuOpen}
                        onClick={() => { setCropMenuOpen(!cropMenuOpen); setActiveTool('crop'); }}
                        className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/10 hover:bg-white/20 text-white text-xs font-semibold transition-colors">
                        <CropIcon className="w-3.5 h-3.5" />
                        <span>{cropAspectRatio === 'original' ? 'Original' : cropAspectRatio === 'custom' ? 'Custom' : cropAspectRatio}</span>
                        <ChevronDown className={`w-3.5 h-3.5 transition-transform ${cropMenuOpen ? 'rotate-180' : ''}`} />
                      </button>
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
                  onClick={() => { setActiveTool('select'); setCropMenuOpen(false); }}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
                    activeTool === 'select'
                      ? 'bg-surface-container-lowest dark:bg-slate-700 text-on-surface dark:text-slate-100 shadow-xs'
                      : 'text-on-surface-variant dark:text-slate-200 hover:text-on-surface'
                  }`}
                >
                  <Film className="w-3.5 h-3.5 text-primary dark:text-violet-200" />
                  <span>Select Range</span>
                </button>

                <button
                  type="button"
                  onClick={() => { setActiveTool('crop'); setCropMenuOpen(true); }}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
                    activeTool === 'crop'
                      ? 'bg-surface-container-lowest dark:bg-slate-700 text-on-surface dark:text-slate-100 shadow-xs'
                      : 'text-on-surface-variant dark:text-slate-200 hover:text-on-surface'
                  }`}
                >
                  <CropIcon className="w-3.5 h-3.5 text-primary dark:text-violet-200" />
                  <span>Crop Canvas</span>
                </button>
              </div>

              <div className="flex items-center gap-2 font-mono text-xs">
                <span className="px-3 py-1.5 rounded-full bg-primary-fixed text-on-primary-fixed-variant dark:bg-violet-500/20 dark:text-violet-200 font-bold">
                  Effective: {effectiveDuration.toFixed(1)}s
                </span>
              </div>
            </div>

            {/* Crop Settings Drawer (When Active) */}
            {cropMenuOpen && previewUrl && (
              <div id="video-crop-options" role="region" aria-label="Crop options panel" onKeyDown={e => { if (e.key === 'Escape') { setCropMenuOpen(false); cropMenuButton.current?.focus(); } }} className="mt-2 p-4 rounded-2xl bg-surface-container-low dark:bg-slate-950 border border-outline-variant/30 space-y-3">
                <div className="flex flex-col gap-3">
                  <span className="text-xs font-bold text-on-surface dark:text-slate-100">Crop Dimensions & Placement:</span>
                  <div className="flex flex-wrap items-center gap-2">
                    {(['original', '16:9', '9:16', '1:1', '4:3', '3:4', '4:5', '3:2', '2:3', '21:9', 'custom'] as const).map((ratio) => (
                      <button
                        key={ratio}
                        type="button"
                        onClick={() => handleAspectRatioPreset(ratio)}
                        className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                          cropAspectRatio === ratio ? 'bg-primary text-white' : 'bg-surface-container dark:bg-slate-800 text-on-surface dark:text-slate-100'
                        }`}
                      >
                        {ratio === 'original' ? 'Original' : ratio === 'custom' ? 'Custom' : ratio}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="flex flex-col gap-2">
                  <div className="flex items-center justify-between text-xs font-semibold text-on-surface dark:text-slate-100">
                    <label htmlFor="crop-zoom">Zoom</label>
                    <div className="flex items-center gap-3">
                      <span className="font-mono">{cropZoom}%</span>
                      <button type="button" onClick={() => handleCropZoom(100)} className="text-primary dark:text-violet-200">Reset zoom</button>
                    </div>
                  </div>
                  <input id="crop-zoom" type="range" disabled={!selectedFile} min="100" max={Math.max(300, cropZoom)} step="1" value={cropZoom}
                    aria-valuetext={`${cropZoom} percent`} onChange={e => handleCropZoom(Number(e.target.value))}
                    className="w-full h-2 accent-primary dark:accent-violet-400 rounded-full cursor-pointer" />
                  <p className="text-xs text-on-surface-variant dark:text-slate-200">Drag the crop area in the preview to reposition it.</p>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                  <div>
                    <label className="block text-outline dark:text-slate-300 text-[10px] mb-1">Crop Width</label>
                    <input
                      type="number"
                      value={cropWidth}
                      aria-label="Crop width"
                      readOnly={cropAspectRatio !== 'custom'}
                      step="2"
                      onChange={(e) => updateCrop({ x: cropX, y: cropY, width: Number(e.target.value), height: cropHeight })}
                      className="w-full px-2 py-1 rounded-lg bg-surface-container-lowest dark:bg-slate-900 border border-outline-variant/30"
                    />
                  </div>
                  <div>
                    <label className="block text-outline dark:text-slate-300 text-[10px] mb-1">Crop Height</label>
                    <input
                      type="number"
                      value={cropHeight}
                      aria-label="Crop height"
                      readOnly={cropAspectRatio !== 'custom'}
                      step="2"
                      onChange={(e) => updateCrop({ x: cropX, y: cropY, width: cropWidth, height: Number(e.target.value) })}
                      className="w-full px-2 py-1 rounded-lg bg-surface-container-lowest dark:bg-slate-900 border border-outline-variant/30"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Visual Timeline Canvas Area */}
            {activeTool === 'select' && <div className="w-full flex flex-col gap-2 pt-2">
              {/* Ruler */}
              <div className="relative w-full h-5 font-mono text-[11px] text-on-surface-variant dark:text-slate-200 flex justify-between px-1 select-none">
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
                    <div key={i} className="h-full bg-gradient-to-br from-primary/30 to-secondary/30 dark:from-violet-400/40 dark:to-sky-400/40" />
                  ))}
                </div>

                {/* Audio Waveform Sub-track */}
                <div className="w-full h-8 bg-surface-container-high/40 dark:bg-slate-900/60 px-2 flex items-center justify-between">
                  <svg className="w-full h-6 text-secondary/60 dark:text-sky-400/80" preserveAspectRatio="none" viewBox="0 0 500 24">
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
                <TrimHandles duration={videoDuration} start={startTime} end={endTime || videoDuration}
                  onStartChange={setStartTime} onEndChange={setEndTime} />
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
                  <div className="flex justify-between text-xs text-on-surface-variant dark:text-slate-200 font-mono">
                    <span>Trim Start Time:</span>
                    <strong className="text-primary dark:text-violet-200">{formatTime(startTime)}</strong>
                  </div>
                  <input
                    type="range" disabled={!selectedFile}
                    min="0"
                    max={endTime > 0 ? endTime - 0.1 : videoDuration}
                    step="0.1"
                    value={startTime}
                    onChange={(e) => setStartTime(parseFloat(e.target.value))}
                    className="w-full accent-primary dark:accent-violet-400 h-1.5 bg-surface-container-high dark:bg-slate-800 rounded-full cursor-pointer"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <div className="flex justify-between text-xs text-on-surface-variant dark:text-slate-200 font-mono">
                    <span>Trim End Time:</span>
                    <strong className="text-primary dark:text-violet-200">{formatTime(endTime || videoDuration)}</strong>
                  </div>
                  <input
                    type="range" disabled={!selectedFile}
                    min={startTime + 0.1}
                    max={videoDuration || 100}
                    step="0.1"
                    value={endTime || videoDuration}
                    onChange={(e) => setEndTime(parseFloat(e.target.value))}
                    className="w-full accent-primary dark:accent-violet-400 h-1.5 bg-surface-container-high dark:bg-slate-800 rounded-full cursor-pointer"
                  />
                </div>
              </div>
            </div>}


          </div>
        </div>

        {/* Right Export Inspector & Dynamic Sizing Panel (Cols 9-12) */}
        <div className="lg:col-span-4 flex flex-col gap-space-md">
          <div className="w-full bg-surface-container-lowest dark:bg-slate-900 rounded-3xl p-space-md shadow-sm border border-outline-variant/30 flex flex-col gap-space-md">
            {/* Header */}
            <div className="flex items-center justify-between pb-1 border-b border-outline-variant/20">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-primary-fixed dark:bg-violet-950 text-primary dark:text-violet-200 flex items-center justify-center font-bold">
                  <Sliders className="w-4 h-4" />
                </div>
                <h2 className="text-base font-bold text-on-surface dark:text-slate-100">Export Settings</h2>
              </div>
              <span className="px-2.5 py-1 rounded-full bg-surface-container-low dark:bg-slate-800 text-on-surface-variant dark:text-slate-200 font-semibold text-xs">
                Web Ready
              </span>
            </div>

            <ClearWorkspaceButton disabled={!selectedFile || isProcessing} onClear={removeClip} />

            {exportMode === 'video' && <div className="rounded-2xl bg-surface-container-low dark:bg-slate-800 p-4 space-y-3">
              <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Video Filters</h3>
              <div className="flex flex-wrap gap-2">{IMAGE_FILTERS.map(filter => (
                <button key={filter.id} type="button" disabled={!selectedFile || isProcessing}
                  aria-pressed={videoFilter === filter.id} onClick={() => setVideoFilter(filter.id)}
                  className={`rounded-full px-3 py-2 text-xs font-semibold disabled:opacity-40 ${videoFilter === filter.id ? 'bg-primary-container text-white' : 'bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100'}`}>
                  {filter.label}
                </button>
              ))}</div>
            </div>}


            <div className="grid grid-cols-2 gap-2" aria-label="Export type">
              {(['video', 'audio'] as const).map(mode => <button key={mode} type="button" aria-pressed={exportMode === mode}
                onClick={() => setExportMode(mode)} className={`rounded-full px-4 py-2 text-sm font-semibold ${exportMode === mode ? 'bg-primary-container text-white' : 'bg-surface-container-low dark:bg-slate-800 text-on-surface dark:text-slate-100'}`}>
                {mode === 'audio' ? 'Export Audio' : 'Export Video'}
              </button>)}
            </div>
            {/* Container Format Pills */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-on-surface dark:text-slate-100">{exportMode === 'audio' ? 'Audio Format' : 'Container Format'}</label>
              <div className={`grid ${exportMode === 'audio' ? 'grid-cols-3' : 'grid-cols-5'} gap-1 p-1 bg-surface-container-low dark:bg-slate-800 rounded-2xl`}>
                {(exportMode === 'audio' ? ['mp3', 'm4a', 'wav'] : ['mp4', 'webm', 'mov', 'mkv', 'avi']).map((fmt) => (
                  <button
                    key={fmt}
                    type="button"
                    onClick={() => exportMode === 'audio' ? setAudioFormat(fmt) : setTargetFormat(fmt)}
                    className={`py-2 rounded-xl text-xs font-bold uppercase transition-all ${
                      outputFormat === fmt
                        ? 'bg-surface-container-lowest dark:bg-slate-700 text-primary dark:text-violet-200 shadow-xs'
                        : 'text-on-surface-variant dark:text-slate-200 hover:text-on-surface'
                    }`}
                  >
                    {fmt}
                  </button>
                ))}
              </div>
            </div>

            {exportMode === 'video' && <div className="flex flex-col gap-space-md">
            <div className="flex flex-col gap-2">
              <label htmlFor="video-export-quality" className="text-xs font-semibold text-on-surface dark:text-slate-100">Output Resolution</label>
              <select id="video-export-quality" disabled={isProcessing} value={resolution} onChange={e => {
                const value = e.target.value; setResolution(value);
                const bitrates: Record<string, string> = { '144p': '200k', '240p': '400k', '360p': '800k', '480p': '1500k', '720p': '4000k', '1080p': '8000k', '1440p': '16000k', '2160p': '32000k', source: '8000k' };
                setVideoBitrate(bitrates[value]);
              }}
                className="w-full h-11 px-4 bg-surface-container-low dark:bg-slate-800 rounded-xl text-on-surface dark:text-slate-100 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-primary-container">
                <option value="source">Original resolution</option>
                {[144, 240, 360, 480, 720, 1080, 1440, 2160].map(height => (
                  <option key={height} value={`${height}p`}>{height === 2160 ? '4K (2160p)' : `${height}p`}</option>
                ))}
              </select>
              <p className="text-xs text-slate-600 dark:text-slate-300">Maintains the clip aspect ratio. Enlarging a lower-resolution source does not restore detail.</p>
            </div>

            {/* Collapsible Bitrate & Audio Parameters */}
            <details className="group rounded-2xl bg-surface-container-low dark:bg-slate-800/60 overflow-hidden border border-outline-variant/20">
              <summary className="flex items-center justify-between px-3.5 py-3 cursor-pointer select-none text-xs font-bold text-on-surface dark:text-slate-100">
                <span className="flex items-center gap-2">
                  <Sliders className="w-4 h-4 text-primary dark:text-violet-200" />
                  <span>Bitrate & Audio Tuning</span>
                </span>
                <ChevronDown className="w-4 h-4 text-on-surface-variant dark:text-slate-200 transition-transform group-open:rotate-180" />
              </summary>
              <div className="p-3.5 pt-1 flex flex-col gap-3">
                {/* Video Bitrate */}
                <div className="flex flex-col gap-1">
                  <div className="flex justify-between text-xs">
                    <span className="text-on-surface-variant dark:text-slate-200">Video Bitrate:</span>
                    <span className="font-mono text-primary dark:text-violet-200 font-bold">{videoBitrate}</span>
                  </div>
                  <input
                    type="range" disabled={!selectedFile}
                    min="100"
                    max="50000"
                    step="100"
                    value={parseInt(videoBitrate.replace('k', ''), 10) || 4500}
                    onChange={(e) => setVideoBitrate(`${e.target.value}k`)}
                    className="w-full h-1.5 accent-primary dark:accent-violet-400 bg-surface-container-high dark:bg-slate-700 rounded-full cursor-pointer"
                  />
                </div>

                {/* Audio Stream */}
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[11px] text-on-surface-variant dark:text-slate-200 mb-1">Audio Bitrate</label>
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
                    <label className="flex items-center gap-2 text-xs text-on-surface dark:text-slate-100 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={stripAudio}
                        onChange={(e) => setStripAudio(e.target.checked)}
                        className="rounded accent-primary dark:accent-violet-400"
                      />
                      <span>Mute Audio</span>
                    </label>
                  </div>
                </div>
              </div>
            </details>

            </div>}
            {exportMode === 'audio' && audioFormat !== 'wav' && (
              <label className="text-xs font-semibold text-on-surface dark:text-slate-100">Audio Bitrate
                <select aria-label="Export audio bitrate" value={audioBitrate} onChange={e => setAudioBitrate(e.target.value)} className="block w-full mt-2 p-3 rounded-xl bg-surface-container-low dark:bg-slate-800">
                  {['128k', '192k', '256k', '320k'].map(value => <option key={value} value={value}>{value.replace('k', ' kbps')}</option>)}
                </select>
              </label>
            )}
            {!(exportMode === 'video' && stripAudio) && (<div className="rounded-2xl bg-surface-container-low dark:bg-slate-800/60 p-4 border border-outline-variant/20 space-y-3">
              <div className="flex items-center justify-between"><h3 className="text-sm font-bold text-on-surface dark:text-slate-100">Audio Effects</h3>
                <button type="button" disabled={!selectedFile || isProcessing} onClick={() => setAudioEffects([])} className="text-xs font-semibold text-primary dark:text-violet-200 disabled:opacity-50">Clear effects</button></div>
              <div className="flex flex-wrap gap-2">{AUDIO_EFFECTS.map(effect => <button type="button" key={effect.id} disabled={!selectedFile || isProcessing} aria-pressed={audioEffects.includes(effect.id)}
                onClick={() => setAudioEffects(current => current.includes(effect.id) ? current.filter(id => id !== effect.id) : [...current, effect.id])}
                className={`px-4 py-2 rounded-full text-xs font-semibold ${audioEffects.includes(effect.id) ? 'bg-primary-container text-white' : 'bg-white dark:bg-slate-700 text-on-surface dark:text-slate-100'}`}>{effect.label}</button>)}</div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {AUDIO_EFFECTS.filter(effect => audioEffects.includes(effect.id)).map(effect => (
                  <label key={effect.id} className="flex flex-col gap-2 text-xs text-on-surface dark:text-slate-100">
                    <span className="flex justify-between font-semibold"><span>{effect.label} level</span><span className="font-mono">{audioEffectLevels[effect.id] ?? 100}%</span></span>
                    <input type="range" disabled={!selectedFile || isProcessing} aria-label={`${effect.label} level`} min="0" max="100" step="1" value={audioEffectLevels[effect.id] ?? 100}
                      aria-valuetext={`${audioEffectLevels[effect.id] ?? 100} percent`}
                      onChange={e => setAudioEffectLevels(current => ({...current, [effect.id]: Number(e.target.value)}))}
                      className="w-full h-2 accent-primary dark:accent-violet-400 cursor-pointer rounded-full" />
                  </label>
                ))}
              </div>
              <p className="text-xs text-on-surface-variant dark:text-slate-200">Set each effect from 0–100%. Listen with Play; levels also apply to the export.</p>
            </div>)}
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
                  className="w-full h-12 rounded-full bg-primary-container hover:bg-primary text-white font-semibold text-sm flex items-center justify-center gap-2 shadow-md shadow-primary/25 transition-all hover:scale-[1.01] active:scale-95 disabled:opacity-50 dark:disabled:opacity-100 dark:disabled:bg-violet-950 dark:disabled:text-violet-200"
                >
                  <Download className="w-4 h-4" />
                  <span>{exportMode === 'audio' ? 'Export Audio Clip' : 'Export Trimmed Video'}</span>
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
                  <div className="flex items-center justify-between text-xs text-on-surface-variant dark:text-slate-200 font-mono">
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
                  <div className="p-3 rounded-2xl bg-tertiary-fixed/40 dark:bg-emerald-950/60 border border-tertiary/40 dark:border-emerald-800 flex items-center gap-2 text-tertiary dark:text-emerald-300 text-xs font-semibold">
                    <CheckCircle2 className="w-4 h-4 text-tertiary dark:text-emerald-300 shrink-0" />
                    <span>{downloaded ? 'Download started. Edit this clip to export again.' : 'Conversion complete! Media ready for download.'}</span>
                  </div>
                  {!downloaded && outputFileId && <a
                    onClick={() => setDownloaded(true)}
                    href={outputFileId ? apiClient.getDownloadUrl(outputFileId) : '#'}
                    download
                    className="w-full h-12 rounded-full bg-tertiary-container hover:bg-tertiary text-white font-semibold text-sm flex items-center justify-center gap-2 shadow-md transition-all active:scale-95"
                  >
                    <Download className="w-4 h-4" />
                    <span>{exportMode === 'audio' ? 'Download Exported Audio' : 'Download Converted Video'}</span>
                  </a>}
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full h-10 rounded-full bg-surface-container-low text-on-surface dark:text-slate-100 text-xs font-semibold hover:bg-surface-container transition-colors"
                  >
                    Edit Another
                  </button>
                </div>
              )}

              {stage === 'FAILED' && (
                <button
                  type="button"
                  onClick={() => setStage('IDLE')}
                  className="w-full h-11 rounded-full bg-surface-container-low hover:bg-surface-container text-on-surface dark:text-slate-100 font-semibold text-xs transition-colors"
                >
                  Try Again
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
