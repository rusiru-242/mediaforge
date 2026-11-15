'use client';

import { useTrimmedPlayback } from '@/hooks/useTrimmedPlayback';
import { useNavigationGuard } from '@/hooks/useNavigationGuard';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import {
  Music,
  Play,
  Pause,
  SkipBack,
  SkipForward,
  RotateCcw,
  RotateCw,
  Sliders,
  Volume2,
  VolumeX,
  Download,
  Upload,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Layers,
  ChevronDown,
  Sparkles,
  Zap,
} from 'lucide-react';
import { apiClient } from '@/services/apiClient';
import { JobResponse, ConversionProgressResponse } from '@/types/api';
import { AudioWaveform } from '@/components/editor/AudioWaveform';
import { TrimHandles } from '@/components/editor/TrimHandles';
import { useAudioPreview } from '@/hooks/useAudioPreview';
import { AUDIO_EFFECTS, AudioEffect, fadeEnvelopePath } from '@/utils/audioEffects';
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

  // Volume, Gain & Filters
  const [volume, setVolume] = useState<number>(1.0);
  const [audioEffects, setAudioEffects] = useState<AudioEffect[]>([]);
  const [audioEffectLevels, setAudioEffectLevels] = useState<Partial<Record<AudioEffect, number>>>({});
  const [fadeInDuration, setFadeInDuration] = useState<number>(0);
  const [fadeOutDuration, setFadeOutDuration] = useState<number>(0);

  // Stage & Tracking
  const [stage, setStage] = useState<'IDLE' | 'UPLOADING' | 'PROCESSING' | 'COMPLETED' | 'FAILED' | 'CANCELLED'>('IDLE');
  useNavigationGuard(stage === 'UPLOADING' || stage === 'PROCESSING');
  const [error, setError] = useState<string | null>(null);
  const [currentJob, setCurrentJob] = useState<JobResponse | null>(null);
  const [progress, setProgress] = useState<ConversionProgressResponse | null>(null);
  const [outputFileId, setOutputFileId] = useState<string | null>(null);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const playback = useTrimmedPlayback(audioRef, previewUrl, startTime, endTime, audioDuration, setCurrentTime, setIsPlaying);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const [isDraggingAudio, setIsDraggingAudio] = useState(false);
  const isBusy = stage === 'UPLOADING' || stage === 'PROCESSING';

  const preview = useAudioPreview(audioRef, previewUrl, {effects: audioEffects, levels: audioEffectLevels, volume, start: startTime,
    end: endTime || audioDuration, fadeIn: fadeInDuration, fadeOut: fadeOutDuration});
  const selectedDuration = Math.max(0, (endTime || audioDuration) - startTime);
  useEffect(() => {
    setFadeInDuration(value => Math.min(value, selectedDuration));
    setFadeOutDuration(value => Math.min(value, selectedDuration));
  }, [selectedDuration]);
  const curve = fadeEnvelopePath(startTime, endTime || audioDuration, fadeInDuration, fadeOutDuration);
  const exportKey = useRef<string | null>(null);
  const settingsKey = JSON.stringify({ file: selectedFile && [selectedFile.name, selectedFile.size, selectedFile.lastModified],
    targetFormat, bitrate, sampleRate, channels, startTime, endTime, volume, fadeInDuration, fadeOutDuration, audioEffects, audioEffectLevels });
  useEffect(() => {
    if (stage === 'COMPLETED' && exportKey.current !== settingsKey) {
      setStage('IDLE'); setOutputFileId(null);
    }
  }, [settingsKey, stage]);

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

  const togglePlay = async () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      if (audioRef.current.currentTime < startTime || (endTime > 0 && audioRef.current.currentTime >= endTime)) {
        audioRef.current.currentTime = startTime;
      }
      try {
        await preview.start(); await audioRef.current.play(); setIsPlaying(true);
      } catch { setError('Unable to start audio preview. Try importing the file again.'); }
    }
  };

  const seekRelative = (seconds: number) => {
    if (!audioRef.current) return;
    playback.seek(audioRef.current.currentTime + seconds);
  };

  const handleTimelineScrub = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!audioRef.current || audioDuration <= 0) return;
    const rect = e.currentTarget.getBoundingClientRect();
    if (rect.width <= 0) return;
    const pos = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    playback.seek(pos * audioDuration);
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

  const effectiveDuration = audioDuration > 0 ? Math.max(0.1, Math.round(((endTime || audioDuration) - startTime) * 10) / 10) : 0;

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
    exportKey.current = settingsKey;
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
        volume: volume !== 1.0 ? volume : undefined,
        audioEffects,
        audioEffectLevels,
        fadeInDuration: fadeInDuration > 0 ? Math.min(fadeInDuration, effectiveDuration) : undefined,
        fadeOutDuration: fadeOutDuration > 0 ? Math.min(fadeOutDuration, effectiveDuration) : undefined,
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
    
    if (audioRef.current) {
      audioRef.current.currentTime = 0;
      setCurrentTime(0);
    }
  };

  const importAudio = (file: File) => {
    if (isBusy) return;
    if (!file.type.startsWith('audio/') && !file.type.startsWith('video/')
        && !/\.(mp3|wav|flac|aac|ogg|m4a|wma|opus|mp4|mkv|webm|avi|mov|flv|m4v)$/i.test(file.name)) {
      setError('Choose a supported audio or video file.'); return;
    }
    if (file.size > 500 * 1024 * 1024) { setError('This file is too large to import.'); return; }
    cleanupPolling();
    setSelectedFile(file); setStage('IDLE'); setError(null);
    setCurrentJob(null); setProgress(null); setOutputFileId(null);
    setAudioDuration(0); setStartTime(0); setEndTime(0); 
    setCurrentTime(0); setIsPlaying(false);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) importAudio(e.target.files[0]);
    e.target.value = '';
  };

  return (
    <div className="audio-editor w-full max-w-7xl mx-auto px-gutter py-space-md flex flex-col gap-space-md text-slate-900 dark:text-slate-100">
      {/* Hidden audio element for preview */}
      {previewUrl && (
        <audio
          key={previewUrl}
          ref={audioRef}
          src={previewUrl}
          onLoadedMetadata={handleLoadedMetadata}
          
          className="hidden"
        />
      )}

      {/* Top Breadcrumb & Audio Source Context Bar */}
      <div className="w-full bg-surface-container-lowest dark:bg-slate-900 rounded-2xl p-space-md shadow-sm border border-outline-variant/30 flex flex-col xl:flex-row xl:items-center xl:justify-between gap-space-md">
        <div className="flex flex-wrap items-center gap-space-sm min-w-0">
          <div className="flex items-center gap-2">
            <span className="w-8 h-8 rounded-full bg-primary-fixed dark:bg-violet-950 dark:bg-slate-800 text-primary dark:text-violet-200 flex items-center justify-center font-bold">
              <Music className="w-4 h-4" />
            </span>
            <Link href="/" className="text-xs text-on-surface-variant dark:text-slate-200 hover:text-on-surface font-semibold">
              Audio Editor
            </Link>
            <span className="text-outline-variant dark:text-slate-400 text-xs">/</span>
            <span className="text-sm font-bold text-on-surface dark:text-slate-100 truncate max-w-[280px] sm:max-w-md">
              {selectedFile ? selectedFile.name : 'No audio loaded'}
            </span>
          </div>
          {selectedFile && audioDuration > 0 && (
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-surface-container-low dark:bg-slate-800 text-on-surface-variant dark:text-slate-200 font-mono text-xs">
              <span className="w-2 h-2 rounded-full bg-tertiary-container animate-pulse" />
              <span>
                {channels === 2 ? 'Stereo' : 'Mono'} · {formatTime(audioDuration)}
              </span>
            </div>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handleResetMarkers}
            disabled={!selectedFile}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-surface-container-low dark:bg-slate-800 text-on-surface-variant dark:text-slate-200 hover:bg-surface-container font-semibold text-xs disabled:opacity-40 dark:disabled:opacity-100 dark:disabled:text-slate-400"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Reset Markers</span>
          </button>
          <label className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-primary-fixed dark:bg-violet-950 text-on-primary-fixed-variant dark:text-violet-200 dark:bg-slate-800 dark:text-violet-200 font-semibold text-xs cursor-pointer shadow-xs">
            <Upload className="w-3.5 h-3.5" />
            <span>{selectedFile ? 'Replace File' : 'Import Audio'}</span>
            <input
              ref={fileInputRef}
              type="file"
              accept="audio/*,video/*,.mp3,.wav,.flac,.aac,.ogg,.m4a,.wma,.opus"
              onChange={handleFileChange}
              disabled={isBusy}
              className="hidden"
            />
          </label>
        </div>
      </div>

      {/* Main Studio Grid: 8-col Canvas + 4-col Inspector */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-space-lg items-start">
        {/* Studio Center (8 Columns) */}
        <section className="lg:col-span-8 flex flex-col gap-space-md">
          <div role="button" tabIndex={isBusy ? -1 : 0} aria-label="Import audio by browsing or dropping a file" aria-disabled={isBusy}
            onClick={() => !isBusy && fileInputRef.current?.click()}
            onKeyDown={e => { if (!isBusy && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); fileInputRef.current?.click(); } }}
            onDragOver={e => { e.preventDefault(); e.dataTransfer.dropEffect = isBusy ? 'none' : 'copy'; if (!isBusy) setIsDraggingAudio(true); }}
            onDragLeave={e => { if (!(e.relatedTarget instanceof Node) || !e.currentTarget.contains(e.relatedTarget)) setIsDraggingAudio(false); }}
            onDrop={e => { e.preventDefault(); setIsDraggingAudio(false); if (e.dataTransfer.files[0]) importAudio(e.dataTransfer.files[0]); }}
            className={`min-h-56 rounded-3xl border-2 border-dashed p-8 flex flex-col items-center justify-center text-center transition-colors ${isDraggingAudio ? 'border-violet-400 bg-violet-50 dark:bg-violet-950/50' : 'border-slate-300 bg-white dark:border-slate-600 dark:bg-slate-900'} ${isBusy ? 'cursor-not-allowed' : 'cursor-pointer hover:border-violet-400'}`}>
            <div className="w-16 h-16 rounded-full bg-violet-100 dark:bg-violet-500/20 flex items-center justify-center mb-4 text-violet-600 dark:text-violet-200"><Upload className="w-8 h-8" /></div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">{isDraggingAudio ? 'Drop audio here' : selectedFile ? 'Replace Audio' : 'Click or Drag Audio to Import'}</h2>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">MP3, WAV, FLAC, AAC, OGG, M4A and other supported media files.</p>
            {selectedFile && <p className="mt-3 max-w-full truncate text-sm font-semibold text-violet-700 dark:text-violet-200">{selectedFile.name}</p>}
          </div>
          {/* Visual Master Transport & Readouts */}
          <div className="w-full bg-surface-container-lowest dark:bg-slate-900 rounded-3xl p-space-lg shadow-sm border border-outline-variant/30 space-y-space-md">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-space-md">
              {/* Monospace Time Display */}
              <div className="flex items-center gap-space-md">
                <div className="bg-surface-container-low dark:bg-slate-950 rounded-2xl px-space-md py-2.5 flex items-baseline gap-2 border border-outline-variant/20">
                  <span className="text-xs uppercase text-on-surface-variant dark:text-slate-200 font-bold tracking-wider">Current</span>
                  <span className="text-2xl font-mono font-extrabold text-primary dark:text-violet-200 tracking-tight">
                    {formatTime(currentTime)}
                  </span>
                  <span className="text-base font-mono text-outline-variant dark:text-slate-400">/</span>
                  <span className="text-sm font-mono text-on-surface-variant dark:text-slate-200 font-semibold">
                    {formatTime(audioDuration)}
                  </span>
                </div>
                <div className="hidden sm:flex flex-col">
                  <span className="text-[11px] text-on-surface-variant dark:text-slate-200 font-medium">Effective</span>
                  <span className="font-mono text-xs font-bold text-on-surface dark:text-slate-100">
                    {effectiveDuration.toFixed(1)}s
                  </span>
                </div>
              </div>

              {/* Playback Speed Pills */}
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-on-surface-variant dark:text-slate-200">Speed</span>
                <div className="inline-flex items-center p-1 bg-surface-container-low dark:bg-slate-800 rounded-full">
                  {[0.75, 1.0, 1.25, 1.5].map((speed) => (
                    <button
                      key={speed}
                      type="button"
                      onClick={() => handleSpeedChange(speed)}
                      className={`px-2.5 py-1 rounded-full text-xs font-semibold transition-all ${
                        playbackSpeed === speed
                          ? 'bg-surface-container-lowest dark:bg-slate-700 text-primary dark:text-violet-200 shadow-xs'
                          : 'text-on-surface-variant dark:text-slate-200 hover:text-on-surface'
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
                    playback.seek(startTime);
                  }}
                  className="w-10 h-10 rounded-full bg-surface-container-low dark:bg-slate-800 hover:bg-surface-container text-on-surface-variant dark:text-slate-200 hover:text-on-surface flex items-center justify-center transition-colors"
                  title="Jump to In-Point"
                >
                  <SkipBack className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => seekRelative(-5)}
                  className="w-10 h-10 rounded-full bg-surface-container-low dark:bg-slate-800 hover:bg-surface-container text-on-surface-variant dark:text-slate-200 hover:text-on-surface flex items-center justify-center transition-all hover:scale-105 active:scale-95"
                  title="Rewind 5s"
                >
                  <RotateCcw className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={togglePlay}
                  disabled={!selectedFile}
                  className="w-14 h-14 rounded-full bg-primary-container hover:bg-primary text-white flex items-center justify-center transition-all duration-300 hover:scale-105 active:scale-95 shadow-md shadow-primary/25 disabled:opacity-50 dark:disabled:opacity-100 dark:disabled:bg-violet-950 dark:disabled:text-violet-200"
                  title="Play / Pause"
                >
                  {isPlaying ? <Pause className="w-6 h-6" /> : <Play className="w-6 h-6 ml-0.5" />}
                </button>
                <button
                  type="button"
                  onClick={() => seekRelative(5)}
                  className="w-10 h-10 rounded-full bg-surface-container-low dark:bg-slate-800 hover:bg-surface-container text-on-surface-variant dark:text-slate-200 hover:text-on-surface flex items-center justify-center transition-all hover:scale-105 active:scale-95"
                  title="Forward 5s"
                >
                  <RotateCw className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    playback.seek(endTime || audioDuration);
                  }}
                  className="w-10 h-10 rounded-full bg-surface-container-low dark:bg-slate-800 hover:bg-surface-container text-on-surface-variant dark:text-slate-200 hover:text-on-surface flex items-center justify-center transition-colors"
                  title="Jump to End"
                >
                  <SkipForward className="w-4 h-4" />
                </button>
              </div>

              {/* Master Volume & Meter */}
              <div className="flex items-center gap-space-md">
                <div className="flex items-center gap-2">
                  <Volume2 className="w-4 h-4 text-on-surface-variant dark:text-slate-200" />
                  <span className="text-xs font-semibold text-on-surface dark:text-slate-100">Clip volume</span>
                  <input
                    type="range" disabled={!selectedFile}
                    min="0"
                    max="2"
                    aria-label="Clip volume"
                    step="0.05"
                    value={volume}
                    onChange={(e) => {
                      const val = parseFloat(e.target.value);
                      setVolume(val);

                    }}
                    className="w-24 sm:w-28 accent-primary dark:accent-violet-400 h-1.5 bg-surface-container-high dark:bg-slate-700 rounded-full cursor-pointer"
                  />
                  <span className="font-mono text-xs text-on-surface-variant dark:text-slate-200 w-12 text-right">
                    {(volume * 100).toFixed(0)}%
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Waveform Studio Canvas Pane */}
          <div className="w-full bg-white dark:bg-slate-800 rounded-3xl p-space-md shadow-sm border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 flex flex-col gap-space-md relative overflow-hidden select-none">
            {/* Waveform HUD Top */}
            <div className="flex items-center justify-between text-xs text-slate-600 dark:text-slate-300 pb-1">
              <div className="flex items-center gap-3">
                <span className="inline-flex items-center gap-1.5 font-semibold bg-violet-50 dark:bg-white/10 px-2.5 py-1 rounded-full text-[11px]">
                  <span className="w-2 h-2 rounded-full bg-primary-fixed dark:bg-violet-950 animate-pulse" />
                  <span>Audio Waveform</span>
                </span>
                <span className="font-mono text-emerald-700 dark:text-emerald-300 font-semibold">
                  Selection: {effectiveDuration.toFixed(1)}s
                </span>
              </div>
              <span className="font-mono text-[11px] text-slate-500 dark:text-slate-400">{selectedFile ? 'Combined waveform' : 'No audio loaded'}</span>
            </div>

            {/* Interactive Multichannel Waveform Container */}
            <div
              onClick={handleTimelineScrub}
              className="relative w-full h-52 bg-slate-50 dark:bg-white/5 rounded-2xl overflow-hidden flex flex-col justify-between py-2 border border-slate-200 dark:border-white/10 cursor-pointer"
            >
              {/* Time scale */}
              <div className="absolute top-1 inset-x-0 flex justify-between px-3 text-[10px] font-mono text-slate-600 dark:text-slate-300 pointer-events-none z-10">
                <span>00:00</span>
                <span>{formatTime(audioDuration * 0.25)}</span>
                <span>{formatTime(audioDuration * 0.5)}</span>
                <span>{formatTime(audioDuration * 0.75)}</span>
                <span>{formatTime(audioDuration)}</span>
              </div>

              {/* Dimmed Left (Pre-Trim) */}
              {audioDuration > 0 && startTime > 0 && (
                <div
                  className="absolute left-0 top-0 bottom-0 bg-slate-300/65 dark:bg-black/60 pointer-events-none z-10"
                  style={{ width: `${(startTime / audioDuration) * 100}%` }}
                />
              )}

              {/* Dimmed Right (Post-Trim) */}
              {audioDuration > 0 && endTime < audioDuration && (
                <div
                  className="absolute right-0 top-0 bottom-0 bg-slate-300/65 dark:bg-black/60 pointer-events-none z-10"
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

              <TrimHandles duration={audioDuration} start={startTime} end={endTime || audioDuration} onStartChange={setStartTime} onEndChange={setEndTime} />
              {audioDuration > 0 && <svg role="img" aria-label="Audio fade envelope" data-fade-in={fadeInDuration} data-fade-out={fadeOutDuration}
                className="absolute inset-y-0 h-full pointer-events-none z-20 overflow-visible" style={{left: `${startTime / audioDuration * 100}%`, width: `${selectedDuration / audioDuration * 100}%`}}
                viewBox="0 0 100 100" preserveAspectRatio="none">
                <path d={curve + ' L100,100 L0,100 Z'} fill="rgba(34,211,238,0.1)" />
                <path d={curve} fill="none" stroke="#67e8f9" strokeWidth="2" vectorEffect="non-scaling-stroke" />
              </svg>}
              {/* Playhead Needle */}
              {audioDuration > 0 && (
                <div
                  className="absolute top-0 bottom-0 w-0.5 bg-rose-500 z-30 pointer-events-none flex flex-col items-center"
                  style={{ left: `${(currentTime / audioDuration) * 100}%` }}
                >
                  <div className="w-3 h-3 rounded-full bg-rose-500 -mt-1 shadow-md" />
                </div>
              )}

              <AudioWaveform file={selectedFile} />
            </div>

            {/* Bottom Status & Markers */}
            <div className="flex flex-wrap items-center justify-between text-xs text-slate-600 dark:text-slate-300 font-mono pt-1">
              <div className="flex items-center gap-4">
                <span>In: {formatTime(startTime)}</span>
                <span>Out: {formatTime(endTime || audioDuration)}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-tertiary-fixed-dim" />
                <span>{selectedFile ? 'Audio imported' : 'Import audio to begin'}</span>
              </div>
            </div>
          </div>

          {/* Audio Editing Command Strip */}
          <div className="w-full bg-surface-container-lowest dark:bg-slate-900 rounded-3xl p-space-md shadow-sm border border-outline-variant/30 space-y-space-md">
            {/* Trim Sliders */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="flex flex-col gap-1">
                <div className="flex justify-between text-xs text-on-surface-variant dark:text-slate-200 font-mono">
                  <span>Start Marker:</span>
                  <strong className="text-primary dark:text-violet-200">{formatTime(startTime)}</strong>
                </div>
                <input
                  type="range" disabled={!selectedFile}
                  min="0"
                  max={endTime > 0 ? endTime - 0.1 : audioDuration}
                  step="0.1"
                  value={startTime}
                  onChange={(e) => setStartTime(parseFloat(e.target.value))}
                  className="w-full accent-primary dark:accent-violet-400 h-1.5 bg-surface-container-high dark:bg-slate-800 rounded-full cursor-pointer"
                />
              </div>
              <div className="flex flex-col gap-1">
                <div className="flex justify-between text-xs text-on-surface-variant dark:text-slate-200 font-mono">
                  <span>End Marker:</span>
                  <strong className="text-primary dark:text-violet-200">{formatTime(endTime || audioDuration)}</strong>
                </div>
                <input
                  type="range" disabled={!selectedFile}
                  min={startTime + 0.1}
                  max={audioDuration || 100}
                  step="0.1"
                  value={endTime || audioDuration}
                  onChange={(e) => setEndTime(parseFloat(e.target.value))}
                  className="w-full accent-primary dark:accent-violet-400 h-1.5 bg-surface-container-high dark:bg-slate-800 rounded-full cursor-pointer"
                />
              </div>
            </div>

            {/* Fade Transitions */}
            <div className="grid grid-cols-1 gap-space-md pt-2">
              {/* Fade Transitions */}
              <div className="bg-surface-container-low dark:bg-slate-800/60 rounded-2xl p-space-md space-y-space-sm border border-outline-variant/20">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-on-surface dark:text-slate-100">Fade Transitions</span>
                  <span className="text-xs text-primary dark:text-violet-200 font-semibold">Smooth curve</span>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs text-on-surface-variant dark:text-slate-200">
                      <span>Fade In</span>
                      <span className="font-mono font-semibold">{fadeInDuration}s</span>
                    </div>
                    <input
                      type="range" disabled={!selectedFile}
                      min="0"
                      max={selectedDuration}
                      aria-label="Fade in duration"
                      step="0.1"
                      value={Math.min(fadeInDuration, selectedDuration)}
                      onChange={(e) => setFadeInDuration(parseFloat(e.target.value))}
                      className="w-full accent-primary dark:accent-violet-400 h-1.5 bg-surface-container-high dark:bg-slate-700 rounded-full cursor-pointer"
                    />
                  </div>
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs text-on-surface-variant dark:text-slate-200">
                      <span>Fade Out</span>
                      <span className="font-mono font-semibold">{fadeOutDuration}s</span>
                    </div>
                    <input
                      type="range" disabled={!selectedFile}
                      min="0"
                      max={selectedDuration}
                      aria-label="Fade out duration"
                      step="0.1"
                      value={Math.min(fadeOutDuration, selectedDuration)}
                      onChange={(e) => setFadeOutDuration(parseFloat(e.target.value))}
                      className="w-full accent-primary dark:accent-violet-400 h-1.5 bg-surface-container-high dark:bg-slate-700 rounded-full cursor-pointer"
                    />
                  </div>
                </div>
              </div>

            </div>

            <div className="rounded-2xl bg-surface-container-low dark:bg-slate-800/60 p-4 border border-outline-variant/20 space-y-3">
              <div className="flex items-center justify-between"><h3 className="text-sm font-bold text-on-surface dark:text-slate-100">Audio Effects</h3>
                <button type="button" onClick={() => setAudioEffects([])} className="text-xs font-semibold text-primary dark:text-violet-200">Clear effects</button></div>
              <div className="flex flex-wrap gap-2">{AUDIO_EFFECTS.map(effect => <button type="button" key={effect.id} aria-pressed={audioEffects.includes(effect.id)}
                onClick={() => setAudioEffects(current => current.includes(effect.id) ? current.filter(id => id !== effect.id) : [...current, effect.id])}
                className={`px-4 py-2 rounded-full text-xs font-semibold ${audioEffects.includes(effect.id) ? 'bg-primary-container text-white' : 'bg-white dark:bg-slate-700 text-on-surface dark:text-slate-100'}`}>{effect.label}</button>)}</div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {AUDIO_EFFECTS.filter(effect => audioEffects.includes(effect.id)).map(effect => (
                  <label key={effect.id} className="flex flex-col gap-2 text-xs text-on-surface dark:text-slate-100">
                    <span className="flex justify-between font-semibold"><span>{effect.label} level</span><span className="font-mono">{audioEffectLevels[effect.id] ?? 100}%</span></span>
                    <input type="range" disabled={!selectedFile} aria-label={`${effect.label} level`} min="0" max="100" step="1" value={audioEffectLevels[effect.id] ?? 100}
                      aria-valuetext={`${audioEffectLevels[effect.id] ?? 100} percent`}
                      onChange={e => setAudioEffectLevels(current => ({...current, [effect.id]: Number(e.target.value)}))}
                      className="w-full h-2 accent-primary dark:accent-violet-400 cursor-pointer rounded-full" />
                  </label>
                ))}
              </div>
              <p className="text-xs text-on-surface-variant dark:text-slate-200">Set each effect from 0–100%. Listen with Play; levels also apply to the export.</p>
            </div>

          </div>
        </section>

        {/* Right 4-col Export Inspector */}
        <aside className="lg:col-span-4 flex flex-col gap-space-md lg:sticky lg:top-24">
          <div className="w-full bg-surface-container-lowest dark:bg-slate-900 rounded-3xl p-space-lg shadow-sm border border-outline-variant/30 space-y-space-md">
            {/* Header */}
            <div className="flex items-center justify-between pb-1 border-b border-outline-variant/20">
              <div className="flex items-center gap-2">
                <Sliders className="w-4 h-4 text-primary dark:text-violet-200" />
                <h2 className="text-base font-bold text-on-surface dark:text-slate-100">Export Settings</h2>
              </div>
            </div>

            {/* Format Pills */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-on-surface dark:text-slate-100">Audio Container Format</label>
              <div className="grid grid-cols-5 gap-1 p-1 bg-surface-container-low dark:bg-slate-800 rounded-2xl">
                {(['mp3', 'wav', 'aac', 'flac', 'ogg'] as const).map((fmt) => (
                  <button
                    key={fmt}
                    type="button"
                    onClick={() => setTargetFormat(fmt)}
                    className={`py-2 rounded-xl text-xs font-bold uppercase transition-all ${
                      targetFormat === fmt
                        ? 'bg-surface-container-lowest dark:bg-slate-700 text-primary dark:text-violet-200 shadow-xs'
                        : 'text-on-surface-variant dark:text-slate-200 hover:text-on-surface'
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
                <label className="font-semibold text-on-surface dark:text-slate-100">Target Bitrate</label>
                <span className="font-mono text-primary dark:text-violet-200 font-semibold">CBR Mode</span>
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
                        ? 'bg-primary-fixed/40 dark:bg-slate-700 border-primary text-primary dark:text-violet-200 font-bold shadow-xs'
                        : 'bg-surface-container-low dark:bg-slate-800 border-transparent text-on-surface dark:text-slate-100 hover:bg-surface-container'
                    }`}
                  >
                    <span className="text-sm font-mono font-bold">{tier.sub}</span>
                    <span className="text-[11px] text-on-surface-variant dark:text-slate-200 mt-0.5">{tier.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Channels & Sample Rate */}
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-on-surface dark:text-slate-100">Channels</label>
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
                <label className="text-xs font-semibold text-on-surface dark:text-slate-100">Sample Rate</label>
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
                  className="w-full h-12 rounded-full bg-primary-container hover:bg-primary text-white font-semibold text-sm flex items-center justify-center gap-2 shadow-md shadow-primary/25 transition-all hover:scale-[1.01] active:scale-95 disabled:opacity-50 dark:disabled:opacity-100 dark:disabled:bg-violet-950 dark:disabled:text-violet-200"
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
                  <div className="flex items-center justify-between text-xs text-on-surface-variant dark:text-slate-200 font-mono">
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
                  <div className="p-3 rounded-2xl bg-tertiary-fixed/40 dark:bg-emerald-950/60 border border-tertiary/40 flex items-center gap-2 text-tertiary dark:text-emerald-300 text-xs font-semibold">
                    <CheckCircle2 className="w-4 h-4 text-tertiary dark:text-emerald-300 shrink-0" />
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
                    className="w-full h-10 rounded-full border border-transparent bg-surface-container-low text-slate-900 hover:bg-surface-container dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700 text-xs font-semibold transition-colors"
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
        </aside>
      </div>
    </div>
  );
}
