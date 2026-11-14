'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Sparkles,
  Link as LinkIcon,
  Clipboard,
  Sliders,
  Download,
  Film,
  Music,
  Image as ImageIcon,
  Layers,
  Shield,
  Zap,
  CheckCircle2,
  Lock,
  ArrowRight,
  TrendingDown,
  Cpu,
  Scissors,
  Eye,
  Settings,
  HardDrive,
} from 'lucide-react';

export default function HomePage() {
  const router = useRouter();
  const [mediaUrl, setMediaUrl] = useState('');
  const [quickFormat, setQuickFormat] = useState('auto');

  // Interactive Size Estimator State
  const [bitrate, setBitrate] = useState(4500);
  const [codec, setCodec] = useState<'h264' | 'av1'>('h264');
  const [audioBitrate, setAudioBitrate] = useState(192);
  const durationSeconds = 42;
  const originalBaselineMB = 39.5;

  const codecFactor = codec === 'av1' ? 0.72 : 1.0;
  const totalKbps = bitrate * codecFactor + audioBitrate;
  const estimatedMB = (totalKbps * durationSeconds) / 8192;
  const diffPercent = Math.round(((estimatedMB - originalBaselineMB) / originalBaselineMB) * 100);

  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) setMediaUrl(text);
    } catch {
      // Fallback
    }
  };

  const handleDownloadEdit = () => {
    if (mediaUrl.trim()) {
      router.push(`/downloader?url=${encodeURIComponent(mediaUrl.trim())}&format=${quickFormat}`);
    } else {
      router.push('/downloader');
    }
  };

  return (
    <div className="flex flex-col w-full min-h-[calc(100vh-80px)]">
      {/* Top Ambient Glow & Hero */}
      <div className="relative w-full max-w-7xl mx-auto px-gutter pt-8 pb-14 overflow-hidden">
        <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-[680px] h-[360px] bg-gradient-to-tr from-primary/15 via-secondary/10 to-transparent blur-3xl pointer-events-none -z-10 rounded-full" />

        <div className="flex flex-col items-center text-center max-w-4xl mx-auto space-y-6">
          {/* Feature Pill Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-surface-container-low dark:bg-slate-900/80 border border-outline-variant/30 text-primary shadow-sm">
            <Zap className="w-4 h-4 text-primary animate-pulse" />
            <span className="font-semibold text-xs tracking-wide uppercase">Browser-Native & FFmpeg 7.0 Engine</span>
            <span className="w-1.5 h-1.5 rounded-full bg-tertiary-container animate-ping" />
            <span className="font-mono text-xs text-on-surface-variant font-medium">Zero Upload Latency</span>
          </div>

          {/* Headline */}
          <h1 className="text-4xl sm:text-6xl font-extrabold text-on-surface tracking-tight leading-tight">
            Your Media.{' '}
            <span className="bg-gradient-to-r from-primary via-primary-container to-secondary bg-clip-text text-transparent">
              Your Way.
            </span>
          </h1>

          <p className="text-base sm:text-lg text-on-surface-variant max-w-2xl mx-auto leading-relaxed">
            Download authorized stream media, edit tracks and timelines locally with millisecond precision, and convert
            instantly with real-time payload sizing.
          </p>

          {/* Quick Action Dropper & Input Bar */}
          <div className="w-full max-w-3xl pt-2">
            <div className="p-2 sm:p-2.5 rounded-full bg-surface-container-lowest dark:bg-slate-900 border border-outline-variant/30 shadow-xl flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
              <div className="relative flex-1 flex items-center pl-4 pr-2">
                <LinkIcon className="w-5 h-5 text-outline mr-2 shrink-0" />
                <input
                  type="url"
                  value={mediaUrl}
                  onChange={(e) => setMediaUrl(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleDownloadEdit()}
                  placeholder="Paste video, audio, or direct stream link..."
                  className="w-full bg-transparent text-sm text-on-surface placeholder:text-outline focus:outline-none"
                />
                <button
                  type="button"
                  onClick={handlePaste}
                  title="Paste from clipboard"
                  className="flex items-center gap-1 px-3 py-1.5 rounded-full bg-surface-container-low dark:bg-slate-800 hover:bg-surface-container dark:hover:bg-slate-700 text-on-surface text-xs font-semibold transition-colors shrink-0"
                >
                  <Clipboard className="w-3.5 h-3.5 text-primary" />
                  <span className="hidden sm:inline">Paste</span>
                </button>
              </div>

              <div className="hidden sm:block w-px h-8 bg-surface-container-high dark:bg-slate-800" />

              {/* Format Dropdown */}
              <div className="relative flex items-center px-2">
                <select
                  value={quickFormat}
                  onChange={(e) => setQuickFormat(e.target.value)}
                  className="appearance-none bg-surface-container-low dark:bg-slate-800 text-on-surface text-xs font-semibold rounded-full py-2.5 pl-4 pr-8 focus:outline-none cursor-pointer hover:bg-surface-container dark:hover:bg-slate-700 transition-colors"
                >
                  <option value="auto">Auto-detect</option>
                  <option value="mp4-1080">MP4 (1080p FHD)</option>
                  <option value="mp3-320">MP3 (320 kbps Master)</option>
                  <option value="webp">WebP (Optimized)</option>
                  <option value="avif">AVIF (Next-Gen)</option>
                </select>
              </div>

              {/* Primary Action Button */}
              <button
                type="button"
                onClick={handleDownloadEdit}
                className="flex items-center justify-center gap-2 px-6 py-3 rounded-full bg-primary-container hover:bg-primary text-white font-semibold text-sm transition-all shadow-md shadow-primary/25 active:scale-95 shrink-0"
              >
                <Sparkles className="w-4 h-4" />
                <span>Download & Edit</span>
              </button>
            </div>

            {/* Subtle Drop Zone Link */}
            <Link
              href="/converter/video"
              className="mt-3 py-2.5 px-6 rounded-2xl bg-surface-container-low dark:bg-slate-900/50 hover:bg-surface-container dark:hover:bg-slate-800/80 text-on-surface-variant flex items-center justify-center gap-2 cursor-pointer transition-colors group text-xs"
            >
              <Film className="w-4 h-4 text-outline group-hover:text-primary transition-colors" />
              <span>
                or <strong className="font-semibold text-on-surface">open media files directly</strong> (supports Video, Audio,
                Images with Zero Upload Latency)
              </span>
            </Link>
          </div>

          {/* Quick Nav CTA Buttons */}
          <div className="flex flex-wrap items-center justify-center gap-4 pt-2">
            <Link
              href="/converter/video"
              className="flex items-center gap-2 px-7 h-12 rounded-full bg-primary-container text-white font-semibold text-sm hover:bg-primary transition-all shadow-md shadow-primary/20 hover:scale-[1.02] active:scale-95"
            >
              <Scissors className="w-4 h-4" />
              <span>Start Editing</span>
            </Link>
            <Link
              href="/downloader"
              className="flex items-center gap-2 px-6 h-12 rounded-full bg-surface-container-lowest dark:bg-slate-900 text-secondary border border-outline-variant/30 font-semibold text-sm hover:bg-surface-container-low dark:hover:bg-slate-800 transition-all shadow-sm hover:scale-[1.02] active:scale-95"
            >
              <Download className="w-4 h-4 text-secondary" />
              <span>Download Media</span>
            </Link>
          </div>
        </div>
      </div>

      {/* Realtime Metric Status Ticker Strip */}
      <div className="w-full bg-surface-container-low dark:bg-slate-900/80 border-y border-outline-variant/20 py-3">
        <div className="max-w-7xl mx-auto px-gutter flex flex-wrap items-center justify-between gap-4 font-mono text-xs text-on-surface-variant">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-tertiary-container animate-pulse" />
            <span className="text-on-surface font-semibold">Engine Status:</span>
            <span>Spring Boot 3.4 + FFmpeg 7.0 · Port 8081 Active</span>
          </div>
          <div className="flex items-center gap-6">
            <span className="flex items-center gap-1.5">
              <Lock className="w-3.5 h-3.5 text-tertiary" />
              <span>Private: Zero Cloud Uploads</span>
            </span>
            <span className="hidden md:flex items-center gap-1.5">
              <Cpu className="w-3.5 h-3.5 text-primary" />
              <span>Hardware Accel: Multi-Threaded SIMD</span>
            </span>
            <span className="flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5 text-secondary" />
              <span>Lossless Stream Extraction</span>
            </span>
          </div>
        </div>
      </div>

      {/* Core Studio Suite (Bento 2x2 Grid) */}
      <section className="max-w-7xl mx-auto px-gutter py-16 w-full" id="tools-suite">
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-10 gap-4">
          <div>
            <div className="flex items-center gap-2 text-primary text-xs font-bold uppercase tracking-wider mb-2">
              <Settings className="w-4 h-4 text-primary" />
              <span>Integrated Studio Suite</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-on-surface tracking-tight">
              Powerful Media Instruments in Your Browser
            </h2>
          </div>
          <p className="text-sm text-on-surface-variant max-w-md">
            Every tool operates completely database-free with zero queue times, zero watermarks, and 24-hour ephemeral retention.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Card 1: Video Editor */}
          <div className="group relative rounded-3xl bg-surface-container-lowest dark:bg-slate-900 border border-outline-variant/30 p-8 shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col justify-between overflow-hidden">
            <div className="absolute -right-16 -top-16 w-44 h-44 rounded-full bg-primary/5 group-hover:scale-125 transition-transform duration-500" />
            <div>
              <div className="flex items-center justify-between mb-6">
                <div className="w-12 h-12 rounded-2xl bg-primary-fixed/50 dark:bg-slate-800 text-primary flex items-center justify-center shadow-inner">
                  <Film className="w-6 h-6 text-primary" />
                </div>
                <div className="px-3 py-1 rounded-full bg-surface-container-low dark:bg-slate-800 text-primary font-semibold text-xs">
                  MP4 · WebM · MOV · MKV
                </div>
              </div>
              <h3 className="text-xl font-bold text-on-surface mb-2">Video Editor</h3>
              <p className="text-sm text-on-surface-variant mb-6 leading-relaxed">
                Trim, split, crop, resize & convert video. Microsecond scrubbing, canvas aspect ratios, and full resolution overrides.
              </p>

              {/* Interactive Micro-Preview Element */}
              <div className="rounded-2xl bg-surface-container-low dark:bg-slate-950/60 p-4 mb-6 border border-outline-variant/20">
                <div className="flex items-center justify-between mb-3 text-xs text-on-surface-variant">
                  <span className="flex items-center gap-1.5 font-medium">
                    <Sliders className="w-3.5 h-3.5 text-primary" />
                    Aspect Canvas
                  </span>
                  <span className="font-mono font-semibold text-tertiary">Estimated: ~45.2 MB</span>
                </div>
                <div className="grid grid-cols-4 gap-2 mb-3">
                  <span className="py-1.5 rounded-full bg-surface-container-lowest dark:bg-slate-800 text-on-surface text-xs font-semibold text-center shadow-xs">
                    16:9
                  </span>
                  <span className="py-1.5 rounded-full text-on-surface-variant text-xs text-center">9:16</span>
                  <span className="py-1.5 rounded-full text-on-surface-variant text-xs text-center">1:1</span>
                  <span className="py-1.5 rounded-full text-on-surface-variant text-xs text-center">4:3</span>
                </div>
                {/* Visual Timeline Track */}
                <div className="relative h-7 bg-surface-container-high dark:bg-slate-800 rounded-lg overflow-hidden flex items-center px-2">
                  <div className="absolute left-6 right-12 top-1 bottom-1 bg-primary/25 rounded" />
                  <div className="absolute left-6 top-0 bottom-0 w-1 bg-primary" />
                  <div className="absolute right-12 top-0 bottom-0 w-1 bg-primary" />
                  <div className="w-full flex justify-between font-mono text-[11px] text-outline z-10 select-none">
                    <span>00:00.00</span>
                    <span className="text-primary font-semibold">00:14.32</span>
                    <span>01:20.00</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="pt-2 flex items-center justify-between">
              <div className="flex items-center gap-2 font-mono text-xs text-on-surface-variant">
                <span className="px-2 py-0.5 rounded bg-surface-container dark:bg-slate-800 text-on-surface font-semibold">
                  4K / 1080p
                </span>
                <span>H.264 / AV1</span>
              </div>
              <Link
                href="/converter/video"
                className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary hover:text-primary-container transition-colors"
              >
                <span>Open Video Editor</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>

          {/* Card 2: Audio Editor */}
          <div className="group relative rounded-3xl bg-surface-container-lowest dark:bg-slate-900 border border-outline-variant/30 p-8 shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col justify-between overflow-hidden">
            <div className="absolute -right-16 -top-16 w-44 h-44 rounded-full bg-secondary/5 group-hover:scale-125 transition-transform duration-500" />
            <div>
              <div className="flex items-center justify-between mb-6">
                <div className="w-12 h-12 rounded-2xl bg-secondary-fixed/50 dark:bg-slate-800 text-secondary flex items-center justify-center shadow-inner">
                  <Music className="w-6 h-6 text-secondary" />
                </div>
                <div className="px-3 py-1 rounded-full bg-surface-container-low dark:bg-slate-800 text-secondary font-semibold text-xs">
                  MP3 · WAV · AAC · FLAC
                </div>
              </div>
              <h3 className="text-xl font-bold text-on-surface mb-2">Audio Editor</h3>
              <p className="text-sm text-on-surface-variant mb-6 leading-relaxed">
                Visual waveform multi-scrub, splice unwanted segments, smooth fade curves, and dial precision bitrates up to 320 kbps.
              </p>

              {/* Interactive Waveform Preview */}
              <div className="rounded-2xl bg-surface-container-low dark:bg-slate-950/60 p-4 mb-6 border border-outline-variant/20">
                <div className="flex items-center justify-between mb-3 text-xs text-on-surface-variant">
                  <span className="flex items-center gap-1.5 font-medium">
                    <Zap className="w-3.5 h-3.5 text-secondary" />
                    Waveform Analyzer (Stereo)
                  </span>
                  <span className="font-mono font-semibold text-on-surface">320 kbps · 48 kHz</span>
                </div>
                <div className="h-14 bg-surface-container-lowest dark:bg-slate-900 rounded-xl p-2 flex items-center justify-between gap-1 shadow-inner relative overflow-hidden">
                  {[16, 32, 40, 20, 36, 48, 28, 44, 24, 40, 16, 32, 48, 20, 28, 12].map((height, i) => (
                    <div
                      key={i}
                      className="w-1.5 rounded-full bg-secondary/70 group-hover:bg-primary transition-colors"
                      style={{ height: `${height}px` }}
                    />
                  ))}
                  <div className="absolute left-1/2 top-0 bottom-0 w-0.5 bg-primary shadow-sm flex flex-col items-center">
                    <div className="w-2 h-2 rounded-full bg-primary -mt-0.5" />
                  </div>
                </div>
                <div className="flex items-center justify-between mt-2 text-xs text-on-surface-variant font-medium">
                  <span>Fade In: <strong className="text-on-surface">1.2s</strong></span>
                  <span>Fade Out: <strong className="text-on-surface">2.4s</strong></span>
                  <span>Trim: <strong className="text-tertiary">Active</strong></span>
                </div>
              </div>
            </div>

            <div className="pt-2 flex items-center justify-between">
              <span className="font-mono text-xs text-on-surface-variant">24-bit Lossless Studio Export</span>
              <Link
                href="/converter/audio"
                className="inline-flex items-center gap-1.5 text-sm font-semibold text-secondary hover:text-secondary-container transition-colors"
              >
                <span>Open Audio Editor</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>

          {/* Card 3: Image Editor */}
          <div className="group relative rounded-3xl bg-surface-container-lowest dark:bg-slate-900 border border-outline-variant/30 p-8 shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col justify-between overflow-hidden">
            <div className="absolute -right-16 -top-16 w-44 h-44 rounded-full bg-tertiary/5 group-hover:scale-125 transition-transform duration-500" />
            <div>
              <div className="flex items-center justify-between mb-6">
                <div className="w-12 h-12 rounded-2xl bg-tertiary-fixed/50 dark:bg-slate-800 text-tertiary flex items-center justify-center shadow-inner">
                  <ImageIcon className="w-6 h-6 text-tertiary" />
                </div>
                <div className="px-3 py-1 rounded-full bg-surface-container-low dark:bg-slate-800 text-tertiary font-semibold text-xs">
                  WebP · AVIF · PNG · JPG
                </div>
              </div>
              <h3 className="text-xl font-bold text-on-surface mb-2">Image Editor</h3>
              <p className="text-sm text-on-surface-variant mb-6 leading-relaxed">
                Freeform crop overlay, aspect presets, rotation/flip, lossless conversions, and instant side-by-side compression previews.
              </p>

              {/* Before/After Preview */}
              <div className="rounded-2xl bg-surface-container-low dark:bg-slate-950/60 p-4 mb-6 border border-outline-variant/20">
                <div className="flex items-center justify-between mb-3 text-xs text-on-surface-variant">
                  <span className="flex items-center gap-1.5 font-medium">
                    <Sliders className="w-3.5 h-3.5 text-tertiary" />
                    AVIF / WebP Density
                  </span>
                  <span className="font-mono text-tertiary font-bold">-76% Smaller</span>
                </div>
                <div className="grid grid-cols-2 gap-3 mb-2">
                  <div className="bg-surface-container-lowest dark:bg-slate-900 rounded-xl p-3 flex flex-col items-center justify-center text-center">
                    <span className="text-[10px] uppercase text-outline font-semibold mb-1">Source JPG</span>
                    <span className="font-mono text-sm font-semibold text-on-surface">4.82 MB</span>
                    <span className="text-xs text-on-surface-variant">3840 x 2160</span>
                  </div>
                  <div className="bg-surface-container-lowest dark:bg-slate-900 rounded-xl p-3 flex flex-col items-center justify-center text-center shadow-sm">
                    <span className="text-[10px] uppercase text-tertiary font-bold mb-1">Target WebP</span>
                    <span className="font-mono text-sm font-bold text-tertiary">1.15 MB</span>
                    <span className="text-xs text-tertiary font-medium">Visually Lossless</span>
                  </div>
                </div>
                <div className="flex items-center justify-between text-xs text-on-surface-variant">
                  <span>Quality Factor: 85%</span>
                  <span>ICC Profile: sRGB Intact</span>
                </div>
              </div>
            </div>

            <div className="pt-2 flex items-center justify-between">
              <span className="font-mono text-xs text-on-surface-variant">EXIF Scrubbing Included</span>
              <Link
                href="/converter/image"
                className="inline-flex items-center gap-1.5 text-sm font-semibold text-tertiary hover:text-tertiary-container transition-colors"
              >
                <span>Open Image Editor</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>

          {/* Card 4: Online Downloader */}
          <div className="group relative rounded-3xl bg-surface-container-lowest dark:bg-slate-900 border border-outline-variant/30 p-8 shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col justify-between overflow-hidden">
            <div className="absolute -right-16 -top-16 w-44 h-44 rounded-full bg-secondary-container/10 group-hover:scale-125 transition-transform duration-500" />
            <div>
              <div className="flex items-center justify-between mb-6">
                <div className="w-12 h-12 rounded-2xl bg-secondary-fixed/50 dark:bg-slate-800 text-secondary-container flex items-center justify-center shadow-inner">
                  <Download className="w-6 h-6 text-secondary-container" />
                </div>
                <div className="px-3 py-1 rounded-full bg-surface-container-low dark:bg-slate-800 text-secondary-container font-semibold text-xs">
                  1080p / 4K Stream Ready
                </div>
              </div>
              <h3 className="text-xl font-bold text-on-surface mb-2">Online Downloader</h3>
              <p className="text-sm text-on-surface-variant mb-6 leading-relaxed">
                Fetch streams from supported public web links, split high-definition video or crystal audio, then hand off directly to trim.
              </p>

              {/* Stream Demuxing Preview */}
              <div className="rounded-2xl bg-surface-container-low dark:bg-slate-950/60 p-4 mb-6 border border-outline-variant/20">
                <div className="flex items-center justify-between mb-3 text-xs text-on-surface-variant">
                  <span className="flex items-center gap-1.5 font-medium">
                    <Zap className="w-3.5 h-3.5 text-secondary" />
                    Stream Demuxing
                  </span>
                  <span className="px-2 py-0.5 rounded-full bg-surface-container-highest dark:bg-slate-800 text-on-surface text-xs font-semibold">
                    Adaptive HLS
                  </span>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between p-2 rounded-xl bg-surface-container-lowest dark:bg-slate-900">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-tertiary" />
                      <span className="text-xs font-semibold text-on-surface">Video Stream (4K H.264)</span>
                    </div>
                    <span className="font-mono text-xs text-on-surface-variant">3840x2160 · 60fps</span>
                  </div>
                  <div className="flex items-center justify-between p-2 rounded-xl bg-surface-container-lowest dark:bg-slate-900">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-tertiary" />
                      <span className="text-xs font-semibold text-on-surface">Audio Track (Opus 160k)</span>
                    </div>
                    <span className="font-mono text-xs text-on-surface-variant">48,000 Hz Stereo</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="pt-2 flex items-center justify-between">
              <span className="font-mono text-xs text-on-surface-variant">Direct Browser Demuxer</span>
              <Link
                href="/downloader"
                className="inline-flex items-center gap-1.5 text-sm font-semibold text-secondary hover:text-secondary-container transition-colors"
              >
                <span>Launch Downloader</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Interactive Workflow & Real-Time Estimation Section */}
      <section className="w-full bg-surface-container-low dark:bg-slate-950/60 py-16 border-t border-outline-variant/20">
        <div className="max-w-7xl mx-auto px-gutter flex flex-col space-y-12">
          {/* Section Header */}
          <div className="text-center max-w-2xl mx-auto">
            <span className="text-xs font-bold text-primary uppercase tracking-wider">Predictable Workflow</span>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-on-surface mt-2">Zero Surprises. Real-Time Size Math.</h2>
            <p className="text-sm text-on-surface-variant mt-2 leading-relaxed">
              From incoming link to local export in five simple stages, recalculating file weight at every slider notch.
            </p>
          </div>

          {/* Linear Stepper Track */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 relative">
            {/* Step 1 */}
            <div className="p-5 rounded-2xl bg-surface-container-lowest dark:bg-slate-900 border border-outline-variant/30 shadow-sm flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <span className="w-8 h-8 rounded-full bg-primary-fixed text-on-primary-fixed font-mono text-xs font-bold flex items-center justify-center">
                    01
                  </span>
                  <LinkIcon className="w-5 h-5 text-outline" />
                </div>
                <h4 className="text-sm font-bold text-on-surface mb-1">Upload or Paste</h4>
                <p className="text-xs text-on-surface-variant leading-relaxed">
                  Drop local media files or stream URLs for instant demuxing.
                </p>
              </div>
              <div className="mt-4 pt-3 border-t border-surface-container-high dark:border-slate-800 flex items-center gap-1.5 text-tertiary text-xs font-semibold">
                <span className="w-1.5 h-1.5 rounded-full bg-tertiary-container" />
                <span>Local Memory Load</span>
              </div>
            </div>

            {/* Step 2 */}
            <div className="p-5 rounded-2xl bg-surface-container-lowest dark:bg-slate-900 border border-outline-variant/30 shadow-sm flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <span className="w-8 h-8 rounded-full bg-primary-fixed text-on-primary-fixed font-mono text-xs font-bold flex items-center justify-center">
                    02
                  </span>
                  <Scissors className="w-5 h-5 text-outline" />
                </div>
                <h4 className="text-sm font-bold text-on-surface mb-1">Edit & Splice</h4>
                <p className="text-xs text-on-surface-variant leading-relaxed">
                  Set in/out marks, crop unwanted frame pixels, and shape fades.
                </p>
              </div>
              <div className="mt-4 pt-3 border-t border-surface-container-high dark:border-slate-800 flex items-center gap-1.5 text-primary text-xs font-semibold">
                <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                <span>Millisecond Sync</span>
              </div>
            </div>

            {/* Step 3 */}
            <div className="p-5 rounded-2xl bg-surface-container-lowest dark:bg-slate-900 border border-outline-variant/30 shadow-sm flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <span className="w-8 h-8 rounded-full bg-primary-fixed text-on-primary-fixed font-mono text-xs font-bold flex items-center justify-center">
                    03
                  </span>
                  <Sliders className="w-5 h-5 text-outline" />
                </div>
                <h4 className="text-sm font-bold text-on-surface mb-1">Choose Quality</h4>
                <p className="text-xs text-on-surface-variant leading-relaxed">
                  Configure target bitrates, container formats, and audio channels.
                </p>
              </div>
              <div className="mt-4 pt-3 border-t border-surface-container-high dark:border-slate-800 flex items-center gap-1.5 text-secondary text-xs font-semibold">
                <span className="w-1.5 h-1.5 rounded-full bg-secondary" />
                <span>CRF / Bitrate Control</span>
              </div>
            </div>

            {/* Step 4 (Active/Highlighted) */}
            <div className="p-5 rounded-2xl bg-surface-container-lowest dark:bg-slate-900 shadow-md ring-2 ring-primary border border-primary/50 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <span className="w-8 h-8 rounded-full bg-primary-container text-white font-mono text-xs font-bold flex items-center justify-center">
                    04
                  </span>
                  <TrendingDown className="w-5 h-5 text-primary" />
                </div>
                <h4 className="text-sm font-bold text-primary mb-1">See Estimated Size</h4>
                <p className="text-xs text-on-surface-variant leading-relaxed">
                  Dynamic calculation reacts instantly to every toggle or slider move.
                </p>
              </div>
              <div className="mt-4 pt-3 border-t border-surface-container-high dark:border-slate-800 flex items-center gap-1.5 text-primary text-xs font-bold">
                <span className="w-1.5 h-1.5 rounded-full bg-primary animate-ping" />
                <span>Reactive Pipeline</span>
              </div>
            </div>

            {/* Step 5 */}
            <div className="p-5 rounded-2xl bg-surface-container-lowest dark:bg-slate-900 border border-outline-variant/30 shadow-sm flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <span className="w-8 h-8 rounded-full bg-primary-fixed text-on-primary-fixed font-mono text-xs font-bold flex items-center justify-center">
                    05
                  </span>
                  <Download className="w-5 h-5 text-outline" />
                </div>
                <h4 className="text-sm font-bold text-on-surface mb-1">Export File</h4>
                <p className="text-xs text-on-surface-variant leading-relaxed">
                  Download locally rendered output directly to your disk.
                </p>
              </div>
              <div className="mt-4 pt-3 border-t border-surface-container-high dark:border-slate-800 flex items-center gap-1.5 text-on-surface-variant text-xs font-semibold">
                <span className="w-1.5 h-1.5 rounded-full bg-tertiary" />
                <span>Direct Save</span>
              </div>
            </div>
          </div>

          {/* Live Interactive Size Estimator Spotlight Card */}
          <div className="rounded-3xl bg-surface-container-lowest dark:bg-slate-900 border border-outline-variant/30 p-8 shadow-lg max-w-4xl mx-auto w-full">
            <div className="flex flex-col lg:flex-row items-center justify-between gap-8">
              {/* Controls Column */}
              <div className="w-full lg:w-3/5 space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-xs font-bold text-primary uppercase">Interactive Sizing Demo</span>
                    <h3 className="text-xl font-bold text-on-surface">Simulate Video Encode</h3>
                  </div>
                  <span className="px-3 py-1 rounded-full bg-surface-container dark:bg-slate-800 text-on-surface font-mono text-xs">
                    Duration: 42s
                  </span>
                </div>

                {/* Bitrate Slider */}
                <div className="space-y-2">
                  <div className="flex justify-between items-center text-xs font-semibold">
                    <span className="text-on-surface">Video Bitrate Control</span>
                    <span className="font-mono text-primary font-bold">
                      {bitrate.toLocaleString()} kbps ({bitrate > 8000 ? 'Master' : bitrate > 3500 ? '1080p FHD' : 'Compact 720p'})
                    </span>
                  </div>
                  <input
                    type="range"
                    min="1000"
                    max="12000"
                    step="250"
                    value={bitrate}
                    onChange={(e) => setBitrate(parseInt(e.target.value, 10))}
                    className="w-full accent-primary h-2 bg-surface-container-high dark:bg-slate-800 rounded-lg cursor-pointer"
                  />
                  <div className="flex justify-between text-[11px] font-mono text-outline">
                    <span>1,000 kbps (Compact)</span>
                    <span>6,000 kbps</span>
                    <span>12,000 kbps (Master)</span>
                  </div>
                </div>

                {/* Codec & Audio Selectors */}
                <div className="grid grid-cols-2 gap-3 pt-2">
                  <div>
                    <label className="block text-xs font-medium text-on-surface-variant mb-1.5">Codec Architecture</label>
                    <div className="flex rounded-full bg-surface-container dark:bg-slate-800 p-1 text-center text-xs">
                      <button
                        type="button"
                        onClick={() => setCodec('h264')}
                        className={`w-1/2 py-1.5 rounded-full transition-all font-semibold ${
                          codec === 'h264'
                            ? 'bg-surface-container-lowest dark:bg-slate-700 text-on-surface shadow-xs'
                            : 'text-on-surface-variant hover:text-on-surface'
                        }`}
                      >
                        H.264
                      </button>
                      <button
                        type="button"
                        onClick={() => setCodec('av1')}
                        className={`w-1/2 py-1.5 rounded-full transition-all font-semibold ${
                          codec === 'av1'
                            ? 'bg-surface-container-lowest dark:bg-slate-700 text-on-surface shadow-xs'
                            : 'text-on-surface-variant hover:text-on-surface'
                        }`}
                      >
                        AV1 (-28%)
                      </button>
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-on-surface-variant mb-1.5">Audio Track</label>
                    <div className="flex rounded-full bg-surface-container dark:bg-slate-800 p-1 text-center text-xs">
                      <button
                        type="button"
                        onClick={() => setAudioBitrate(192)}
                        className={`w-1/2 py-1.5 rounded-full transition-all font-semibold ${
                          audioBitrate === 192
                            ? 'bg-surface-container-lowest dark:bg-slate-700 text-on-surface shadow-xs'
                            : 'text-on-surface-variant hover:text-on-surface'
                        }`}
                      >
                        192 kbps
                      </button>
                      <button
                        type="button"
                        onClick={() => setAudioBitrate(320)}
                        className={`w-1/2 py-1.5 rounded-full transition-all font-semibold ${
                          audioBitrate === 320
                            ? 'bg-surface-container-lowest dark:bg-slate-700 text-on-surface shadow-xs'
                            : 'text-on-surface-variant hover:text-on-surface'
                        }`}
                      >
                        320 kbps
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Estimation Metric Box */}
              <div className="w-full lg:w-2/5 p-6 rounded-2xl bg-surface-container-low dark:bg-slate-950/60 border border-outline-variant/30 flex flex-col justify-center items-center text-center space-y-3">
                <span className="text-xs uppercase tracking-wider text-outline font-semibold">Calculated Output Payload</span>
                <div className="flex items-baseline justify-center gap-1.5">
                  <span className="text-4xl font-extrabold text-primary font-mono">~{estimatedMB.toFixed(1)}</span>
                  <span className="text-xl font-bold text-primary">MB</span>
                </div>
                <div
                  className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full font-mono text-xs font-bold ${
                    diffPercent < 0
                      ? 'bg-tertiary-fixed text-on-tertiary-fixed-variant'
                      : 'bg-surface-container-highest text-on-surface'
                  }`}
                >
                  <TrendingDown className="w-3.5 h-3.5" />
                  <span>{diffPercent < 0 ? `${diffPercent}% vs original` : `+${diffPercent}% vs original`}</span>
                </div>
                <p className="text-xs text-outline max-w-[220px] leading-relaxed">
                  Mathematical duration × bitrate calculation with container overhead modeling.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* High-Trust Privacy Guarantee Banner */}
      <section className="max-w-7xl mx-auto px-gutter py-12 w-full">
        <div className="rounded-3xl bg-surface-container-high dark:bg-slate-900 border border-outline-variant/30 p-8 sm:p-10 flex flex-col md:flex-row items-center justify-between gap-6 shadow-sm">
          <div className="flex items-center gap-5">
            <div className="w-14 h-14 rounded-2xl bg-surface-container-lowest dark:bg-slate-800 text-primary flex items-center justify-center shadow-sm shrink-0">
              <Shield className="w-8 h-8 text-primary" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-on-surface mb-1">100% Database-Free & Client-Side Privacy</h3>
              <p className="text-sm text-on-surface-variant leading-relaxed">
                MediaForge does not require accounts, logins, or user databases. All processing is isolated and ephemeral.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <div className="px-4 py-2 rounded-full bg-surface-container-lowest dark:bg-slate-800 text-on-surface text-xs font-semibold shadow-sm flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-tertiary" />
              <span>Air-Gapped Compatible</span>
            </div>
            <Link
              href="/privacy"
              className="px-5 py-2.5 rounded-full bg-primary-container text-white text-xs font-semibold hover:bg-primary transition-colors shadow-sm"
            >
              Security Specs
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
