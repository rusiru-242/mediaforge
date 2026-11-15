'use client';

import React, { useState, useEffect, useRef, useCallback, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  Download,
  Link2,
  Youtube,
  Facebook,
  Instagram,
  RefreshCw,
  Scissors,
  CheckCircle2,
  AlertCircle,
  Clipboard,
  X,
  ChevronDown,
  ChevronUp,
  Sliders,
  Music,
  Film,
  Volume2,
} from 'lucide-react';
import { detectDownloadPlatform } from '@/utils/platformUrl';
import { useNavigationGuard } from '@/hooks/useNavigationGuard';
import { apiClient } from '@/services/apiClient';
import { MediaMetadataResponse, JobResponse, SizeEstimationResponse } from '@/types/api';

// Platform definitions with icons and guidance
interface PlatformOption {
  id: string;
  name: string;
  placeholder: string;
  guidance: string;
  icon: (props: { className?: string }) => React.JSX.Element;
  regex: RegExp;
}

// Custom crisp SVG icons for TikTok and X (Twitter)
function TikTokIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M19.589 6.686a4.793 4.793 0 0 1-3.77-4.245V2h-3.445v13.672a2.896 2.896 0 0 1-2.882 2.87 2.896 2.896 0 0 1-2.896-2.87 2.896 2.896 0 0 1 2.896-2.87c.365 0 .71.07 1.026.195V9.45a6.34 6.34 0 0 0-1.026-.084C5.972 9.366 3 12.33 3 15.986 3 19.642 5.972 22.607 9.492 22.607c3.52 0 6.377-2.856 6.377-6.377V9.337a8.212 8.212 0 0 0 4.72 1.488V7.38a4.836 4.836 0 0 1-1-.694z" />
    </svg>
  );
}

function XIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  );
}

const PLATFORMS: PlatformOption[] = [
  {
    id: 'youtube',
    name: 'YouTube',
    placeholder: 'Paste YouTube video or Shorts link...',
    guidance: 'Supports public YouTube videos, clips, and shorts.',
    icon: (props) => <Youtube {...props} className={props.className || 'w-4 h-4 text-red-500'} />,
    regex: /(youtube\.com|youtu\.be)/i,
  },
  {
    id: 'facebook',
    name: 'Facebook',
    placeholder: 'Paste Facebook video or reel link...',
    guidance: 'Supports public Facebook videos, reels, and watch links.',
    icon: (props) => <Facebook {...props} className={props.className || 'w-4 h-4 text-blue-500'} />,
    regex: /(facebook\.com|fb\.watch)/i,
  },
  {
    id: 'instagram',
    name: 'Instagram',
    placeholder: 'Paste Instagram reel or video post link...',
    guidance: 'Supports public Instagram reels, video posts, and IGTV.',
    icon: (props) => <Instagram {...props} className={props.className || 'w-4 h-4 text-pink-500'} />,
    regex: /instagram\.com/i,
  },
  {
    id: 'tiktok',
    name: 'TikTok',
    placeholder: 'Paste TikTok video link...',
    guidance: 'Supports public TikTok videos and trending clips.',
    icon: (props) => <TikTokIcon {...props} className={props.className || 'w-4 h-4 text-slate-800 dark:text-slate-100'} />,
    regex: /tiktok\.com/i,
  },
  {
    id: 'twitter',
    name: 'X / Twitter',
    placeholder: 'Paste X or Twitter post link...',
    guidance: 'Supports public X and Twitter videos and clips.',
    icon: (props) => <XIcon {...props} className={props.className || 'w-4 h-4 text-slate-800 dark:text-slate-100'} />,
    regex: /(twitter\.com|x\.com)/i,
  },
  {
    id: 'direct',
    name: 'Direct Media URL',
    placeholder: 'Paste direct .mp4, .webm, .m3u8, or audio link...',
    guidance: 'Direct media stream links (.mp4, .webm, .m3u8, .mp3, .wav).',
    icon: (props) => <Link2 {...props} className={props.className || 'w-4 h-4 text-[rgb(var(--download-text))]'} />,
    regex: /(\.mp4|\.webm|\.m3u8|\.mp3|\.wav|\.m4a|\.mov|\.mkv)/i,
  },
];

const AUDIO_BITRATES = [
  { value: '320', label: '320 kbps', quality: 'High Quality' },
  { value: '256', label: '256 kbps', quality: 'Standard Quality' },
  { value: '192', label: '192 kbps', quality: 'Medium Quality' },
  { value: '128', label: '128 kbps', quality: 'Compact' },
];

function videoQualities(data: MediaMetadataResponse): string[] {
  const qualities = (data.availableQualities || []).filter(q => /^\d{2,4}p\b/i.test(q) && !/^(180|144|90|45|27)p\b/.test(q));
  if (qualities.length) return qualities;
  const resolution = data.resolution?.match(/^(?:\d+x)?(\d{2,4})(?:p)?$/i);
  return resolution && !['180', '144', '90', '45', '27'].includes(resolution[1]) ? [resolution[1] + 'p'] : ['source'];
}

function formatDuration(seconds?: number): string {
  if (!seconds || seconds <= 0) return '';
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  if (hrs > 0) {
    return `${hrs}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  }
  return `${mins}:${String(secs).padStart(2, '0')}`;
}

function formatBytes(bytes?: number): string {
  if (!bytes || bytes <= 0) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  const mb = bytes / (1024 * 1024);
  if (mb >= 1000) {
    return `${(mb / 1024).toFixed(2)} GB`;
  }
  return `${mb.toFixed(1)} MB`;
}

const detectPlatformFromUrl = detectDownloadPlatform;

function DownloaderContent() {
  const searchParams = useSearchParams();
  const preferredOutputFormat = searchParams.get('format')?.split('-')[0].toLowerCase();

  // Platform & URL State
  const [selectedPlatform, setSelectedPlatform] = useState<string>('youtube');
  const [url, setUrl] = useState('');
  const [isProbing, setIsProbing] = useState(false);
  const [metadata, setMetadata] = useState<MediaMetadataResponse | null>(null);
  const [probeError, setProbeError] = useState<string | null>(null);

  // Format & Quality Selection
  const [selectedFormat, setSelectedFormat] = useState('mp4');
  const [selectedQuality, setSelectedQuality] = useState('1080p');
  const [selectedAudioBitrate, setSelectedAudioBitrate] = useState('320');

  // Size Estimation
  const [sizeEstimate, setSizeEstimate] = useState<SizeEstimationResponse | null>(null);
  const [isEstimating, setIsEstimating] = useState<boolean>(false);


  // Job Submission and Polling
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeJob, setActiveJob] = useState<JobResponse | null>(null);
  const [actualOutputBytes, setActualOutputBytes] = useState<number | null>(null);
  useEffect(() => {
    let current = true;
    setActualOutputBytes(null);
    if (activeJob?.status === 'COMPLETED' && activeJob.outputFileId) {
      void (async () => {
        try {
          const file = await apiClient.getFileMetadata(activeJob.outputFileId!);
          if (current && file.fileSize && file.fileSize > 0) setActualOutputBytes(file.fileSize);
        } catch { /* Never fabricate the actual output size if inspection is unavailable. */ }
      })();
    }
    return () => { current = false; };
  }, [activeJob?.status, activeJob?.outputFileId]);
  const isJobRunning = Boolean(activeJob && ['PENDING', 'QUEUED', 'PROCESSING'].includes(activeJob.status));
  const inputLocked = isProbing || isSubmitting || isJobRunning;
  const inputLockedRef = useRef(inputLocked);
  inputLockedRef.current = inputLocked;
  const [jobError, setJobError] = useState<string | null>(null);
  const [isCancelling, setIsCancelling] = useState(false);
  const [draftReady, setDraftReady] = useState(false);

  // Keep analyzed media and selection settings across route changes in this tab.
  useEffect(() => {
    try {
      const saved = sessionStorage.getItem('mediaforge.downloader.draft.v1');
      if (saved) {
        const draft = JSON.parse(saved);
        if (typeof draft.url === 'string') {
          setUrl(draft.url);
          if (PLATFORMS.some(p => p.id === draft.selectedPlatform)) setSelectedPlatform(draft.selectedPlatform);
          const info = draft.metadata;
          if (info && typeof info.title === 'string' && typeof info.mediaType === 'string'
              && Array.isArray(info.availableFormats) && Array.isArray(info.availableQualities)) setMetadata(info);
          if (['mp4', 'webm', 'avi', 'mkv', 'mov', 'flv', 'mp3', 'm4a', 'wav'].includes(draft.selectedFormat)) setSelectedFormat(draft.selectedFormat);
          if (typeof draft.selectedQuality === 'string') setSelectedQuality(draft.selectedQuality);
          if (AUDIO_BITRATES.some(b => b.value === draft.selectedAudioBitrate)) setSelectedAudioBitrate(draft.selectedAudioBitrate);
        }
      }
    } catch {
      // A corrupt draft or unavailable browser storage must not block the downloader.
    } finally {
      setDraftReady(true);
    }
  }, []);

  useEffect(() => {
    if (!draftReady || isProbing) return;
    try {
      if (!url.trim()) {
        sessionStorage.removeItem('mediaforge.downloader.draft.v1');
      } else {
        sessionStorage.setItem('mediaforge.downloader.draft.v1', JSON.stringify({
          url, selectedPlatform, metadata, selectedFormat, selectedQuality, selectedAudioBitrate,
        }));
      }
    } catch {
      // Continue normally if storage is disabled or full.
    }
  }, [draftReady, isProbing, url, selectedPlatform, metadata, selectedFormat, selectedQuality,
    selectedAudioBitrate]);

  const pollingRef = useRef<NodeJS.Timeout | null>(null);
  const pollingGeneration = useRef(0);

  const stopPolling = useCallback(() => {
    pollingGeneration.current++;
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
  }, []);

  useEffect(() => {
    return () => stopPolling();
  }, [stopPolling]);

  const handleUrlChange = (value: string) => {
    if (inputLockedRef.current) return;
    if (value !== url) {
      stopPolling(); setMetadata(null); setActiveJob(null); setJobError(null); setSizeEstimate(null);
    }
    setUrl(value);
    setProbeError(null);
    if (value.trim()) {
      const detected = detectPlatformFromUrl(value, selectedPlatform);
      if (detected) {
        setSelectedPlatform(detected);
      }
    }
  };

  const handleClear = () => {
    if (inputLockedRef.current) return;
    stopPolling();
    setUrl('');
    setMetadata(null);
    setProbeError(null);
    setJobError(null);
    setActiveJob(null);
    setSizeEstimate(null);
  };

  const validateUrl = (inputUrl: string): boolean => {
    const trimmed = inputUrl.trim();
    if (!trimmed) {
      setProbeError('Please paste your video link first.');
      return false;
    }
    if (!trimmed.startsWith('http://') && !trimmed.startsWith('https://')) {
      setProbeError('Please enter a valid URL starting with http:// or https://');
      return false;
    }
    try {
      new URL(trimmed);
      return true;
    } catch {
      setProbeError('Invalid URL format. Please check your link.');
      return false;
    }
  };

  const triggerProbe = useCallback(
    async (targetUrl: string) => {
      if (inputLockedRef.current) return;
      if (!validateUrl(targetUrl)) return;

      setIsProbing(true);
      setProbeError(null);
      setJobError(null);
      setActiveJob(null);
      setSizeEstimate(null);
      stopPolling();

      try {
        const data = await apiClient.getMediaMetadata({ url: targetUrl.trim() });
        if (!data.directDownloadSupported && !(data.availableFormats || []).length) {
          throw new Error(data.message || 'This platform did not provide downloadable media. Try another public link or import a local file into an editor.');
        }
        setMetadata(data);

        // A source container (often M4A) is not the requested video output.
        const audioSource = data.mediaType.toUpperCase() === 'AUDIO';
        const requested = preferredOutputFormat;
        const allowed = audioSource ? ['mp3', 'm4a', 'wav'] : ['mp4', 'webm', 'avi', 'mkv', 'mov', 'flv', 'mp3', 'm4a', 'wav'];
        setSelectedFormat(requested && allowed.includes(requested) ? requested : audioSource ? 'm4a' : 'mp4');
        setSelectedQuality(videoQualities(data)[0]);
      } catch (err: any) {
        setMetadata(null);
        setProbeError(err.message || 'Unable to inspect media. Ensure the URL is public and supported.');
      } finally {
        setIsProbing(false);
      }
    },
    [stopPolling, preferredOutputFormat]
  );

  const handlePaste = async () => {
    if (inputLockedRef.current) return;
    try {
      const text = await navigator.clipboard.readText();
      if (text && !inputLockedRef.current) {
        handleUrlChange(text);
        triggerProbe(text);
      }
    } catch {
      // Clipboard read fallback
    }
  };

  // Check URL query parameters on mount or change
  useEffect(() => {
    if (!draftReady) return;
    const queryUrl = searchParams.get('url');
    const queryFormat = searchParams.get('format');
    if (queryUrl && queryUrl !== url) {
      setUrl(queryUrl);
      setSelectedPlatform(detectPlatformFromUrl(queryUrl));
      if (queryFormat) {
        const fmt = queryFormat.split('-')[0].toLowerCase();
        setSelectedFormat(fmt);
      }
      triggerProbe(queryUrl);
    }
  }, [draftReady, searchParams, triggerProbe, url]);

  // Debounced Size Estimation
  useEffect(() => {
    if (!metadata || !metadata.directDownloadSupported) {
      setSizeEstimate(null);
      return;
    }

    let current = true;
    setSizeEstimate(null);
    const timer = setTimeout(async () => {
      try {
        setIsEstimating(true);
        const isAudioDownload = ['mp3', 'm4a', 'wav'].includes(selectedFormat.toLowerCase());

        const est = await apiClient.estimateOutputSize({
          estimationContext: 'download',
          mediaType: isAudioDownload ? 'audio' : 'video',
          outputFormat: selectedFormat,
          targetResolution: isAudioDownload || selectedQuality === 'source' ? undefined : selectedQuality.match(/^\d+p/i)?.[0],
          audioBitrate: selectedFormat === 'mp3' ? parseInt(selectedAudioBitrate, 10) : undefined,
          sourceDuration: metadata.duration || undefined,
          sourceFileSize: metadata.fileSize,

        });
        if (current) setSizeEstimate(est);
      } catch {
        if (current) setSizeEstimate(null);
      } finally {
        if (current) setIsEstimating(false);
      }
    }, 250);

    return () => { current = false; clearTimeout(timer); };
  }, [metadata, selectedFormat, selectedQuality, selectedAudioBitrate]);

  // Start polling background download job
  const startJobPolling = useCallback(
    (jobId: string) => {
      stopPolling();
      const generation = pollingGeneration.current;
      pollingRef.current = setInterval(async () => {
        try {
          const updated = await apiClient.getJobById(jobId);
          if (generation !== pollingGeneration.current) return;
          setActiveJob(updated);

          if (updated.status === 'COMPLETED' || updated.status === 'FAILED' || updated.status === 'CANCELLED') {
            stopPolling();
            if (updated.status === 'FAILED') {
              setJobError(updated.errorMessage || 'Media download processing failed.');
            }
          }
        } catch (e: any) {
          console.error('Job polling error:', e);
        }
      }, 1200);
    },
    [stopPolling]
  );

  const handleStartDownload = async () => {
    if (!url.trim()) {
      setProbeError('Please enter a URL to download.');
      return;
    }
    if (!metadata) {
      setProbeError('Please analyze the media URL first.');
      return;
    }
    if (!metadata.directDownloadSupported) {
      setProbeError(metadata.message || 'Direct downloading is currently unavailable for this media source.');
      return;
    }

    setIsSubmitting(true);
    setJobError(null);

    try {
      const isAudioDownload = ['mp3', 'm4a', 'wav'].includes(selectedFormat);

      const job = await apiClient.createDownloadJob({
        url: url.trim(),
        selectedFormat,
        mediaType: isAudioDownload ? 'audio' : 'video',
        selectedQuality: selectedFormat === 'wav' ? 'lossless' : selectedFormat === 'm4a' ? 'source' : isAudioDownload ? `${selectedAudioBitrate}k` : selectedQuality,
        targetFormat: selectedFormat,
        targetQuality: selectedFormat === 'wav' ? undefined : selectedFormat === 'm4a' ? 'source' : isAudioDownload ? `${selectedAudioBitrate}k` : selectedQuality,
        targetResolution: isAudioDownload || selectedQuality === 'source' ? undefined : selectedQuality.match(/^\d+p/i)?.[0],
        audioBitrate: selectedFormat === 'mp3' ? parseInt(selectedAudioBitrate, 10) : undefined,




      });

      setActiveJob(job);
      if (job.status !== 'COMPLETED' && job.status !== 'FAILED') {
        startJobPolling(job.id);
      }
    } catch (err: any) {
      setJobError(err.message || 'Failed to start download job.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancelJob = async () => {
    if (!activeJob) return;
    setIsCancelling(true);
    try {
      const cancelled = await apiClient.cancelJob(activeJob.id);
      setActiveJob(cancelled);
      stopPolling();
    } catch (err: any) {
      console.error('Cancel job error:', err);
    } finally {
      setIsCancelling(false);
    }
  };

  const detectedPlatform = React.useMemo(() => {
    try {
      const parsed = new URL(url.trim());
      return ['http:', 'https:'].includes(parsed.protocol) ? detectPlatformFromUrl(parsed.href) : null;
    } catch { return null; }
  }, [url]);
  const effectivePlatform = detectedPlatform || selectedPlatform;
  const currentPlatform = PLATFORMS.find((p) => p.id === effectivePlatform) || PLATFORMS[0];
  useNavigationGuard(isProbing || isSubmitting || isJobRunning);
  const isJobCompleted = Boolean(activeJob && activeJob.status === 'COMPLETED');
  const changeDownloadSelection = (change: () => void, changed: boolean) => {
    if (!changed || isSubmitting || isJobRunning) return;
    stopPolling();
    setActiveJob(null);
    setJobError(null);
    change();
  };
  const isAudioDownload = ['mp3', 'm4a', 'wav'].includes(selectedFormat.toLowerCase());

  const videoFormats = metadata?.mediaType.toUpperCase() === 'AUDIO' ? [] : ['mp4', 'webm', 'avi', 'mkv', 'mov', 'flv'];
  const audioFormats = ['mp3', 'm4a', 'wav'];

  const availableResolutions = React.useMemo(() => metadata ? videoQualities(metadata) : ['source'], [metadata]);

  // Formatted estimation string
  const formattedEstimate = React.useMemo(() => {
    if (isEstimating) return 'Calculating...';
    if (!metadata || !metadata.directDownloadSupported) return 'File size unavailable';
    if (sizeEstimate) {
      if (sizeEstimate.formattedRange && sizeEstimate.estimationMethod !== 'UNAVAILABLE') return sizeEstimate.formattedRange;
      if (sizeEstimate.formattedEstimate) return sizeEstimate.formattedEstimate;
      if (sizeEstimate.formattedEstimatedSize) return sizeEstimate.formattedEstimatedSize;
      if (sizeEstimate.estimatedBytes > 0) return `~${(sizeEstimate.estimatedBytes / (1024 * 1024)).toFixed(1)} MB`;
    }
    return 'File size unavailable';
  }, [isEstimating, sizeEstimate, metadata]);

  return (
    <div data-platform={currentPlatform.id} className="downloader-page flex flex-col w-full min-h-screen bg-slate-50 dark:bg-[#0B0E14] text-slate-900 dark:text-slate-100 pt-28 sm:pt-32 pb-10 px-4 sm:px-6 lg:px-8 transition-colors">
      <div className="w-full max-w-4xl mx-auto flex flex-col gap-6">
        {/* 1. Header */}
        <div className="text-center space-y-2">
          <h1 className="text-[26px] leading-tight sm:text-4xl font-extrabold tracking-tight text-slate-900 dark:text-white">
            Online Media Downloader
          </h1>
          <p className="text-sm sm:text-base text-slate-600 dark:text-slate-300 max-w-2xl mx-auto">
            Download high-quality videos and extract MP3 audio directly from supported platforms or direct media links.
          </p>
        </div>

        {/* 2. Platform Selector Tabs */}
        <div className="w-full flex items-center justify-center">
          <div className="grid grid-cols-3 sm:flex w-full sm:w-auto items-center gap-1 sm:gap-1.5 p-1.5 bg-white dark:bg-[#111622] rounded-full border border-slate-200 dark:border-slate-800 shadow-xs max-w-full">
            {PLATFORMS.filter(platform => ['youtube', 'facebook', 'instagram'].includes(platform.id)).map((platform) => {
              const Icon = platform.icon;
              const isActive = effectivePlatform === platform.id;
              return (
                <button
                  key={platform.id}
                  type="button"
                  disabled={Boolean(detectedPlatform && !isActive)}
                  aria-pressed={isActive}
                  title={detectedPlatform && !isActive ? 'Platform detected from URL. Clear or replace the URL to change it.' : platform.name}
                  onClick={() => {
                    if (detectedPlatform) return;
                    setSelectedPlatform(platform.id);
                    setProbeError(null);
                  }}
                  className={`flex items-center justify-center min-w-0 gap-1.5 sm:gap-2 px-2 sm:px-4 py-2.5 sm:py-2 rounded-full text-[11px] sm:text-xs font-semibold whitespace-nowrap transition-all disabled:opacity-50 disabled:cursor-not-allowed ${
                    isActive
                      ? 'bg-[rgb(var(--download-accent))] text-white shadow-xs'
                      : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/80'
                  }`}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  <span>{platform.name}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* 3. Main Action Card: URL Input + Analyze */}
        <div className="w-full min-w-0 bg-white dark:bg-[#111622] rounded-3xl p-4 sm:p-8 border border-slate-200/90 dark:border-slate-800 shadow-sm flex flex-col gap-6">
          {/* Centered Large URL Input */}
          <div className="flex flex-col gap-2">
            <div className="flex flex-col gap-2 sm:relative sm:block">
              <input
                type="text"
                disabled={inputLocked}
                value={url}
                onChange={(e) => handleUrlChange(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && triggerProbe(url)}
                placeholder={currentPlatform.placeholder}
                className="w-full min-w-0 h-12 sm:h-14 px-4 sm:pl-5 sm:pr-64 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white text-sm font-medium placeholder-slate-400 focus:outline-none focus:border-[rgb(var(--download-accent))] focus:ring-2 focus:ring-[rgb(var(--download-accent)/0.2)] transition-all"
              />
              <div className="flex w-full items-center justify-end gap-2 sm:absolute sm:right-2 sm:top-2 sm:w-auto sm:gap-1.5">
                {url && (
                  <button
                    type="button"
                    onClick={handleClear}
                    disabled={inputLocked}
                    title="Clear input"
                    className="flex items-center gap-1 px-2 py-2 rounded-xl text-slate-600 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-800 text-xs font-semibold transition-colors"
                  >
                    <X className="w-4 h-4" />
                    <span>Clear</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={handlePaste}
                  disabled={inputLocked}
                  title="Paste from clipboard"
                  className="flex items-center gap-1 px-3 py-2 rounded-xl bg-slate-200/80 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold transition-colors"
                >
                  <Clipboard className="w-3.5 h-3.5" />
                  <span>Paste</span>
                </button>
                <button
                  type="button"
                  onClick={() => triggerProbe(url)}
                  disabled={inputLocked || !url.trim()}
                  className="h-10 px-4 sm:px-5 rounded-xl bg-[rgb(var(--download-accent))] hover:bg-[rgb(var(--download-hover))] text-white font-semibold text-xs sm:text-sm flex items-center gap-1.5 shadow-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isProbing && <RefreshCw className="w-4 h-4 animate-spin" />}
                  <span>{isProbing ? 'Analyzing...' : 'Analyze'}</span>
                </button>
              </div>
            </div>

            {/* Platform Guidance Note */}
            <p className="text-xs text-slate-500 dark:text-slate-300 px-1">
              {currentPlatform.guidance} Availability depends on host accessibility.
            </p>
          </div>

          {/* Error Message */}
          {probeError && (
            <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 text-rose-700 dark:text-rose-300 text-xs sm:text-sm flex items-start gap-3">
              <AlertCircle className="w-5 h-5 shrink-0 mt-0.5 text-rose-600 dark:text-rose-400" />
              <div>
                <span className="font-bold">Extraction Notice:</span> {probeError}
              </div>
            </div>
          )}

          {/* 4. Compact Media Preview Card */}
          {metadata && (
            <div className="p-4 sm:p-5 rounded-2xl bg-slate-50 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-center sm:items-start gap-4 sm:gap-5">
              {/* Thumbnail */}
              <div className="relative w-full sm:w-48 aspect-video rounded-xl overflow-hidden bg-slate-200 dark:bg-slate-800 shrink-0">
                {metadata.thumbnail || metadata.thumbnailUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={metadata.thumbnail || metadata.thumbnailUrl}
                    alt={metadata.title || 'Video Thumbnail'}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-slate-400">
                    <Film className="w-10 h-10" />
                  </div>
                )}
                {metadata.duration && metadata.duration > 0 && (
                  <span className="absolute bottom-2 right-2 px-2 py-0.5 rounded-md bg-black/80 backdrop-blur-xs text-white font-mono text-[11px] font-medium">
                    {formatDuration(metadata.duration)}
                  </span>
                )}
              </div>

              {/* Title & Platform Details */}
              <div className="flex flex-col justify-between flex-1 w-full gap-2 text-left">
                <div>
                  <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white leading-snug line-clamp-2">
                    {metadata.title || 'Media Stream'}
                  </h2>
                  <div className="flex flex-wrap items-center gap-2 mt-2">
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-medium">
                      <currentPlatform.icon className="w-3.5 h-3.5" />
                      <span>{metadata.platform || currentPlatform.name}</span>
                    </span>
                    {metadata.duration && metadata.duration > 0 && (
                      <span className="text-xs text-slate-500 dark:text-slate-300">
                        Duration: {formatDuration(metadata.duration)}
                      </span>
                    )}
                  </div>
                </div>

                {/* Direct stream capability status */}
                <div className="pt-1">
                  {metadata.directDownloadSupported ? (
                    <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                      <span>Ready for download</span>
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 text-xs font-medium text-amber-600 dark:text-amber-400">
                      <AlertCircle className="w-3.5 h-3.5" />
                      <span>{metadata.message || 'Direct stream extraction restricted'}</span>
                    </span>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* 5. Format and Resolution — "Choose Download Quality" */}
          {metadata && (
            <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 flex flex-col gap-4">
              <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
                <h3 className="text-sm font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">
                  Choose Download Quality
                </h3>
                <span className="text-xs text-slate-500 dark:text-slate-300">Select format & quality</span>
              </div>

              {/* Side-by-Side Selectors: LEFT (Format) / RIGHT (Resolution or Bitrate) */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5 items-start">
                {/* LEFT: Format */}
                <div className="flex flex-col gap-2">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-200">Video formats</label>
                  <div className="grid grid-cols-3 gap-2">
                    {videoFormats.map((fmt) => {
                      const isFmtActive = selectedFormat.toLowerCase() === fmt;
                      return (
                        <button
                          key={fmt}
                          type="button"
                          disabled={isSubmitting || isJobRunning}
                          onClick={() => changeDownloadSelection(() => setSelectedFormat(fmt), selectedFormat !== fmt)}
                          className={`py-3 px-3 rounded-xl text-center flex flex-col items-center justify-center gap-1 border transition-all ${
                            isFmtActive
                              ? 'bg-[rgb(var(--download-accent))] text-white border-[rgb(var(--download-accent))] shadow-xs'
                              : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-750'
                          }`}
                        >
                          <div className="flex items-center gap-1">
                            <Film className="w-3.5 h-3.5" />
                            <span className="text-xs font-extrabold uppercase">{fmt}</span>
                          </div>
                          <span
                            className={`text-[10px] font-medium ${
                              isFmtActive ? 'text-white/80' : 'text-slate-400 dark:text-slate-300'
                            }`}
                          >
                            Video
                          </span>
                        </button>
                      );
                    })}
                  </div>
                  <h3 className="mt-3 text-xs font-bold text-slate-700 dark:text-slate-100">Download Audio</h3>
                  <div className="grid grid-cols-2 gap-2" aria-label="Audio formats">
                    {audioFormats.map((fmt) => (
                      <button key={fmt} type="button" aria-pressed={selectedFormat === fmt}
                        disabled={isSubmitting || isJobRunning}
                        onClick={() => changeDownloadSelection(() => setSelectedFormat(fmt), selectedFormat !== fmt)}
                        className={`flex items-center justify-center gap-2 rounded-xl border px-3 py-3 text-xs font-bold uppercase transition-colors ${selectedFormat === fmt
                          ? 'bg-[rgb(var(--download-accent))] border-[rgb(var(--download-accent))] text-white'
                          : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-700'}`}>
                        <Music className="w-3.5 h-3.5" />{fmt}
                      </button>
                    ))}
                  </div>
                </div>

                {/* RIGHT: Resolution or Audio Bitrate */}
                <div className="flex flex-col gap-2">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    {selectedFormat === 'wav' || selectedFormat === 'm4a' ? 'Audio Quality' : isAudioDownload ? 'Audio Quality (Bitrate)' : 'Video Resolution'}
                  </label>

                  {selectedFormat === 'm4a' ? (
                    <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-100 text-xs">
                      <p className="font-bold">M4A audio only</p>
                      <p className="mt-1 text-slate-600 dark:text-slate-300">Preserves source AAC audio when compatible, or converts to AAC.</p>
                    </div>
                  ) : selectedFormat === 'wav' ? (
                    <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-100 text-xs">
                      <p className="font-bold">Lossless WAV audio</p>
                      <p className="mt-1 text-slate-600 dark:text-slate-300">Uncompressed PCM audio. Preserves source quality with a larger file size.</p>
                    </div>
                  ) : isAudioDownload ? (
                    /* Audio Bitrate Selector */
                    <div className="grid grid-cols-2 gap-2">
                      {AUDIO_BITRATES.map((item) => {
                        const isBitrateActive = selectedAudioBitrate === item.value;
                        return (
                          <button
                            key={item.value}
                            type="button"
                            disabled={isSubmitting || isJobRunning}
                            onClick={() => changeDownloadSelection(() => setSelectedAudioBitrate(item.value), selectedAudioBitrate !== item.value)}
                            className={`p-2.5 rounded-xl text-left border transition-all ${
                              isBitrateActive
                                ? 'bg-[rgb(var(--download-accent))] text-white border-[rgb(var(--download-accent))] shadow-xs'
                                : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-750'
                            }`}
                          >
                            <span className="text-xs font-bold block">{item.label}</span>
                            <span
                              className={`text-[10px] ${
                                isBitrateActive ? 'text-white/80' : 'text-slate-400 dark:text-slate-300'
                              }`}
                            >
                              {item.quality}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  ) : (
                    /* Video Resolution Selector */
                    <div className="grid grid-cols-3 gap-2">
                      {availableResolutions.map((qual) => {
                        const isQualActive = selectedQuality === qual;
                        return (
                          <button
                            key={qual}
                            type="button"
                            disabled={isSubmitting || isJobRunning}
                            onClick={() => changeDownloadSelection(() => setSelectedQuality(qual), selectedQuality !== qual)}
                            className={`p-2.5 rounded-xl text-left border transition-all ${
                              isQualActive
                                ? 'bg-[rgb(var(--download-accent))] text-white border-[rgb(var(--download-accent))] shadow-xs'
                                : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-750'
                            }`}
                          >
                            <span className="text-xs font-bold block">{qual === 'source' ? 'Original source' : qual}</span>
                            <span
                              className={`text-[10px] ${
                                isQualActive ? 'text-white/80' : 'text-slate-400 dark:text-slate-300'
                              }`}
                            >
                              Source resolution
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>

              {/* 6. Output Size Estimation (Directly under format and resolution) */}
              <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-t border-slate-200 dark:border-slate-800 text-xs">
                <div className="text-slate-600 dark:text-slate-300" title={sizeEstimate?.disclaimer}>
                  Estimated output size: <span className="font-semibold">{formattedEstimate}</span>
                </div>

                <div className="text-slate-500 dark:text-slate-300 text-[11px]">
                  Format: <span className="font-semibold uppercase">{selectedFormat}</span> · Quality:{' '}
                  <span className="font-semibold">{selectedFormat === 'wav' ? 'Lossless PCM' : selectedFormat === 'm4a' ? 'Source audio / AAC' : isAudioDownload ? `${selectedAudioBitrate} kbps` : selectedQuality}</span>
                </div>
              </div>
            </div>
          )}

          {/* Job Error */}
          {jobError && (
            <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 text-rose-700 dark:text-rose-300 text-xs sm:text-sm flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{jobError}</span>
            </div>
          )}

          {/* 7. Large Prominent Download Button & Job Lifecycle */}
          {metadata && (
            <div className="flex flex-col gap-3">
              {!isJobRunning && !isJobCompleted && (
                <button
                  type="button"
                  onClick={handleStartDownload}
                  disabled={isSubmitting || !metadata.directDownloadSupported}
                  className="w-full py-4 rounded-2xl bg-[rgb(var(--download-accent))] hover:bg-[rgb(var(--download-hover))] active:scale-[0.99] text-white font-bold text-base shadow-md shadow-[rgb(var(--download-accent)/0.2)] flex items-center justify-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Download className="w-5 h-5" />
                  <span>{isAudioDownload ? 'Download Audio' : 'Download Video'}</span>
                </button>
              )}

              {/* Processing Progress Bar */}
              {isJobRunning && (
                <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 space-y-3">
                  <div className="flex items-center justify-between text-xs font-semibold">
                    <span className="text-slate-700 dark:text-slate-300">
                      {activeJob?.status === 'QUEUED' ? 'Queued in buffer...' : 'Downloading and packaging media...'}
                    </span>
                    <span className="font-mono text-[rgb(var(--download-text))] dark:text-[rgb(var(--download-light))]">
                      {activeJob?.progress ?? activeJob?.progressPercentage ?? 0}%
                    </span>
                  </div>
                  <div className="w-full bg-slate-200 dark:bg-slate-800 h-2.5 rounded-full overflow-hidden">
                    <div
                      className="bg-[rgb(var(--download-accent))] h-full rounded-full transition-all duration-300"
                      style={{ width: `${activeJob ? activeJob.progress ?? activeJob.progressPercentage ?? 0 : 0}%` }}
                    />
                  </div>
                  <div className="flex justify-end pt-1">
                    <button
                      type="button"
                      onClick={handleCancelJob}
                      disabled={isCancelling}
                      className="px-4 py-1.5 rounded-xl bg-slate-200 dark:bg-slate-800 hover:bg-rose-100 dark:hover:bg-rose-950/50 hover:text-rose-600 text-slate-600 dark:text-slate-300 text-xs font-semibold transition-colors"
                    >
                      {isCancelling ? 'Cancelling...' : 'Cancel Download'}
                    </button>
                  </div>
                </div>
              )}

              {/* Completed Success State */}
              {isJobCompleted && activeJob && (
                <div className="p-5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/60 space-y-4">
                  {actualOutputBytes !== null && <p className="text-xs font-semibold text-emerald-800 dark:text-emerald-200">Actual file size: {formatBytes(actualOutputBytes)}</p>}
                  <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-300 text-sm font-bold">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                    <span>Download Ready!</span>
                  </div>
                  <div className="flex flex-col sm:flex-row gap-3">
                    <a
                      href={apiClient.getDownloadUrl(activeJob.outputFileId || activeJob.id)}
                      download
                      className="flex-1 py-3.5 px-6 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm flex items-center justify-center gap-2 shadow-sm transition-all"
                    >
                      <Download className="w-4 h-4" />
                      <span>Save to Disk</span>
                    </a>
                    <button
                      type="button"
                      onClick={handleClear}
                      className="py-3.5 px-6 rounded-xl bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-semibold text-sm transition-colors"
                    >
                      Download Another
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}


        </div>
      </div>
    </div>
  );
}

export default function DownloaderPage() {
  return (
    <Suspense fallback={<div className="p-12 text-center text-xs text-slate-500">Loading downloader...</div>}>
      <DownloaderContent />
    </Suspense>
  );
}
