'use client';

import React, { useState, useEffect, useRef, useCallback, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  Download,
  Link2,
  Youtube,
  Facebook,
  Instagram,
  Sparkles,
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
    icon: (props) => <Link2 {...props} className={props.className || 'w-4 h-4 text-purple-600'} />,
    regex: /(\.mp4|\.webm|\.m3u8|\.mp3|\.wav|\.m4a|\.mov|\.mkv)/i,
  },
];

const AUDIO_BITRATES = [
  { value: '320', label: '320 kbps', quality: 'High Quality' },
  { value: '256', label: '256 kbps', quality: 'Standard Quality' },
  { value: '192', label: '192 kbps', quality: 'Medium Quality' },
  { value: '128', label: '128 kbps', quality: 'Compact' },
];

const STANDARD_RESOLUTIONS = ['4K', '1440p', '1080p', '720p', '480p', '360p'];

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
  const mb = bytes / (1024 * 1024);
  if (mb >= 1000) {
    return `${(mb / 1024).toFixed(2)} GB`;
  }
  return `${mb.toFixed(1)} MB`;
}

function detectPlatformFromUrl(inputUrl: string, fallbackPlatform = 'direct'): string {
  if (!inputUrl) return fallbackPlatform;
  for (const p of PLATFORMS) {
    if (p.id !== 'direct' && p.regex.test(inputUrl)) {
      return p.id;
    }
  }
  return 'direct';
}

function DownloaderContent() {
  const searchParams = useSearchParams();

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

  // Optional Editing State (Collapsed by default)
  const [showEditSection, setShowEditSection] = useState(false);
  const [trimStart, setTrimStart] = useState<number>(0);
  const [trimEnd, setTrimEnd] = useState<number>(0);
  const [editAspectRatio, setEditAspectRatio] = useState<string>('original');
  const [editQualityPreset, setEditQualityPreset] = useState<string>('balanced');
  const [editVolume, setEditVolume] = useState<number>(1.0);

  // Job Submission and Polling
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeJob, setActiveJob] = useState<JobResponse | null>(null);
  const [jobError, setJobError] = useState<string | null>(null);
  const [isCancelling, setIsCancelling] = useState(false);

  const pollingRef = useRef<NodeJS.Timeout | null>(null);

  const stopPolling = useCallback(() => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
  }, []);

  useEffect(() => {
    return () => stopPolling();
  }, [stopPolling]);

  const handleUrlChange = (value: string) => {
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
      if (!validateUrl(targetUrl)) return;

      setIsProbing(true);
      setProbeError(null);
      setJobError(null);
      setActiveJob(null);
      setSizeEstimate(null);
      stopPolling();

      try {
        const data = await apiClient.getMediaMetadata({ url: targetUrl.trim() });
        setMetadata(data);

        // Format selection
        if (data.availableFormats && data.availableFormats.length > 0) {
          const nativeFmt = data.availableFormats.find((f) => f.nativeStream && !f.requiresConversion);
          setSelectedFormat(nativeFmt ? nativeFmt.format.toLowerCase() : data.availableFormats[0].format.toLowerCase());
        } else if (data.containerFormat) {
          setSelectedFormat(data.containerFormat.toLowerCase());
        } else {
          setSelectedFormat('mp4');
        }

        // Quality selection
        if (data.availableQualities && data.availableQualities.length > 0) {
          setSelectedQuality(data.availableQualities[0]);
        } else if (data.resolution) {
          setSelectedQuality(data.resolution);
        } else {
          setSelectedQuality('1080p');
        }

        if (data.duration && data.duration > 0) {
          setTrimStart(0);
          setTrimEnd(Math.round(data.duration * 10) / 10);
        }
      } catch (err: any) {
        setMetadata(null);
        setProbeError(err.message || 'Unable to inspect media. Ensure the URL is public and supported.');
      } finally {
        setIsProbing(false);
      }
    },
    [stopPolling]
  );

  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        handleUrlChange(text);
        triggerProbe(text);
      }
    } catch {
      // Clipboard read fallback
    }
  };

  // Check URL query parameters on mount or change
  useEffect(() => {
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
  }, [searchParams, triggerProbe, url]);

  // Debounced Size Estimation
  useEffect(() => {
    if (!metadata || !metadata.directDownloadSupported) {
      setSizeEstimate(null);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        setIsEstimating(true);
        const isMp3 = selectedFormat.toLowerCase() === 'mp3';
        const hasTrim = showEditSection && trimEnd > trimStart && (trimStart > 0 || trimEnd < (metadata.duration || 0));

        const est = await apiClient.estimateOutputSize({
          mediaType: isMp3 ? 'audio' : 'video',
          outputFormat: selectedFormat,
          targetResolution: isMp3 ? undefined : selectedQuality,
          audioBitrate: isMp3 ? parseInt(selectedAudioBitrate, 10) : undefined,
          sourceDuration: metadata.duration || 60,
          sourceFileSize: metadata.fileSize,
          startTime: hasTrim ? trimStart : undefined,
          endTime: hasTrim ? trimEnd : undefined,
        });
        setSizeEstimate(est);
      } catch {
        setSizeEstimate(null);
      } finally {
        setIsEstimating(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [metadata, selectedFormat, selectedQuality, selectedAudioBitrate, showEditSection, trimStart, trimEnd]);

  // Start polling background download job
  const startJobPolling = useCallback(
    (jobId: string) => {
      stopPolling();
      pollingRef.current = setInterval(async () => {
        try {
          const updated = await apiClient.getJobById(jobId);
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
      const isMp3 = selectedFormat === 'mp3';
      const hasTrim = showEditSection && trimEnd > trimStart && (trimStart > 0 || trimEnd < (metadata.duration || 0));

      const job = await apiClient.createDownloadJob({
        url: url.trim(),
        selectedFormat,
        selectedQuality: isMp3 ? `${selectedAudioBitrate}k` : selectedQuality,
        targetFormat: selectedFormat,
        targetQuality: isMp3 ? `${selectedAudioBitrate}k` : selectedQuality,
        targetResolution: isMp3 ? undefined : selectedQuality,
        audioBitrate: isMp3 ? parseInt(selectedAudioBitrate, 10) : undefined,
        startTime: hasTrim && trimStart > 0 ? trimStart : undefined,
        endTime: hasTrim && trimEnd > 0 ? trimEnd : undefined,
        aspectRatio: showEditSection && editAspectRatio !== 'original' ? editAspectRatio : undefined,
        qualityPreset: showEditSection ? editQualityPreset : undefined,
        volume: showEditSection && editVolume !== 1.0 ? editVolume : undefined,
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

  const currentPlatform = PLATFORMS.find((p) => p.id === selectedPlatform) || PLATFORMS[0];
  const isJobRunning = Boolean(activeJob && (activeJob.status === 'QUEUED' || activeJob.status === 'PROCESSING'));
  const isJobCompleted = Boolean(activeJob && activeJob.status === 'COMPLETED');
  const isMp3 = selectedFormat.toLowerCase() === 'mp3';

  // Format options: MP4, MP3, WebM + any detected format
  const availableFormatKeys = React.useMemo(() => {
    const list = ['mp4', 'mp3', 'webm'];
    if (metadata?.availableFormats) {
      metadata.availableFormats.forEach((f) => {
        const fmt = f.format.toLowerCase();
        if (!list.includes(fmt)) {
          list.push(fmt);
        }
      });
    }
    return list;
  }, [metadata]);

  // Video resolution list
  const availableResolutions = React.useMemo(() => {
    if (metadata?.availableQualities && metadata.availableQualities.length > 0) {
      return metadata.availableQualities;
    }
    if (metadata?.resolution) {
      const norm = metadata.resolution.includes('p') ? metadata.resolution : `${metadata.resolution}p`;
      if (!STANDARD_RESOLUTIONS.includes(norm)) {
        return [norm, ...STANDARD_RESOLUTIONS];
      }
    }
    return STANDARD_RESOLUTIONS;
  }, [metadata]);

  // Formatted estimation string
  const formattedEstimate = React.useMemo(() => {
    if (isEstimating) return 'Calculating...';
    if (!metadata || !metadata.directDownloadSupported) return 'File size unavailable';
    if (sizeEstimate) {
      if (sizeEstimate.formattedEstimate) return sizeEstimate.formattedEstimate;
      if (sizeEstimate.formattedEstimatedSize) return sizeEstimate.formattedEstimatedSize;
      if (sizeEstimate.estimatedBytes > 0) return `~${(sizeEstimate.estimatedBytes / (1024 * 1024)).toFixed(1)} MB`;
    }
    if (metadata.fileSize && metadata.fileSize > 0) {
      return `~${(metadata.fileSize / (1024 * 1024)).toFixed(1)} MB`;
    }
    return 'File size unavailable';
  }, [isEstimating, sizeEstimate, metadata]);

  return (
    <div className="flex flex-col w-full min-h-[calc(100vh-80px)] bg-slate-50 dark:bg-[#0B0E14] text-slate-900 dark:text-slate-100 py-8 px-4 sm:px-6 lg:px-8 transition-colors">
      <div className="w-full max-w-4xl mx-auto flex flex-col gap-6">
        {/* 1. Header */}
        <div className="text-center space-y-2">
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-slate-900 dark:text-white">
            Online Media Downloader
          </h1>
          <p className="text-sm sm:text-base text-slate-600 dark:text-slate-400 max-w-2xl mx-auto">
            Download high-quality videos and extract MP3 audio directly from supported platforms or direct media links.
          </p>
        </div>

        {/* 2. Platform Selector Tabs */}
        <div className="w-full flex items-center justify-center">
          <div className="flex items-center gap-1.5 p-1.5 bg-white dark:bg-[#111622] rounded-full border border-slate-200 dark:border-slate-800 shadow-xs overflow-x-auto max-w-full">
            {PLATFORMS.map((platform) => {
              const Icon = platform.icon;
              const isActive = selectedPlatform === platform.id;
              return (
                <button
                  key={platform.id}
                  type="button"
                  onClick={() => {
                    setSelectedPlatform(platform.id);
                    setProbeError(null);
                  }}
                  className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${
                    isActive
                      ? 'bg-purple-600 text-white shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/80'
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
        <div className="w-full bg-white dark:bg-[#111622] rounded-3xl p-6 sm:p-8 border border-slate-200/90 dark:border-slate-800 shadow-sm flex flex-col gap-6">
          {/* Centered Large URL Input */}
          <div className="flex flex-col gap-2">
            <div className="relative flex items-center">
              <input
                type="text"
                value={url}
                onChange={(e) => handleUrlChange(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && triggerProbe(url)}
                placeholder={currentPlatform.placeholder}
                className="w-full h-14 pl-5 pr-36 sm:pr-48 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white text-sm font-medium placeholder-slate-400 focus:outline-none focus:border-purple-600 focus:ring-2 focus:ring-purple-600/20 transition-all"
              />
              <div className="absolute right-2 flex items-center gap-1.5">
                {url && (
                  <button
                    type="button"
                    onClick={handleClear}
                    title="Clear input"
                    className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
                <button
                  type="button"
                  onClick={handlePaste}
                  title="Paste from clipboard"
                  className="hidden sm:flex items-center gap-1 px-3 py-2 rounded-xl bg-slate-200/80 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold transition-colors"
                >
                  <Clipboard className="w-3.5 h-3.5" />
                  <span>Paste</span>
                </button>
                <button
                  type="button"
                  onClick={() => triggerProbe(url)}
                  disabled={isProbing || !url.trim()}
                  className="h-10 px-4 sm:px-5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-semibold text-xs sm:text-sm flex items-center gap-1.5 shadow-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isProbing ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                  <span>{isProbing ? 'Analyzing...' : 'Analyze'}</span>
                </button>
              </div>
            </div>

            {/* Platform Guidance Note */}
            <p className="text-xs text-slate-500 dark:text-slate-400 px-1">
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
                      <span className="text-xs text-slate-500 dark:text-slate-400">
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
                <span className="text-xs text-slate-500 dark:text-slate-400">Select format & quality</span>
              </div>

              {/* Side-by-Side Selectors: LEFT (Format) / RIGHT (Resolution or Bitrate) */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5 items-start">
                {/* LEFT: Format */}
                <div className="flex flex-col gap-2">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Format</label>
                  <div className="grid grid-cols-3 gap-2">
                    {availableFormatKeys.map((fmt) => {
                      const isFmtActive = selectedFormat.toLowerCase() === fmt;
                      const isAudio = fmt === 'mp3';
                      return (
                        <button
                          key={fmt}
                          type="button"
                          onClick={() => setSelectedFormat(fmt)}
                          className={`py-3 px-3 rounded-xl text-center flex flex-col items-center justify-center gap-1 border transition-all ${
                            isFmtActive
                              ? 'bg-purple-600 text-white border-purple-600 shadow-xs'
                              : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-750'
                          }`}
                        >
                          <div className="flex items-center gap-1">
                            {isAudio ? <Music className="w-3.5 h-3.5" /> : <Film className="w-3.5 h-3.5" />}
                            <span className="text-xs font-extrabold uppercase">{fmt}</span>
                          </div>
                          <span
                            className={`text-[10px] font-medium ${
                              isFmtActive ? 'text-purple-200' : 'text-slate-400 dark:text-slate-500'
                            }`}
                          >
                            {isAudio ? 'Audio Only' : 'Video'}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* RIGHT: Resolution or Audio Bitrate */}
                <div className="flex flex-col gap-2">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    {isMp3 ? 'Audio Quality (Bitrate)' : 'Video Resolution'}
                  </label>

                  {isMp3 ? (
                    /* Audio Bitrate Selector */
                    <div className="grid grid-cols-2 gap-2">
                      {AUDIO_BITRATES.map((item) => {
                        const isBitrateActive = selectedAudioBitrate === item.value;
                        return (
                          <button
                            key={item.value}
                            type="button"
                            onClick={() => setSelectedAudioBitrate(item.value)}
                            className={`p-2.5 rounded-xl text-left border transition-all ${
                              isBitrateActive
                                ? 'bg-purple-600 text-white border-purple-600 shadow-xs'
                                : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-750'
                            }`}
                          >
                            <span className="text-xs font-bold block">{item.label}</span>
                            <span
                              className={`text-[10px] ${
                                isBitrateActive ? 'text-purple-200' : 'text-slate-400 dark:text-slate-500'
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
                        const isNative =
                          metadata.resolution &&
                          (qual === metadata.resolution || qual.includes(metadata.resolution.replace('p', '')));
                        return (
                          <button
                            key={qual}
                            type="button"
                            onClick={() => setSelectedQuality(qual)}
                            className={`p-2.5 rounded-xl text-left border transition-all ${
                              isQualActive
                                ? 'bg-purple-600 text-white border-purple-600 shadow-xs'
                                : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-750'
                            }`}
                          >
                            <span className="text-xs font-bold block">{qual}</span>
                            <span
                              className={`text-[10px] ${
                                isQualActive ? 'text-purple-200' : 'text-slate-400 dark:text-slate-500'
                              }`}
                            >
                              {isNative ? 'Original' : 'Transcoded'}
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
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-slate-600 dark:text-slate-400">Estimated file size:</span>
                  <span className="font-mono font-bold text-purple-600 dark:text-purple-400 text-sm">
                    {formattedEstimate}
                  </span>
                </div>
                <div className="text-slate-500 dark:text-slate-400 text-[11px]">
                  Format: <span className="font-semibold uppercase">{selectedFormat}</span> · Quality:{' '}
                  <span className="font-semibold">{isMp3 ? `${selectedAudioBitrate} kbps` : selectedQuality}</span>
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
                  className="w-full py-4 rounded-2xl bg-purple-600 hover:bg-purple-700 active:scale-[0.99] text-white font-bold text-base shadow-md shadow-purple-600/20 flex items-center justify-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Download className="w-5 h-5" />
                  <span>{isMp3 ? 'Download Audio' : 'Download Video'}</span>
                </button>
              )}

              {/* Processing Progress Bar */}
              {isJobRunning && (
                <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 space-y-3">
                  <div className="flex items-center justify-between text-xs font-semibold">
                    <span className="text-slate-700 dark:text-slate-300">
                      {activeJob?.status === 'QUEUED' ? 'Queued in buffer...' : 'Downloading and packaging media...'}
                    </span>
                    <span className="font-mono text-purple-600 dark:text-purple-400">
                      {activeJob?.progress ?? activeJob?.progressPercentage ?? 10}%
                    </span>
                  </div>
                  <div className="w-full bg-slate-200 dark:bg-slate-800 h-2.5 rounded-full overflow-hidden">
                    <div
                      className="bg-purple-600 h-full rounded-full transition-all duration-300"
                      style={{ width: `${activeJob ? activeJob.progress ?? activeJob.progressPercentage ?? 15 : 15}%` }}
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

          {/* 8. Optional "Edit Before Download" (Collapsed by default) */}
          {metadata && metadata.directDownloadSupported && (
            <div className="rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
              <button
                type="button"
                onClick={() => setShowEditSection(!showEditSection)}
                className="w-full flex items-center justify-between p-4 bg-slate-50 hover:bg-slate-100 dark:bg-slate-900/60 dark:hover:bg-slate-900 text-slate-700 dark:text-slate-300 text-xs font-bold transition-colors"
              >
                <div className="flex items-center gap-2">
                  <Scissors className="w-4 h-4 text-purple-600" />
                  <span>Edit Before Download</span>
                  <span className="px-2 py-0.5 rounded-full bg-slate-200 dark:bg-slate-800 text-[10px] text-slate-500 font-normal">
                    Optional
                  </span>
                </div>
                {showEditSection ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>

              {showEditSection && (
                <div className="p-5 bg-white dark:bg-[#111622] space-y-4 border-t border-slate-200 dark:border-slate-800">
                  {/* Trim Controls */}
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Trim Duration (Seconds)</label>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <span className="text-[11px] text-slate-500 block mb-1">Start Time (s)</span>
                        <input
                          type="number"
                          min="0"
                          step="1"
                          value={trimStart}
                          onChange={(e) => setTrimStart(Math.max(0, parseFloat(e.target.value) || 0))}
                          className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-xs font-mono focus:outline-none focus:border-purple-600"
                        />
                      </div>
                      <div>
                        <span className="text-[11px] text-slate-500 block mb-1">End Time (s)</span>
                        <input
                          type="number"
                          min={trimStart}
                          max={metadata.duration || 9999}
                          step="1"
                          value={trimEnd || metadata.duration || 60}
                          onChange={(e) => setTrimEnd(Math.max(trimStart + 1, parseFloat(e.target.value) || 0))}
                          className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-xs font-mono focus:outline-none focus:border-purple-600"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Crop / Aspect Ratio (For video only) */}
                  {!isMp3 && (
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Crop Aspect Ratio</label>
                      <div className="flex flex-wrap gap-2">
                        {['original', '16:9', '9:16', '1:1', '4:3'].map((ratio) => (
                          <button
                            key={ratio}
                            type="button"
                            onClick={() => setEditAspectRatio(ratio)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                              editAspectRatio === ratio
                                ? 'bg-purple-600 text-white border-purple-600 shadow-xs'
                                : 'bg-slate-50 dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100'
                            }`}
                          >
                            {ratio === 'original' ? 'Source Original' : ratio}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Quality Preset & Volume Tuning */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Processing Preset</label>
                      <select
                        value={editQualityPreset}
                        onChange={(e) => setEditQualityPreset(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-xs focus:outline-none focus:border-purple-600"
                      >
                        <option value="fast">Fast (Stream Remux)</option>
                        <option value="balanced">Balanced (High Quality)</option>
                        <option value="high">Master Fidelity</option>
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                        <Volume2 className="w-3.5 h-3.5" />
                        <span>Volume Factor ({Math.round(editVolume * 100)}%)</span>
                      </label>
                      <input
                        type="range"
                        min="0.5"
                        max="2.0"
                        step="0.1"
                        value={editVolume}
                        onChange={(e) => setEditVolume(parseFloat(e.target.value))}
                        className="w-full accent-purple-600 h-2 bg-slate-200 dark:bg-slate-700 rounded-lg cursor-pointer"
                      />
                    </div>
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
