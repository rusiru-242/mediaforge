'use client';

import React, { useRef, useState, DragEvent, ChangeEvent } from 'react';
import { UploadCloud, File, X, AlertCircle } from 'lucide-react';
import { cn } from '@/utils/cn';

export interface FileDropzoneProps {
  accept?: string;
  maxSizeBytes?: number; // default 500MB
  onFileSelect: (file: File | null) => void;
  selectedFile: File | null;
  label?: string;
  description?: string;
  disabled?: boolean;
}

export function FileDropzone({
  accept = '*/*',
  maxSizeBytes = 500 * 1024 * 1024, // 500MB
  onFileSelect,
  selectedFile,
  label = 'Upload media file',
  description = 'Drag and drop your file here, or browse',
  disabled = false,
}: FileDropzoneProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
  };

  const validateAndSetFile = (file: File) => {
    setError(null);
    if (file.size > maxSizeBytes) {
      setError(`File size exceeds maximum limit of ${formatFileSize(maxSizeBytes)}`);
      return;
    }
    onFileSelect(file);
  };

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (disabled) return;
    setIsDragOver(true);
  };

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(false);
    if (disabled) return;
    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      validateAndSetFile(files[0]);
    }
  };

  const handleInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      validateAndSetFile(files[0]);
    }
  };

  const handleRemove = (e: React.MouseEvent) => {
    e.stopPropagation();
    onFileSelect(null);
    setError(null);
    if (inputRef.current) {
      inputRef.current.value = '';
    }
  };

  return (
    <div className="w-full space-y-2">
      <div
        role="button"
        tabIndex={disabled ? -1 : 0}
        aria-label={label}
        onClick={() => !disabled && inputRef.current?.click()}
        onKeyDown={(e) => {
          if (!disabled && (e.key === 'Enter' || e.key === ' ')) {
            e.preventDefault();
            inputRef.current?.click();
          }
        }}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={cn(
          'relative flex flex-col items-center justify-center rounded-xl border-2 border-dashed p-8 text-center transition-all cursor-pointer',
          isDragOver
            ? 'border-violet-500 bg-violet-50/50 dark:border-violet-400 dark:bg-violet-950/20'
            : 'border-slate-300 bg-slate-50/50 hover:border-slate-400 hover:bg-slate-100/50 dark:border-slate-700 dark:bg-slate-900/50 dark:hover:border-slate-600 dark:hover:bg-slate-900',
          selectedFile && 'border-emerald-500/50 bg-emerald-50/20 dark:border-emerald-600/50 dark:bg-emerald-950/10',
          disabled && 'cursor-not-allowed opacity-60'
        )}
      >
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          onChange={handleInputChange}
          disabled={disabled}
          className="hidden"
          data-testid="file-dropzone-input"
        />

        {selectedFile ? (
          <div className="flex w-full items-center justify-between gap-4 px-2">
            <div className="flex items-center gap-3 overflow-hidden text-left">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-violet-100 text-violet-600 dark:bg-violet-950 dark:text-violet-400">
                <File className="h-6 w-6" />
              </div>
              <div className="truncate">
                <p className="truncate text-sm font-semibold text-slate-900 dark:text-slate-100">
                  {selectedFile.name}
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {formatFileSize(selectedFile.size)} • {selectedFile.type || 'Unknown type'}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={handleRemove}
              className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-200 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200"
              title="Remove file"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        ) : (
          <div className="flex flex-col items-center">
            <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-violet-100 text-violet-600 dark:bg-violet-950/60 dark:text-violet-400">
              <UploadCloud className="h-7 w-7" />
            </div>
            <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">{label}</p>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{description}</p>
            <p className="mt-2 inline-flex items-center rounded-full bg-slate-200/60 px-2.5 py-0.5 text-[11px] font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-400">
              Up to {formatFileSize(maxSizeBytes)}
            </p>
          </div>
        )}
      </div>

      {error && (
        <div className="flex items-center gap-1.5 text-xs text-rose-500">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}
    </div>
  );
}

