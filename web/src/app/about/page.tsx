import React from 'react';
import Link from 'next/link';
import {
  Info,
  Layers,
  ShieldCheck,
  Cpu,
  Code2,
  ExternalLink,
  BookOpen,
} from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';

export default function AboutPage() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="text-center space-y-3">
        <div className="inline-flex items-center gap-2 rounded-full bg-violet-100 px-3 py-1 text-xs font-semibold text-violet-700 dark:bg-violet-950/60 dark:text-violet-300">
          <Info className="h-3.5 w-3.5" />
          <span>About MediaForge</span>
        </div>
        <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-slate-100 sm:text-4xl">
          Architected for Universal Media Freedom
        </h1>
        <p className="mx-auto max-w-2xl text-sm text-slate-600 dark:text-slate-400">
          MediaForge is a high-performance, open-source media download and universal transcoding engine designed from the ground up for privacy, speed, and cross-platform flexibility.
        </p>
      </div>

      {/* Mission & Philosophy */}
      <div className="mt-12 space-y-8">
        <Card className="p-6 sm:p-8">
          <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-violet-600 dark:text-violet-400" />
            Our Core Mission
          </h2>
          <p className="mt-3 text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
            In an era of proprietary codecs and paywalled conversion tools filled with aggressive advertising, MediaForge provides an uncompromising alternative: a clean, secure, open-source suite for web media ingestion and universal audio, video, and image transcoding.
          </p>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
            We adhere strictly to ephemeral data lifecycle standards: all uploaded files and downloaded media streams are temporarily staged in high-performance storage and automatically destroyed within 24 hours.
          </p>
        </Card>

        {/* Monorepo Architecture Overview */}
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
          <Card className="p-6">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100 text-blue-600 dark:bg-blue-950 dark:text-blue-400">
              <Cpu className="h-5 w-5" />
            </div>
            <h3 className="mt-4 text-base font-semibold text-slate-900 dark:text-slate-100">
              Spring Boot 3 Core Backend
            </h3>
            <p className="mt-2 text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              Implemented in Java 21 with Spring Boot 3.5, Spring Security, PostgreSQL persistence, Flyway schema migrations, and Springdoc OpenAPI 3. Built for concurrent async job dispatch and strict SSRF defenses.
            </p>
          </Card>

          <Card className="p-6">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-violet-100 text-violet-600 dark:bg-violet-950 dark:text-violet-400">
              <Layers className="h-5 w-5" />
            </div>
            <h3 className="mt-4 text-base font-semibold text-slate-900 dark:text-slate-100">
              Modern Next.js Frontend
            </h3>
            <p className="mt-2 text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              Powered by Next.js 15 App Router, React 19, TypeScript, and Tailwind CSS. Features dynamic responsive layouts, dark/light theme switching, and live telemetry synchronization with the backend REST API.
            </p>
          </Card>
        </div>

        {/* Cross-Platform Vision */}
        <Card className="p-6 sm:p-8">
          <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <Code2 className="h-5 w-5 text-violet-600 dark:text-violet-400" />
            Cross-Platform Monorepo Roadmap
          </h2>
          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3 text-xs">
            <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-4 dark:border-slate-800 dark:bg-slate-900/50">
              <span className="font-semibold text-slate-900 dark:text-slate-100">Web App (Phase 03)</span>
              <p className="mt-1 text-slate-500 dark:text-slate-400">
                Responsive web portal with full API integration, direct job control, and format exploration.
              </p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-4 dark:border-slate-800 dark:bg-slate-900/50">
              <span className="font-semibold text-slate-900 dark:text-slate-100">Desktop App (Phase 06)</span>
              <p className="mt-1 text-slate-500 dark:text-slate-400">
                Flutter native desktop app for Windows, macOS, and Linux with embedded offline FFmpeg engine.
              </p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-4 dark:border-slate-800 dark:bg-slate-900/50">
              <span className="font-semibold text-slate-900 dark:text-slate-100">Mobile App (Phase 07)</span>
              <p className="mt-1 text-slate-500 dark:text-slate-400">
                Flutter mobile app for Android and iOS with native share target and background downloads.
              </p>
            </div>
          </div>
        </Card>

        {/* API Link */}
        <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-violet-200 bg-violet-50/60 p-6 dark:border-violet-900 dark:bg-violet-950/20">
          <div>
            <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">
              Developer REST API Documentation
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
              Explore interactive Swagger UI and OpenAPI 3 schema endpoints hosted directly by the Spring Boot backend.
            </p>
          </div>
          <a
            href="http://localhost:8080/swagger-ui.html"
            target="_blank"
            rel="noopener noreferrer"
          >
            <Button variant="primary" rightIcon={<ExternalLink className="h-4 w-4" />}>
              Open Swagger UI
            </Button>
          </a>
        </div>
      </div>
    </div>
  );
}

