'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import Link from 'next/link';
import {
  Music,
  Play,
  Pause,
  SkipBack,
  SkipForward,
  RotateCcw,
  RotateCw,
  Scissors,
  Sliders,
  Volume2,
  VolumeX,
  Download,
  Upload,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Shield,
  Layers,
  ChevronDown,
  Trash2,
  Plus,
  TrendingDown,
  Sparkles,
  Zap,
} from 'lucide-react';
import { apiClient } from '@/services/apiClient';
import { JobResponse, ConversionProgressResponse, SizeEstimationResponse, TimeRangeDto } from '@/types/api';
import { AUDIO_PRESETS } from '@/utils/presets';

export default function AudioConverterPage() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [audioDuration, setAudioDuration] = useState<number>(0);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1.0);

  // Conversion Parameters
  const [targetFormat, setTargetFormat] = useState('mp3');
  const [selectedPreset, setSelectedPreset] = useState<string>('standard');
  const [bitrate, setBitrate] = useState('320k');
  const [sampleRate, setSampleRate] = useState('48000');
  const [channels, setChannels] = useState<number>(2);

  // Trim & Cut
  const [startTime, setStartTime] = useState<number>(0);
  const [endTime, setEndTime] = useState<number>(0);
  const [cutSegments, setCutSegments] = useState<TimeRangeDto[]>([]);

  // Volume, Gain & Filters
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

  const audioRef = useRef<HTMLAudioElement | null>(null);
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

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime);
      if (endTime > 0 && audioRef.current.currentTime >= endTime) {
        audioRef.current.pause();
        setIsPlaying(false);
      }
    }
  };

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      if (audioRef.current.currentTime < startTime || (endTime > 0 && audioRef.current.currentTime >= endTime)) {
        audioRef.current.currentTime = startTime;
      }
      audioRef.current.play();
      setIsPlaying(true);
    }
  };

  const seekRelative = (seconds: number) => {
    if (!audioRef.current) return;
    audioRef.current.currentTime = Math.max(0, Math.min(audioDuration, audioRef.current.currentTime + seconds));
  };

  const handleTimelineScrub = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!audioRef.current || audioDuration <= 0) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const pos = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const target = pos * audioDuration;
    audioRef.current.currentTime = target;
    setCurrentTime(target);
  };

  const formatTime = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    const ms = Math.floor((sec % 1) * 100);
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}.${String(ms).padStart(2, '0')}`;
  };

  const handleSpeedChange = (speed: number) => {
    setPlaybackSpeed(speed);
    if (audioRef.current) {
      audioRef.current.playbackRate = speed;
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

  const effectiveDuration = useMemo(() => {
    if (!audioDuration) return 0;
    let dur = Math.max(0, (endTime > 0 ? endTime : audioDuration) - startTime);
    cutSegments.forEach((seg) => {
      const s = Math.max(startTime, seg.start);
      const e = Math.min(endTime > 0 ? endTime : audioDuration, seg.end);
      if (e > s) {
        dur -= e - s;
      }
    });
    return Math.max(0.1, Math.round(dur * 10) / 10);
  }, [audioDuration, startTime, endTime, cutSegments]);

  // Output Size Estimation
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
          audioBitrate: parseInt(bitrate.replace('k', ''), 10) || 320,
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
      setError('Unable to track conversion: No valid Job ID was received.');
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
          setError('Lost connection while polling audio conversion.');
        }
      }
    }, 1000);
  };

  const handleConvert = async () => {
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
        audioBitrate: parseInt(bitrate.replace('k', ''), 10) || 320,
        sampleRate: parseInt(sampleRate, 10) || 48000,
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

  const handleResetMarkers = () => {
    setStartTime(0);
    setEndTime(audioDuration);
    setCutSegments([]);
    if (audioRef.current) {
      audioRef.current.currentTime = 0;
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
      {/* Hidden audio element for preview */}
      {previewUrl && (
        <audio
          ref={audioRef}
          src={previewUrl}
          onLoadedMetadata={handleLoadedMetadata}
          onTimeUpdate={handleTimeUpdate}
          className="hidden"
        />
      )}

      {/* Top Breadcrumb & Audio Source Context Bar */}
      <div className="w-full bg-surface-container-lowest dark:bg-slate-900 rounded-2xl p-space-md shadow-sm border border-outline-variant/30 flex flex-col xl:flex-row xl:items-center xl:justify-between gap-space-md">
        <div className="flex flex-wrap items-center gap-space-sm min-w-0">
          <div className="flex items-center gap-2">
            <span className="w-8 h-8 rounded-full bg-primary-fixed dark:bg-slate-800 text-primary flex items-center justify-center font-bold">
              <Music className="w-4 h-4" />
            </span>
            <Link href="/" className="text-xs text-on-surface-variant hover:text-on-surface font-semibold">
              Audio Editor
            </Link>
            <span className="text-outline-variant text-xs">/</span>
            <span className="text-sm font-bold text-on-surface truncate max-w-[280px] sm:max-w-md">
              {selectedFile ? selectedFile.name : 'No audio loaded'}
            </span>
          </div>
          {selectedFile && audioDuration > 0 && (
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-surface-container-low dark:bg-slate-800 text-on-surface-variant font-mono text-xs">
              <span className="w-2 h-2 rounded-full bg-tertiary-container animate-pulse" />
              <span>
                {channels === 2 ? 'Stereo' : 'Mono'} · {formatTime(audioDuration)} · {(selectedFile.size / (1024 * 1024)).toFixed(1)} MB
              </span>
            </div>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handleResetMarkers}
            disabled={!selectedFile}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-surface-container-low dark:bg-slate-800 text-on-surface-variant hover:bg-surface-container font-semibold text-xs disabled:opacity-40"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Reset Markers</span>
          </button>
          <label className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-primary-fixed text-on-primary-fixed-variant dark:bg-slate-800 dark:text-primary font-semibold text-xs cursor-pointer shadow-xs">
            <Upload className="w-3.5 h-3.5" />
            <span>{selectedFile ? 'Replace File' : 'Import Audio'}</span>
            <input
              ref={fileInputRef}
              type="file"
              accept="audio/*,video/*,.mp3,.wav,.flac,.aac,.ogg,.m4a,.wma,.opus"
              onChange={handleFileChange}
              className="hidden"
            />
          </label>
        </div>
      </div>

      {/* Main Studio Grid: 8-col Canvas + 4-col Inspector */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-space-lg items-start">
        {/* Studio Center (8 Columns) */}
        <section className="lg:col-span-8 flex flex-col gap-space-md">
          {/* Visual Master Transport & Readouts */}
          <div className="w-full bg-surface-container-lowest dark:bg-slate-900 rounded-3xl p-space-lg shadow-sm border border-outline-variant/30 space-y-space-md">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-space-md">
              {/* Monospace Time Display */}
              <div className="flex items-center gap-space-md">
                <div className="bg-surface-container-low dark:bg-slate-950 rounded-2xl px-space-md py-2.5 flex items-baseline gap-2 border border-outline-variant/20">
                  <span className="text-xs uppercase text-on-surface-variant font-bold tracking-wider">Current</span>
                  <span className="text-2xl font-mono font-extrabold text-primary tracking-tight">
                    {formatTime(currentTime)}
                  </span>
                  <span className="text-base font-mono text-outline-variant">/</span>
                  <span className="text-sm font-mono text-on-surface-variant font-semibold">
                    {formatTime(audioDuration)}
                  </span>
                </div>
                <div className="hidden sm:flex flex-col">
                  <span className="text-[11px] text-on-surface-variant font-medium">Effective</span>
                  <span className="font-mono text-xs font-bold text-on-surface">
                    {effectiveDuration.toFixed(1)}s
                  </span>
                </div>
              </div>

              {/* Playback Speed Pills */}
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-on-surface-variant">Speed</span>
                <div className="inline-flex items-center p-1 bg-surface-container-low dark:bg-slate-800 rounded-full">
                  {[0.75, 1.0, 1.25, 1.5].map((speed) => (
                    <button
                      key={speed}
                      type="button"
                      onClick={() => handleSpeedChange(speed)}
                      className={`px-2.5 py-1 rounded-full text-xs font-semibold transition-all ${
                        playbackSpeed === speed
                          ? 'bg-surface-container-lowest dark:bg-slate-700 text-primary shadow-xs'
                          : 'text-on-surface-variant hover:text-on-surface'
                      }`}
                    >
                      {speed}x
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Transport Control Hub */}
            <div className="flex flex-wrap items-center justify-between gap-space-md pt-space-xs">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    if (audioRef.current) audioRef.current.currentTime = startTime;
                  }}
                  className="w-10 h-10 rounded-full bg-surface-container-low dark:bg-slate-800 hover:bg-surface-container text-on-surface-variant hover:text-on-surface flex items-center justify-center transition-colors"
                  title="Jump to In-Point"
                >
                  <SkipBack className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => seekRelative(-5)}
                  className="w-10 h-10 rounded-full bg-surface-container-low dark:bg-slate-800 hover:bg-surface-container text-on-surface-variant hover:text-on-surface flex items-center justify-center transition-all hover:scale-105 active:scale-95"
                  title="Rewind 5s"
                >
                  <RotateCcw className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={togglePlay}
                  disabled={!selectedFile}
                  className="w-14 h-14 rounded-full bg-primary-container hover:bg-primary text-white flex items-center justify-center transition-all duration-300 hover:scale-105 active:scale-95 shadow-md shadow-primary/25 disabled:opacity-50"
                  title="Play / Pause"
                >
                  {isPlaying ? <Pause className="w-6 h-6" /> : <Play className="w-6 h-6 ml-0.5" />}
                </button>
                <button
                  type="button"
                  onClick={() => seekRelative(5)}
                  className="w-10 h-10 rounded-full bg-surface-container-low dark:bg-slate-800 hover:bg-surface-container text-on-surface-variant hover:text-on-surface flex items-center justify-center transition-all hover:scale-105 active:scale-95"
                  title="Forward 5s"
                >
                  <RotateCw className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (audioRef.current) audioRef.current.currentTime = endTime || audioDuration;
                  }}
                  className="w-10 h-10 rounded-full bg-surface-container-low dark:bg-slate-800 hover:bg-surface-container text-on-surface-variant hover:text-on-surface flex items-center justify-center transition-colors"
                  title="Jump to End"
                >
                  <SkipForward className="w-4 h-4" />
                </button>
              </div>

              {/* Master Volume & Meter */}
              <div className="flex items-center gap-space-md">
                <div className="flex items-center gap-2">
                  <Volume2 className="w-4 h-4 text-on-surface-variant" />
                  <input
                    type="range"
                    min="0"
                    max="1.5"
                    step="0.05"
                    value={volume}
                    onChange={(e) => {
                      const val = parseFloat(e.target.value);
                      setVolume(val);
                      if (audioRef.current) audioRef.current.volume = Math.min(1, val);
                    }}
                    className="w-24 sm:w-28 accent-primary h-1.5 bg-surface-container-high dark:bg-slate-700 rounded-full cursor-pointer"
                  />
                  <span className="font-mono text-xs text-on-surface-variant w-12 text-right">
                    {(volume * 100).toFixed(0)}%
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Waveform Studio Canvas Pane */}
          <div className="w-full bg-inverse-surface rounded-3xl p-space-md shadow-md text-white flex flex-col gap-space-md relative overflow-hidden select-none">
            {/* Waveform HUD Top */}
            <div className="flex items-center justify-between text-xs text-slate-300 pb-1">
              <div className="flex items-center gap-3">
                <span className="inline-flex items-center gap-1.5 font-semibold bg-white/10 px-2.5 py-1 rounded-full text-[11px]">
                  <span className="w-2 h-2 rounded-full bg-primary-fixed animate-pulse" />
                  <span>Stereo Master Audio</span>
                </span>
                <span className="font-mono text-tertiary-fixed font-semibold">
                  Selection: {effectiveDuration.toFixed(1)}s
                </span>
              </div>
              <span className="font-mono text-[11px] text-slate-400">PCM 32-bit Float</span>
            </div>

            {/* Interactive Multichannel Waveform Container */}
            <div
              onClick={handleTimelineScrub}
              className="relative w-full h-52 bg-white/5 rounded-2xl overflow-hidden flex flex-col justify-between py-2 border-y border-white/10 cursor-pointer"
            >
              {/* Time scale */}
              <div className="absolute top-1 inset-x-0 flex justify-between px-3 text-[10px] font-mono text-white/50 pointer-events-none z-10">
                <span>00:00</span>
                <span>{formatTime(audioDuration * 0.25)}</span>
                <span>{formatTime(audioDuration * 0.5)}</span>
                <span>{formatTime(audioDuration * 0.75)}</span>
                <span>{formatTime(audioDuration)}</span>
              </div>

              {/* Dimmed Left (Pre-Trim) */}
              {audioDuration > 0 && startTime > 0 && (
                <div
                  className="absolute left-0 top-0 bottom-0 bg-black/60 pointer-events-none z-10"
                  style={{ width: `${(startTime / audioDuration) * 100}%` }}
                />
              )}

              {/* Dimmed Right (Post-Trim) */}
              {audioDuration > 0 && endTime < audioDuration && (
                <div
                  className="absolute right-0 top-0 bottom-0 bg-black/60 pointer-events-none z-10"
                  style={{ width: `${((audioDuration - endTime) / audioDuration) * 100}%` }}
                />
              )}

              {/* Active Selection Outline */}
              {audioDuration > 0 && (
                <div
                  className="absolute inset-y-0 border-2 border-primary-container rounded-xl pointer-events-none z-10 shadow-[0_0_12px_rgba(103,80,245,0.4)]"
                  style={{
                    left: `${(startTime / audioDuration) * 100}%`,
                    width: `${((endTime - startTime) / audioDuration) * 100}%`,
                  }}
                />
              )}

              {/* Playhead Needle */}
              {audioDuration > 0 && (
                <div
                  className="absolute top-0 bottom-0 w-0.5 bg-rose-500 z-30 pointer-events-none flex flex-col items-center"
                  style={{ left: `${(currentTime / audioDuration) * 100}%` }}
                >
                  <div className="w-3 h-3 rounded-full bg-rose-500 -mt-1 shadow-md" />
                </div>
              )}

              {/* Channel L SVG Waveform */}
              <div className="relative w-full h-[46%] flex items-center px-1">
                <span className="absolute left-2 top-1 text-[9px] font-mono text-white/40">CH L</span>
                <svg className="w-full h-full text-primary-fixed" preserveAspectRatio="none" viewBox="0 0 1000 120">
                  <path
                    d="M0,60 Q20,10 40,60 T80,60 T120,15 T160,60 T200,8 T240,60 T280,25 T320,60 T360,5 T400,60 T440,20 T480,60 T520,10 T560,60 T600,25 T640,60 T680,12 T720,60 T760,30 T800,60 T840,15 T880,60 T920,35 T960,60 T1000,60 L1000,60 L0,60 Z"
                    fill="currentColor"
                    opacity="0.85"
                  />
                </svg>
              </div>

              {/* Center Zero Crossing */}
              <div className="w-full h-px bg-white/15 relative">
                <span className="absolute right-2 -top-2 text-[8px] font-mono text-white/30">0 dB</span>
              </div>

              {/* Channel R SVG Waveform */}
              <div className="relative w-full h-[46%] flex items-center px-1">
                <span className="absolute left-2 top-1 text-[9px] font-mono text-white/40">CH R</span>
                <svg className="w-full h-full text-secondary-fixed-dim" preserveAspectRatio="none" viewBox="0 0 1000 120">
                  <path
                    d="M0,60 Q25,20 50,60 T100,60 T150,10 T200,60 T250,5 T300,60 T350,30 T400,60 T450,15 T500,60 T550,5 T600,60 T650,22 T700,60 T750,10 T800,60 T850,28 T900,60 T950,15 T1000,60 L1000,60 L0,60 Z"
                    fill="currentColor"
                    opacity="0.85"
                  />
                </svg>
              </div>
            </div>

            {/* Bottom Status & Markers */}
            <div className="flex flex-wrap items-center justify-between text-xs text-slate-300 font-mono pt-1">
              <div className="flex items-center gap-4">
                <span>In: {formatTime(startTime)}</span>
                <span>Out: {formatTime(endTime || audioDuration)}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-tertiary-fixed-dim" />
                <span>Lossless Buffer Ready</span>
              </div>
            </div>
          </div>

          {/* Audio Editing Command Strip */}
          <div className="w-full bg-surface-container-lowest dark:bg-slate-900 rounded-3xl p-space-md shadow-sm border border-outline-variant/30 space-y-space-md">
            {/* Trim Sliders */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="flex flex-col gap-1">
                <div className="flex justify-between text-xs text-on-surface-variant font-mono">
                  <span>Start Marker:</span>
                  <strong className="text-primary">{formatTime(startTime)}</strong>
                </div>
                <input
                  type="range"
                  min="0"
                  max={endTime > 0 ? endTime - 0.1 : audioDuration}
                  step="0.1"
                  value={startTime}
                  onChange={(e) => setStartTime(parseFloat(e.target.value))}
                  className="w-full accent-primary h-1.5 bg-surface-container-high dark:bg-slate-800 rounded-full cursor-pointer"
                />
              </div>
              <div className="flex flex-col gap-1">
                <div className="flex justify-between text-xs text-on-surface-variant font-mono">
                  <span>End Marker:</span>
                  <strong className="text-primary">{formatTime(endTime || audioDuration)}</strong>
                </div>
                <input
                  type="range"
                  min={startTime + 0.1}
                  max={audioDuration || 100}
                  step="0.1"
                  value={endTime || audioDuration}
                  onChange={(e) => setEndTime(parseFloat(e.target.value))}
                  className="w-full accent-primary h-1.5 bg-surface-container-high dark:bg-slate-800 rounded-full cursor-pointer"
                />
              </div>
            </div>

            {/* Fade Transitions & Smart Clean */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-space-md pt-2">
              {/* Fade Transitions */}
              <div className="bg-surface-container-low dark:bg-slate-800/60 rounded-2xl p-space-md space-y-space-sm border border-outline-variant/20">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-on-surface">Fade Transitions</span>
                  <span className="text-xs text-primary font-semibold">Logarithmic</span>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs text-on-surface-variant">
                      <span>Fade In</span>
                      <span className="font-mono font-semibold">{fadeInDuration}s</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="10"
                      step="0.5"
                      value={fadeInDuration}
                      onChange={(e) => setFadeInDuration(parseFloat(e.target.value))}
                      className="w-full accent-primary h-1.5 bg-surface-container-high dark:bg-slate-700 rounded-full cursor-pointer"
                    />
                  </div>
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs text-on-surface-variant">
                      <span>Fade Out</span>
                      <span className="font-mono font-semibold">{fadeOutDuration}s</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="10"
                      step="0.5"
                      value={fadeOutDuration}
                      onChange={(e) => setFadeOutDuration(parseFloat(e.target.value))}
                      className="w-full accent-primary h-1.5 bg-surface-container-high dark:bg-slate-700 rounded-full cursor-pointer"
                    />
                  </div>
                </div>
              </div>

              {/* Smart Clean & Mastering */}
              <div className="bg-surface-container-low dark:bg-slate-800/60 rounded-2xl p-space-md space-y-space-sm border border-outline-variant/20">
                <span className="text-xs font-bold text-on-surface">Smart Clean & Mastering</span>
                <div className="flex flex-wrap gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setRemoveSilence(!removeSilence)}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold shadow-xs transition-all ${
                      removeSilence
                        ? 'bg-primary-container text-white'
                        : 'bg-surface-container-lowest dark:bg-slate-700 text-on-surface hover:bg-surface-container'
                    }`}
                  >
                    <span>Strip Silence</span>
                  </button>
                  <button
                    type="button"
                    onClick={addCutSegment}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-surface-container-lowest dark:bg-slate-700 text-on-surface text-xs font-semibold hover:bg-surface-container transition-all"
                  >
                    <Scissors className="w-3.5 h-3.5 text-primary" />
                    <span>Cut Unwanted Interval</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Cut Segments List */}
            {cutSegments.length > 0 && (
              <div className="space-y-2 pt-2 border-t border-outline-variant/20">
                <span className="text-xs font-bold text-on-surface">Cut Segments (Removed from Audio):</span>
                {cutSegments.map((seg, idx) => (
                  <div
                    key={idx}
                    className="flex items-center gap-3 p-2 rounded-xl bg-surface-container-low dark:bg-slate-800 text-xs"
                  >
                    <span className="font-mono font-bold text-outline">#{idx + 1}</span>
                    <span>Cut from:</span>
                    <input
                      type="number"
                      min="0"
                      max={seg.end}
                      step="0.1"
                      value={seg.start}
                      onChange={(e) => updateCutSegment(idx, 'start', parseFloat(e.target.value) || 0)}
                      className="w-16 px-2 py-0.5 rounded bg-surface-container-lowest dark:bg-slate-900 font-mono text-xs"
                    />
                    <span>s to</span>
                    <input
                      type="number"
                      min={seg.start}
                      max={audioDuration}
                      step="0.1"
                      value={seg.end}
                      onChange={(e) => updateCutSegment(idx, 'end', parseFloat(e.target.value) || 0)}
                      className="w-16 px-2 py-0.5 rounded bg-surface-container-lowest dark:bg-slate-900 font-mono text-xs"
                    />
                    <span>s</span>
                    <button
                      type="button"
                      onClick={() => removeCutSegment(idx)}
                      className="ml-auto text-rose-500 hover:text-rose-700 p-1"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* Right 4-col Export Inspector */}
        <aside className="lg:col-span-4 flex flex-col gap-space-md lg:sticky lg:top-24">
          <div className="w-full bg-surface-container-lowest dark:bg-slate-900 rounded-3xl p-space-lg shadow-sm border border-outline-variant/30 space-y-space-md">
            {/* Header */}
            <div className="flex items-center justify-between pb-1 border-b border-outline-variant/20">
              <div className="flex items-center gap-2">
                <Sliders className="w-4 h-4 text-primary" />
                <h2 className="text-base font-bold text-on-surface">Export Settings</h2>
              </div>
              <span className="px-2.5 py-0.5 rounded-full bg-tertiary-fixed text-on-tertiary-fixed font-semibold text-xs uppercase tracking-wider">
                Lossless Ready
              </span>
            </div>

            {/* Format Pills */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-on-surface">Audio Container Format</label>
              <div className="grid grid-cols-5 gap-1 p-1 bg-surface-container-low dark:bg-slate-800 rounded-2xl">
                {(['mp3', 'wav', 'aac', 'flac', 'ogg'] as const).map((fmt) => (
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

            {/* Target Bitrate Tiles */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <label className="font-semibold text-on-surface">Target Bitrate</label>
                <span className="font-mono text-primary font-semibold">CBR Mode</span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { kbps: '320k', label: 'Ultra / Master', sub: '320 kbps' },
                  { kbps: '256k', label: 'Studio High', sub: '256 kbps' },
                  { kbps: '192k', label: 'Podcast Balanced', sub: '192 kbps' },
                  { kbps: '128k', label: 'Compact Voice', sub: '128 kbps' },
                ].map((tier) => (
                  <button
                    key={tier.kbps}
                    type="button"
                    onClick={() => setBitrate(tier.kbps)}
                    className={`p-3 rounded-2xl text-left flex flex-col justify-between transition-all border ${
                      bitrate === tier.kbps
                        ? 'bg-primary-fixed/40 dark:bg-slate-700 border-primary text-primary font-bold shadow-xs'
                        : 'bg-surface-container-low dark:bg-slate-800 border-transparent text-on-surface hover:bg-surface-container'
                    }`}
                  >
                    <span className="text-sm font-mono font-bold">{tier.sub}</span>
                    <span className="text-[11px] text-on-surface-variant mt-0.5">{tier.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Channels & Sample Rate */}
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-on-surface">Channels</label>
                <select
                  value={channels}
                  onChange={(e) => setChannels(parseInt(e.target.value, 10))}
                  className="w-full h-10 px-3 bg-surface-container-low dark:bg-slate-800 rounded-xl text-xs font-semibold focus:outline-none"
                >
                  <option value={2}>Stereo (2 ch)</option>
                  <option value={1}>Mono (Downmix)</option>
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-on-surface">Sample Rate</label>
                <select
                  value={sampleRate}
                  onChange={(e) => setSampleRate(e.target.value)}
                  className="w-full h-10 px-3 bg-surface-container-low dark:bg-slate-800 rounded-xl text-xs font-semibold focus:outline-none"
                >
                  <option value="48000">48.0 kHz (Studio)</option>
                  <option value="44100">44.1 kHz (CD Audio)</option>
                  <option value="96000">96.0 kHz (Hi-Res)</option>
                </select>
              </div>
            </div>

            {/* Output Size Estimation Box */}
            <div className="w-full bg-surface-container-low dark:bg-slate-800/60 rounded-2xl p-space-md space-y-2 border border-outline-variant/30">
              <div className="flex items-center justify-between">
                <span className="text-xs uppercase tracking-wider text-outline font-bold">Estimated Output Size</span>
                {sizeEstimate && sizeEstimate.reductionPercentage !== undefined && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-tertiary-fixed text-on-tertiary-fixed font-mono text-xs font-bold">
                    <TrendingDown className="w-3.5 h-3.5" />
                    <span>{sizeEstimate.reductionPercentage}% vs source</span>
                  </span>
                )}
              </div>

              <div className="flex items-baseline gap-3">
                <span className="text-3xl font-mono font-extrabold text-on-surface tracking-tight">
                  {isEstimating ? (
                    <span className="animate-pulse">Calculating...</span>
                  ) : sizeEstimate ? (
                    sizeEstimate.formattedEstimate || sizeEstimate.formattedEstimatedSize
                  ) : (
                    '~8.7 MB'
                  )}
                </span>
                {selectedFile && (
                  <span className="text-xs font-mono text-outline line-through">
                    {(selectedFile.size / (1024 * 1024)).toFixed(1)} MB
                  </span>
                )}
              </div>

              <p className="text-xs text-on-surface-variant leading-relaxed">
                Calculated for <strong>{effectiveDuration.toFixed(1)}s</strong> duration at{' '}
                <strong>{bitrate} {targetFormat.toUpperCase()}</strong>.
              </p>
            </div>

            {/* Error Alert */}
            {error && (
              <div className="p-3 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            {/* Primary Action Button */}
            <div className="space-y-2 pt-1">
              {stage === 'IDLE' && (
                <button
                  type="button"
                  onClick={handleConvert}
                  disabled={!selectedFile}
                  className="w-full h-12 rounded-full bg-primary-container hover:bg-primary text-white font-semibold text-sm flex items-center justify-center gap-2 shadow-md shadow-primary/25 transition-all hover:scale-[1.01] active:scale-95 disabled:opacity-50"
                >
                  <Download className="w-4 h-4" />
                  <span>Export Master Audio</span>
                </button>
              )}

              {stage === 'UPLOADING' && (
                <div className="w-full h-12 rounded-full bg-primary-container/80 text-white font-semibold text-sm flex items-center justify-center gap-2">
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Uploading Audio...</span>
                </div>
              )}

              {stage === 'PROCESSING' && (
                <div className="space-y-3">
                  <div className="w-full bg-surface-container dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                    <div
                      className="bg-primary h-full rounded-full transition-all duration-300"
                      style={{ width: `${progress ? (progress.percentage ?? progress.progressPercentage ?? 20) : 20}%` }}
                    />
                  </div>
                  <div className="flex items-center justify-between text-xs text-on-surface-variant font-mono">
                    <span>{progress ? (progress.stage || 'Transcoding audio...') : 'Transcoding audio...'}</span>
                    <span>{progress ? `${progress.percentage ?? progress.progressPercentage ?? 0}%` : 'Processing...'}</span>
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
                    <span>Conversion complete! High-fidelity audio ready.</span>
                  </div>
                  <a
                    href={outputFileId ? apiClient.getDownloadUrl(outputFileId) : '#'}
                    download
                    className="w-full h-12 rounded-full bg-tertiary-container hover:bg-tertiary text-white font-semibold text-sm flex items-center justify-center gap-2 shadow-md transition-all active:scale-95"
                  >
                    <Download className="w-4 h-4" />
                    <span>Download Converted Audio</span>
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

              <div className="flex items-center justify-center gap-2 text-center text-on-surface-variant text-xs pt-1">
                <Shield className="w-3.5 h-3.5 text-tertiary" />
                <span>Zero Database · Ephemeral Sandboxing</span>
              </div>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
