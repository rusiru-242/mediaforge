import React from 'react';
import { ShieldCheck, Clock, Trash2, Lock, EyeOff } from 'lucide-react';
import { Card } from '@/components/ui/Card';

export default function PrivacyPage() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="text-center space-y-3">
        <div className="inline-flex items-center gap-2 rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
          <ShieldCheck className="h-3.5 w-3.5" />
          <span>Zero Permanent Retention</span>
        </div>
        <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-slate-100 sm:text-4xl">
          Privacy Policy
        </h1>
        <p className="mx-auto max-w-xl text-sm text-slate-600 dark:text-slate-400">
          Last updated: November 2026 • We respect your privacy by collecting zero telemetry and storing files ephemerally.
        </p>
      </div>

      <div className="mt-10 space-y-6">
        <Card className="p-6 sm:p-8">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-100 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400">
              <Clock className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
                Automatic 24-Hour File Lifecycle
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">Ephemeral processing by design</p>
            </div>
          </div>
          <p className="mt-4 text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
            All files uploaded to MediaForge and media downloaded via our backend extraction engine are retained in temporary scratch storage for a strict maximum of <strong>24 hours</strong>. After this window, files are permanently deleted via an automated scheduled cron job. No backup copies or deep archival records of processed media are ever kept.
          </p>
        </Card>

        <Card className="p-6 sm:p-8">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-violet-100 text-violet-600 dark:bg-violet-950 dark:text-violet-400">
              <EyeOff className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
                No Tracking & No Profiling
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">Zero ad pixels or behavioral tracking</p>
            </div>
          </div>
          <p className="mt-4 text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
            MediaForge does not use advertising trackers, browser fingerprinting cookies, or third-party marketing beacons. Guest sessions are strictly anonymous and use transient UUID identifiers stored only in local storage or temporary session cookies for job synchronization.
          </p>
        </Card>

        <Card className="p-6 sm:p-8">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100 text-blue-600 dark:bg-blue-950 dark:text-blue-400">
              <Lock className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
                SSRF Defense & Network Isolation
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">Safe media fetching boundaries</p>
            </div>
          </div>
          <p className="mt-4 text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
            When you request a download URL, MediaForge verifies the destination hostname against Server-Side Request Forgery (SSRF) restrictions. We never probe private corporate intranets, loopback addresses (127.0.0.1), or link-local endpoints, preventing any inadvertent disclosure of network telemetry.
          </p>
        </Card>
      </div>
    </div>
  );
}

