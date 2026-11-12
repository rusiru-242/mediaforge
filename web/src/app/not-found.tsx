import React from 'react';
import Link from 'next/link';
import { FileQuestion, Home, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/Button';

export default function NotFound() {
  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center px-4 py-12 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-violet-100 text-violet-600 shadow-sm dark:bg-violet-950/50 dark:text-violet-400">
        <FileQuestion className="h-8 w-8" />
      </div>
      <p className="mt-4 text-sm font-semibold uppercase tracking-wider text-violet-600 dark:text-violet-400">
        404 Error
      </p>
      <h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-100 sm:text-4xl">
        Page Not Found
      </h1>
      <p className="mt-3 max-w-md text-sm text-slate-600 dark:text-slate-400">
        The page or media resource you are looking for doesn&apos;t exist, has been moved, or has expired after the 24-hour cleanup cycle.
      </p>

      <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
        <Link href="/">
          <Button variant="primary" leftIcon={<Home className="h-4 w-4" />}>
            Return Home
          </Button>
        </Link>
        <Link href="/downloader">
          <Button variant="outline" leftIcon={<ArrowLeft className="h-4 w-4" />}>
            Go to Downloader
          </Button>
        </Link>
      </div>
    </div>
  );
}

