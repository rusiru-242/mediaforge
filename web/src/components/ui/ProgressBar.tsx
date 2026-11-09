import React from 'react';
import { cn } from '@/utils/cn';

export interface ProgressBarProps {
  value: number; // 0 to 100
  label?: string;
  showValue?: boolean;
  color?: 'violet' | 'emerald' | 'blue' | 'rose' | 'amber';
  animated?: boolean;
  className?: string;
}

export function ProgressBar({
  value,
  label,
  showValue = true,
  color = 'violet',
  animated = false,
  className,
}: ProgressBarProps) {
  const clampedValue = Math.min(100, Math.max(0, Math.round(value)));

  const colorMap = {
    violet: 'bg-violet-600 dark:bg-violet-500',
    emerald: 'bg-emerald-600 dark:bg-emerald-500',
    blue: 'bg-blue-600 dark:bg-blue-500',
    rose: 'bg-rose-600 dark:bg-rose-500',
    amber: 'bg-amber-600 dark:bg-amber-500',
  };

  return (
    <div className={cn('w-full space-y-1.5', className)}>
      {(label || showValue) && (
        <div className="flex justify-between text-xs font-medium text-slate-700 dark:text-slate-300">
          {label && <span>{label}</span>}
          {showValue && <span className="tabular-nums">{clampedValue}%</span>}
        </div>
      )}
      <div className="h-2 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
        <div
          role="progressbar"
          aria-valuenow={clampedValue}
          aria-valuemin={0}
          aria-valuemax={100}
          className={cn(
            'h-full rounded-full transition-all duration-300 ease-out',
            colorMap[color],
            animated && 'animate-pulse'
          )}
          style={{ width: `${clampedValue}%` }}
        />
      </div>
    </div>
  );
}
