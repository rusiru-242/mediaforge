import React from 'react';
import { BookOpen, AlertOctagon, CheckSquare, Scale } from 'lucide-react';
import { Card } from '@/components/ui/Card';

export default function TermsPage() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="text-center space-y-3">
        <div className="inline-flex items-center gap-2 rounded-full bg-slate-200 px-3 py-1 text-xs font-semibold text-slate-800 dark:bg-slate-800 dark:text-slate-200">
          <Scale className="h-3.5 w-3.5" />
          <span>Usage Guidelines</span>
        </div>
        <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-slate-100 sm:text-4xl">
          Terms of Service
        </h1>
        <p className="mx-auto max-w-xl text-sm text-slate-600 dark:text-slate-400">
          Last revised: November 2026 • Rules for operating and utilizing the MediaForge suite.
        </p>
      </div>

      <div className="mt-10 space-y-6">
        <Card className="p-6 sm:p-8">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-violet-100 text-violet-600 dark:bg-violet-950 dark:text-violet-400">
              <CheckSquare className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
                Authorized Use & Fair Rights
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">Personal & educational utilization</p>
            </div>
          </div>
          <p className="mt-4 text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
            MediaForge is provided as an open-source utility designed to facilitate format shifting, offline backups, and accessibility transcoding of media you have the legal right or explicit permission to access. You agree to use MediaForge in strict accordance with the laws of your jurisdiction and applicable intellectual property regulations.
          </p>
        </Card>

        <Card className="p-6 sm:p-8">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-rose-100 text-rose-600 dark:bg-rose-950 dark:text-rose-400">
              <AlertOctagon className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
                Prohibited Conduct & Rate Limiting
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">System protection & abuse prevention</p>
            </div>
          </div>
          <p className="mt-4 text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
            Users may not attempt to overwhelm MediaForge via denial-of-service attempts, automated scraping loops, or unauthorized probing of private infrastructure. Any download requests directed toward reserved loopback, RFC 1918, or internal cloud metadata addresses will be terminated immediately.
          </p>
        </Card>

        <Card className="p-6 sm:p-8">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100 text-blue-600 dark:bg-blue-950 dark:text-blue-400">
              <BookOpen className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
                Disclaimer of Warranty
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">Provided &quot;as is&quot; without liability</p>
            </div>
          </div>
          <p className="mt-4 text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
            MediaForge is supplied under the open-source license &quot;AS IS&quot;, without warranty of any kind, express or implied, including but not limited to the warranties of merchantability, fitness for a particular purpose, or non-infringement.
          </p>
        </Card>
      </div>
    </div>
  );
}

