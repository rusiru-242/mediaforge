import React from 'react';
import Link from 'next/link';
import {
  DownloadCloud,
  Video,
  Music,
  Image as ImageIcon,
  Layers,
  ShieldCheck,
  Zap,
  Clock,
  Sparkles,
  ArrowRight,
  CheckCircle2,
  Lock,
  Cpu,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';

export default function HomePage() {
  const tools = [
    {
      title: 'Media Downloader',
      description: 'Download video and audio streams from supported authorized URLs in full HD resolution.',
      icon: DownloadCloud,
      href: '/downloader',
      badge: 'Popular',
      color: 'text-violet-500 bg-violet-500/10 dark:bg-violet-500/20',
    },
    {
      title: 'Video Converter',
      description: 'Transcode MP4, WEBM, MKV, AVI, and MOV with customizable resolution and bitrate.',
      icon: Video,
      href: '/converter/video',
      badge: 'FFmpeg Core',
      color: 'text-blue-500 bg-blue-500/10 dark:bg-blue-500/20',
    },
    {
      title: 'Audio Converter',
      description: 'Extract and transcode high-fidelity audio to MP3, WAV, FLAC, AAC, and M4A.',
      icon: Music,
      href: '/converter/audio',
      badge: 'Lossless',
      color: 'text-emerald-500 bg-emerald-500/10 dark:bg-emerald-500/20',
    },
    {
      title: 'Image Converter',
      description: 'Convert between PNG, JPEG, WEBP, and GIF with quality optimization and resizing.',
      icon: ImageIcon,
      href: '/converter/image',
      badge: 'Fast',
      color: 'text-amber-500 bg-amber-500/10 dark:bg-amber-500/20',
    },
    {
      title: 'Batch Processing',
      description: 'Queue and process multiple media conversions concurrently with progress synchronization.',
      icon: Layers,
      href: '/converter/batch',
      badge: 'Phase 08 Preview',
      color: 'text-purple-500 bg-purple-500/10 dark:bg-purple-500/20',
    },
    {
      title: 'Supported Formats',
      description: 'Explore all supported audio, video, container formats, and encoding specifications.',
      icon: Sparkles,
      href: '/formats',
      badge: 'Catalog',
      color: 'text-cyan-500 bg-cyan-500/10 dark:bg-cyan-500/20',
    },
  ];

  const features = [
    {
      icon: ShieldCheck,
      title: 'SSRF & Security Defense',
      description:
        'All media downloads pass through strict IP validation and safe URI resolution to block private network attacks.',
    },
    {
      icon: Zap,
      title: 'Hardware-Accelerated Encoding',
      description:
        'Engineered for maximum throughput using multi-threaded FFmpeg transcoding pipelines and asynchronous job queues.',
    },
    {
      icon: Clock,
      title: '24-Hour Ephemeral Retention',
      description:
        'Processed artifacts and downloads are automatically purged after 24 hours to guarantee zero permanent storage leaks.',
    },
    {
      icon: Lock,
      title: 'Zero Account Requirement',
      description:
        'Start converting instantly as a guest or sign in for persistent cross-device conversion history and sync.',
    },
    {
      icon: Cpu,
      title: 'Spring Boot REST Engine',
      description:
        'Backed by a high-concurrency Spring Boot 3 backend with OpenAPI 3 documentation, Actuator, and Flyway migrations.',
    },
    {
      icon: Layers,
      title: 'Cross-Platform Ecosystem',
      description:
        'One unified monorepo powering the Next.js web portal, Flutter desktop applications, and mobile apps.',
    },
  ];

  const steps = [
    {
      num: '01',
      title: 'Provide Media',
      description: 'Paste a video URL or drag-and-drop your video, audio, or image files into the workspace.',
    },
    {
      num: '02',
      title: 'Choose Parameters',
      description: 'Select target container format, quality presets, codec options, audio bitrates, or resolution.',
    },
    {
      num: '03',
      title: 'Download & Enjoy',
      description: 'Monitor real-time conversion progress and download your pristine media file instantly.',
    },
  ];

  return (
    <div className="space-y-24 py-8 md:py-16">
      {/* Hero Section */}
      <section className="relative px-4 text-center sm:px-6 lg:px-8">
        <div className="mx-auto max-w-4xl space-y-6">
          <div className="inline-flex items-center gap-2 rounded-full border border-violet-200 bg-violet-50/80 px-4 py-1.5 text-xs font-semibold text-violet-700 backdrop-blur dark:border-violet-800 dark:bg-violet-950/50 dark:text-violet-300">
            <Sparkles className="h-3.5 w-3.5 text-violet-600 dark:text-violet-400" />
            <span>Phase 03 — Next.js 15 & Spring Boot Monorepo Integration</span>
          </div>

          <h1 className="text-4xl font-extrabold tracking-tight text-slate-900 dark:text-white sm:text-6xl sm:leading-tight">
            Universal Media Downloader &{' '}
            <span className="bg-gradient-to-r from-violet-600 via-purple-600 to-indigo-600 bg-clip-text text-transparent dark:from-violet-400 dark:via-purple-400 dark:to-indigo-300">
              Cross-Format Transcoder
            </span>
          </h1>

          <p className="mx-auto max-w-2xl text-base text-slate-600 dark:text-slate-300 sm:text-lg">
            High-performance, secure media processing platform. Download streams from authorized web sources
            and transcode videos, music, and images with enterprise-grade quality and reliability.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-4 pt-4">
            <Link href="/downloader">
              <Button size="lg" variant="primary" rightIcon={<ArrowRight className="h-5 w-5" />}>
                Launch Downloader
              </Button>
            </Link>
            <Link href="/converter/video">
              <Button size="lg" variant="outline">
                Explore Video Converter
              </Button>
            </Link>
          </div>

          <div className="pt-4 flex items-center justify-center gap-6 text-xs text-slate-500 dark:text-slate-400">
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="h-4 w-4 text-emerald-500" /> No Registration Required
            </span>
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="h-4 w-4 text-emerald-500" /> Ephemeral 24h Storage
            </span>
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="h-4 w-4 text-emerald-500" /> 100% Free & Open Source
            </span>
          </div>
        </div>
      </section>

      {/* Quick Tools Grid */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100 sm:text-3xl">
            Choose Your Processing Suite
          </h2>
          <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
            Dedicated tools tailored for specific media types with optimized transcode parameters.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {tools.map((tool) => {
            const Icon = tool.icon;
            return (
              <Link key={tool.title} href={tool.href} className="group block focus:outline-none">
                <Card hover className="h-full transition-all group-hover:-translate-y-1">
                  <div className="flex items-start justify-between">
                    <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${tool.color}`}>
                      <Icon className="h-6 w-6" />
                    </div>
                    <Badge variant="secondary">{tool.badge}</Badge>
                  </div>
                  <h3 className="mt-4 text-lg font-semibold text-slate-900 group-hover:text-violet-600 dark:text-slate-100 dark:group-hover:text-violet-400">
                    {tool.title}
                  </h3>
                  <p className="mt-2 text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                    {tool.description}
                  </p>
                  <div className="mt-4 inline-flex items-center text-xs font-semibold text-violet-600 dark:text-violet-400">
                    Get started <ArrowRight className="ml-1.5 h-3.5 w-3.5 transition-transform group-hover:translate-x-1" />
                  </div>
                </Card>
              </Link>
            );
          })}
        </div>
      </section>

      {/* How It Works */}
      <section className="bg-slate-100/60 py-16 dark:bg-slate-900/40">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100 sm:text-3xl">
              How MediaForge Works
            </h2>
            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
              Three seamless steps from media source to finished conversion.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
            {steps.map((step) => (
              <div
                key={step.num}
                className="relative rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900"
              >
                <div className="text-3xl font-extrabold text-violet-600/30 dark:text-violet-400/30">
                  {step.num}
                </div>
                <h3 className="mt-2 text-lg font-semibold text-slate-900 dark:text-slate-100">
                  {step.title}
                </h3>
                <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
                  {step.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features & Architecture Highlights */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100 sm:text-3xl">
            Architected for Security & Performance
          </h2>
          <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
            Engineered with modern cloud principles and stringent security guardrails.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((feat) => {
            const Icon = feat.icon;
            return (
              <Card key={feat.title} className="p-6">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-violet-100 text-violet-600 dark:bg-violet-950/60 dark:text-violet-400">
                  <Icon className="h-5 w-5" />
                </div>
                <h3 className="mt-4 text-base font-semibold text-slate-900 dark:text-slate-100">
                  {feat.title}
                </h3>
                <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
                  {feat.description}
                </p>
              </Card>
            );
          })}
        </div>
      </section>

      {/* CTA Section */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-violet-600 to-indigo-700 px-6 py-12 text-center text-white shadow-xl sm:px-12 sm:py-16">
          <h2 className="text-3xl font-extrabold tracking-tight sm:text-4xl">
            Ready to download and transcode media?
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-violet-100">
            Try our intuitive web workspace now or integrate directly via our OpenAPI REST documentation.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-4">
            <Link href="/downloader">
              <Button size="lg" className="bg-white text-violet-900 hover:bg-violet-50">
                Start Media Download
              </Button>
            </Link>
            <Link href="/history">
              <Button size="lg" variant="outline" className="border-white/40 text-white hover:bg-white/10">
                View Job History
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}

