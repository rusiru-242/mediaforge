'use client';

import React from 'react';
import Link from 'next/link';
import {
  Link as LinkIcon,
  Sliders,
  Download,
  Film,
  Music,
  Image as ImageIcon,
  Shield,
  Zap,
  CheckCircle2,
  ArrowRight,
  Scissors,
  Settings,
  Monitor,
  Smartphone,
} from 'lucide-react';

export default function HomePage() {
  return (
    <div className="home-page flex flex-col w-full min-h-[calc(100vh-80px)] text-slate-900 dark:text-slate-100">
      {/* Top Ambient Glow & Hero */}
      <div className="relative w-full max-w-7xl mx-auto px-gutter pt-28 sm:pt-32 pb-8 sm:pb-10 overflow-hidden">
        <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-[680px] h-[360px] bg-gradient-to-tr from-primary/15 via-secondary/10 to-transparent blur-3xl pointer-events-none -z-10 rounded-full" />

        <div className="flex flex-col items-center text-center max-w-4xl mx-auto space-y-5 sm:space-y-6">
          {/* Headline */}
          <h1 className="text-4xl sm:text-6xl font-extrabold text-on-surface tracking-tight leading-tight">
            Your Media.{' '}
            <span className="bg-gradient-to-r from-primary via-primary-container to-secondary bg-clip-text text-transparent">
              Your Way.
            </span>
          </h1>

          <p className="text-base sm:text-lg text-on-surface-variant max-w-2xl mx-auto leading-relaxed">
            Download authorized stream media, edit tracks and timelines locally with millisecond precision, and convert
            your media in one place.
          </p>

          {/* Quick Nav CTA Buttons */}
          <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-4 pt-1 sm:pt-2">
            <Link
              href="/converter/video"
              className="flex items-center gap-2 px-8 h-[52px] rounded-full bg-primary-container text-white font-semibold text-base hover:bg-primary transition-all shadow-md shadow-primary/20 hover:scale-[1.02] active:scale-95"
            >
              <Scissors className="w-4 h-4" />
              <span>Start Editing</span>
            </Link>
            <Link
              href="/downloader"
              className="flex items-center gap-2 px-7 h-[52px] rounded-full bg-surface-container-lowest dark:bg-slate-900 text-secondary border border-outline-variant/30 font-semibold text-base hover:bg-surface-container-low dark:hover:bg-slate-800 transition-all shadow-sm hover:scale-[1.02] active:scale-95"
            >
              <Download className="w-4 h-4 text-secondary" />
              <span>Download Media</span>
            </Link>
          </div>
          <div className="w-full max-w-xl pt-2 sm:pt-3">
            <p className="text-sm font-medium text-on-surface-variant mb-3">Get the MediaForge app</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <a
                href="https://github.com/rusiru-242/mediaforge/blob/release/v1.0.0/releases/MediaForge-Setup-v1.0.exe"
                download="MediaForge-Setup-v1.0.exe"
                aria-label="Download MediaForge for Windows"
                className="flex items-center gap-3 rounded-2xl border border-outline-variant/40 bg-surface-container-lowest dark:bg-slate-900 px-4 py-3 text-left text-slate-900 dark:text-slate-100 hover:border-primary hover:bg-primary/5 dark:hover:bg-slate-800 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 dark:focus-visible:ring-offset-slate-950"
              >
                <Monitor className="w-5 h-5 text-primary shrink-0" aria-hidden="true" />
                <span className="flex-1 min-w-0">
                  <span className="block text-sm font-semibold">Download for Windows</span>
                  <span className="block text-xs text-on-surface-variant mt-0.5">Windows 11 · Installer</span>
                </span>
                <Download className="w-4 h-4 text-primary shrink-0" aria-hidden="true" />
              </a>
              <a
                href="https://github.com/rusiru-242/mediaforge/blob/release/v1.0.0/releases/MediaForge-v1.0.0.apk"
                download="MediaForge-v1.0.0.apk"
                aria-label="Download MediaForge for Android"
                className="flex items-center gap-3 rounded-2xl border border-outline-variant/40 bg-surface-container-lowest dark:bg-slate-900 px-4 py-3 text-left text-slate-900 dark:text-slate-100 hover:border-primary hover:bg-primary/5 dark:hover:bg-slate-800 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 dark:focus-visible:ring-offset-slate-950"
              >
                <Smartphone className="w-5 h-5 text-primary shrink-0" aria-hidden="true" />
                <span className="flex-1 min-w-0">
                  <span className="block text-sm font-semibold">Download for Android</span>
                  <span className="block text-xs text-on-surface-variant mt-0.5">Android · APK</span>
                </span>
                <Download className="w-4 h-4 text-primary shrink-0" aria-hidden="true" />
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* Core Studio Suite (Bento 2x2 Grid) */}
      <section className="max-w-7xl mx-auto px-gutter pt-6 sm:pt-8 pb-10 sm:pb-16 w-full" id="tools-suite">
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-6 sm:mb-8 gap-3 sm:gap-4">
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
            Edit videos, adjust audio, crop images, and download supported media in one place.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8">
          {/* Card 1: Video Editor */}
          <div className="group relative rounded-3xl bg-surface-container-lowest dark:bg-slate-900 border border-outline-variant/30 p-8 shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col justify-between overflow-hidden">
            <div aria-hidden="true" className="absolute -right-16 -top-16 w-44 h-44 rounded-full bg-primary/5 dark:bg-violet-400/10 pointer-events-none group-hover:scale-125 transition-transform duration-500" />
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
                className="after:absolute after:inset-0 after:rounded-3xl focus-visible:outline-none focus-visible:after:ring-2 focus-visible:after:ring-violet-400 inline-flex items-center gap-1.5 text-sm font-semibold text-primary hover:text-primary-container transition-colors"
              >
                <span>Open Video Editor</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>

          {/* Card 2: Audio Editor */}
          <div className="group relative rounded-3xl bg-surface-container-lowest dark:bg-slate-900 border border-outline-variant/30 p-8 shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col justify-between overflow-hidden">
            <div aria-hidden="true" className="absolute -right-16 -top-16 w-44 h-44 rounded-full bg-secondary/5 dark:bg-indigo-400/10 pointer-events-none group-hover:scale-125 transition-transform duration-500" />
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
                className="after:absolute after:inset-0 after:rounded-3xl focus-visible:outline-none focus-visible:after:ring-2 focus-visible:after:ring-violet-400 inline-flex items-center gap-1.5 text-sm font-semibold text-secondary hover:text-secondary-container transition-colors"
              >
                <span>Open Audio Editor</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>

          {/* Card 3: Image Editor */}
          <div className="group relative rounded-3xl bg-surface-container-lowest dark:bg-slate-900 border border-outline-variant/30 p-8 shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col justify-between overflow-hidden">
            <div aria-hidden="true" className="absolute -right-16 -top-16 w-44 h-44 rounded-full bg-tertiary/5 dark:bg-emerald-400/10 pointer-events-none group-hover:scale-125 transition-transform duration-500" />
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
                Freeform crop overlay, aspect presets, rotation/flip, lossless conversions, and simple photo filters.
              </p>

              {/* Before/After Preview */}
              <div className="rounded-2xl bg-surface-container-low dark:bg-slate-950/60 p-4 mb-6 border border-outline-variant/20">
                <div className="flex items-center justify-between mb-3 text-xs text-on-surface-variant">
                  <span className="flex items-center gap-1.5 font-medium">
                    <Sliders className="w-3.5 h-3.5 text-tertiary" />
                    AVIF / WebP Density
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-3 mb-2">
                  <div className="bg-surface-container-lowest dark:bg-slate-900 rounded-xl p-3 flex flex-col items-center justify-center text-center">
                    <span className="text-[10px] uppercase text-outline font-semibold mb-1">Source JPG</span>
                    <span className="text-xs text-on-surface-variant">3840 x 2160</span>
                  </div>
                  <div className="bg-surface-container-lowest dark:bg-slate-900 rounded-xl p-3 flex flex-col items-center justify-center text-center shadow-sm">
                    <span className="text-[10px] uppercase text-tertiary font-bold mb-1">Target WebP</span>
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
                className="after:absolute after:inset-0 after:rounded-3xl focus-visible:outline-none focus-visible:after:ring-2 focus-visible:after:ring-violet-400 inline-flex items-center gap-1.5 text-sm font-semibold text-tertiary hover:text-tertiary-container transition-colors"
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
                className="after:absolute after:inset-0 after:rounded-3xl focus-visible:outline-none focus-visible:after:ring-2 focus-visible:after:ring-violet-400 inline-flex items-center gap-1.5 text-sm font-semibold text-secondary hover:text-secondary-container transition-colors"
              >
                <span>Launch Downloader</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </div>
      </section>

    </div>
  );
}
