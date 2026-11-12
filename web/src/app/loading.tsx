import React from 'react';
import { Loader2 } from 'lucide-react';

export default function Loading() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center p-6 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-violet-50 text-violet-600 shadow-sm dark:bg-violet-950/40 dark:text-violet-400">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
      <h2 className="mt-4 text-base font-semibold text-slate-800 dark:text-slate-200">
        Loading MediaForge...
      </h2>
      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
        Preparing media components and connecting to backend services.
      </p>
    </div>
  );
}

