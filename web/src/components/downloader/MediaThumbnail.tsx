'use client';

import React, { useState } from 'react';
import { Video, Music, Image as ImageIcon, Film } from 'lucide-react';

interface MediaThumbnailProps {
  thumbnailUrl?: string;
  mediaType: string;
  title: string;
}

export function MediaThumbnail({ thumbnailUrl, mediaType, title }: MediaThumbnailProps) {
  const [imgError, setImgError] = useState(false);

  const getFallbackIcon = () => {
    switch (mediaType?.toUpperCase()) {
      case 'VIDEO':
        return <Video className="h-10 w-10 text-violet-500" />;
      case 'AUDIO':
        return <Music className="h-10 w-10 text-emerald-500" />;
      case 'IMAGE':
        return <ImageIcon className="h-10 w-10 text-amber-500" />;
      default:
        return <Film className="h-10 w-10 text-slate-400" />;
    }
  };

  return (
    <div className="relative flex h-28 w-28 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-slate-200 bg-slate-100 dark:border-slate-800 dark:bg-slate-900">
      {thumbnailUrl && !imgError ? (
        // Standard img tag to handle arbitrary external thumbnail URLs without next.config host restrictions
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={thumbnailUrl}
          alt={title || 'Media thumbnail'}
          className="h-full w-full object-cover"
          onError={() => setImgError(true)}
        />
      ) : (
        <div className="flex flex-col items-center justify-center p-2 text-center">
          {getFallbackIcon()}
          <span className="mt-1 text-[10px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            {mediaType || 'Media'}
          </span>
        </div>
      )}
    </div>
  );
}
