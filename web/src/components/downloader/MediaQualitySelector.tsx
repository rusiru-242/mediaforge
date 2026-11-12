'use client';

import React from 'react';
import { Select } from '@/components/ui/Select';

interface MediaQualitySelectorProps {
  qualities: string[];
  selectedQuality: string;
  onSelectQuality: (quality: string) => void;
  disabled?: boolean;
}

export function MediaQualitySelector({
  qualities,
  selectedQuality,
  onSelectQuality,
  disabled = false,
}: MediaQualitySelectorProps) {
  if (!qualities || qualities.length === 0) {
    return null;
  }

  const options = qualities.map((q) => ({
    label: q,
    value: q,
  }));

  return (
    <div className="space-y-1.5 text-left">
      <Select
        label="Stream Quality"
        value={selectedQuality}
        onChange={(e) => onSelectQuality(e.target.value)}
        options={options}
        disabled={disabled || qualities.length <= 1}
        helperText={qualities.length <= 1 ? 'Source provides a single native stream resolution.' : undefined}
      />
    </div>
  );
}
