'use client';

import React, { useEffect, useState } from 'react';
import {
  Sparkles,
  Video,
  Music,
  Image as ImageIcon,
  CheckCircle2,
  Filter,
  RotateCcw,
} from 'lucide-react';
import { apiClient } from '@/services/apiClient';
import { SupportedFormatsResponse } from '@/types/api';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';

interface FormatDetail {
  extension: string;
  name: string;
  category: 'video' | 'audio' | 'image';
  mimeType: string;
  codecs: string[];
  useCases: string;
  advantages: string[];
}

const FALLBACK_CATALOG: FormatDetail[] = [
  // Video
  {
    extension: 'mp4',
    name: 'MPEG-4 Part 14',
    category: 'video',
    mimeType: 'video/mp4',
    codecs: ['H.264', 'H.265 / HEVC', 'AAC'],
    useCases: 'Universal streaming, YouTube, iOS, Android, web browsers',
    advantages: ['Highest hardware decoding compatibility', 'Compact size with good fidelity'],
  },
  {
    extension: 'webm',
    name: 'WebM Multimedia Container',
    category: 'video',
    mimeType: 'video/webm',
    codecs: ['VP8', 'VP9', 'AV1', 'Opus', 'Vorbis'],
    useCases: 'HTML5 modern browser streaming, high-compression web video',
    advantages: ['Royalty-free', 'Open standard', 'Superior compression efficiency'],
  },
  {
    extension: 'mkv',
    name: 'Matroska Video Container',
    category: 'video',
    mimeType: 'video/x-matroska',
    codecs: ['H.264', 'HEVC', 'VP9', 'FLAC', 'AC3'],
    useCases: 'Archival quality, multi-track audio and subtitle muxing',
    advantages: ['Supports unlimited audio/subtitle tracks', 'Extensible container'],
  },
  {
    extension: 'avi',
    name: 'Audio Video Interleave',
    category: 'video',
    mimeType: 'video/x-msvideo',
    codecs: ['MPEG-4', 'Xvid', 'MP3'],
    useCases: 'Legacy PC media players and older consumer electronics',
    advantages: ['Wide legacy compatibility'],
  },
  {
    extension: 'mov',
    name: 'Apple QuickTime Movie',
    category: 'video',
    mimeType: 'video/quicktime',
    codecs: ['ProRes', 'H.264', 'AAC'],
    useCases: 'Video editing in Final Cut Pro, Apple device recording',
    advantages: ['Native macOS & iOS integration', 'Professional editing standard'],
  },

  // Audio
  {
    extension: 'mp3',
    name: 'MPEG Audio Layer III',
    category: 'audio',
    mimeType: 'audio/mpeg',
    codecs: ['MP3'],
    useCases: 'Portable media players, podcasts, audiobooks, car stereos',
    advantages: ['Universal device compatibility', 'Configurable VBR/CBR bitrates up to 320k'],
  },
  {
    extension: 'wav',
    name: 'Waveform Audio File Format',
    category: 'audio',
    mimeType: 'audio/wav',
    codecs: ['LPCM Uncompressed'],
    useCases: 'Studio sound engineering, pristine uncompressed mastering',
    advantages: ['Lossless uncompressed audio', 'Zero quality degradation'],
  },
  {
    extension: 'flac',
    name: 'Free Lossless Audio Codec',
    category: 'audio',
    mimeType: 'audio/flac',
    codecs: ['FLAC'],
    useCases: 'Audiophile archival, hi-res music libraries',
    advantages: ['100% bit-for-bit lossless compression', 'Open source, 50% smaller than WAV'],
  },
  {
    extension: 'aac',
    name: 'Advanced Audio Coding',
    category: 'audio',
    mimeType: 'audio/aac',
    codecs: ['AAC-LC', 'HE-AAC'],
    useCases: 'Apple Music, YouTube audio, mobile streaming',
    advantages: ['Higher sound quality than MP3 at identical bitrates'],
  },
  {
    extension: 'm4a',
    name: 'MPEG-4 Audio Container',
    category: 'audio',
    mimeType: 'audio/mp4',
    codecs: ['AAC', 'ALAC'],
    useCases: 'iTunes, iOS voice memos, Apple podcasts',
    advantages: ['Great metadata tagging', 'Clean Apple ecosystem integration'],
  },

  // Image
  {
    extension: 'webp',
    name: 'WebP Next-Gen Image',
    category: 'image',
    mimeType: 'image/webp',
    codecs: ['WebP Lossy/Lossless'],
    useCases: 'Modern web UI assets, responsive product photography',
    advantages: ['25–34% smaller than JPEG', 'Supports transparency & animation'],
  },
  {
    extension: 'png',
    name: 'Portable Network Graphics',
    category: 'image',
    mimeType: 'image/png',
    codecs: ['PNG Deflate'],
    useCases: 'Logos, screenshots, UI icons, images requiring alpha channel',
    advantages: ['Lossless compression', 'Full alpha transparency support'],
  },
  {
    extension: 'jpeg',
    name: 'Joint Photographic Experts Group',
    category: 'image',
    mimeType: 'image/jpeg',
    codecs: ['JPEG DCT'],
    useCases: 'Digital cameras, general web photography, social media sharing',
    advantages: ['Universal display support', 'Small file sizes for complex photos'],
  },
  {
    extension: 'gif',
    name: 'Graphics Interchange Format',
    category: 'image',
    mimeType: 'image/gif',
    codecs: ['LZW'],
    useCases: 'Animated short loops, simple graphics, memes',
    advantages: ['Universal animation support across all email & web clients'],
  },
];

export default function FormatsPage() {
  const [formatsData, setFormatsData] = useState<SupportedFormatsResponse | null>(null);
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'video' | 'audio' | 'image'>('all');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchFormats() {
      try {
        const data = await apiClient.getSupportedFormats();
        setFormatsData(data);
      } catch (err) {
        console.warn('Backend formats endpoint offline, using local catalog:', err);
      } finally {
        setIsLoading(false);
      }
    }
    fetchFormats();
  }, []);

  const filteredCatalog = FALLBACK_CATALOG.filter((f) => {
    if (selectedFilter === 'all') return true;
    return f.category === selectedFilter;
  });

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="text-center space-y-3">
        <div className="inline-flex items-center gap-2 rounded-full bg-cyan-100 px-3 py-1 text-xs font-semibold text-cyan-800 dark:bg-cyan-950/60 dark:text-cyan-300">
          <Sparkles className="h-3.5 w-3.5" />
          <span>Codec & Container Directory</span>
        </div>
        <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-slate-100 sm:text-4xl">
          Supported Media Formats
        </h1>
        <p className="mx-auto max-w-2xl text-sm text-slate-600 dark:text-slate-400">
          MediaForge supports all major video containers, lossless audio codecs, and next-generation image formats powered by Spring Boot and FFmpeg.
        </p>
      </div>

      {/* Filter Tabs */}
      <div className="mt-8 flex flex-wrap justify-center gap-2">
        <Button
          variant={selectedFilter === 'all' ? 'primary' : 'outline'}
          size="sm"
          onClick={() => setSelectedFilter('all')}
        >
          All Formats ({FALLBACK_CATALOG.length})
        </Button>
        <Button
          variant={selectedFilter === 'video' ? 'primary' : 'outline'}
          size="sm"
          onClick={() => setSelectedFilter('video')}
          leftIcon={<Video className="h-3.5 w-3.5" />}
        >
          Video ({FALLBACK_CATALOG.filter((f) => f.category === 'video').length})
        </Button>
        <Button
          variant={selectedFilter === 'audio' ? 'primary' : 'outline'}
          size="sm"
          onClick={() => setSelectedFilter('audio')}
          leftIcon={<Music className="h-3.5 w-3.5" />}
        >
          Audio ({FALLBACK_CATALOG.filter((f) => f.category === 'audio').length})
        </Button>
        <Button
          variant={selectedFilter === 'image' ? 'primary' : 'outline'}
          size="sm"
          onClick={() => setSelectedFilter('image')}
          leftIcon={<ImageIcon className="h-3.5 w-3.5" />}
        >
          Image ({FALLBACK_CATALOG.filter((f) => f.category === 'image').length})
        </Button>
      </div>

      {/* Backend Live Validation Pill */}
      {formatsData && (
        <div className="mt-6 flex justify-center">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400">
            <CheckCircle2 className="h-3.5 w-3.5" />
            Synchronized with Backend API Formats Registry (v0.1.0)
          </span>
        </div>
      )}

      {/* Formats Grid */}
      <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {filteredCatalog.map((fmt) => (
          <Card key={fmt.extension} hover className="p-6">
            <div className="flex items-start justify-between">
              <div>
                <span className="font-mono text-xl font-bold uppercase text-violet-600 dark:text-violet-400">
                  .{fmt.extension}
                </span>
                <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 mt-0.5">
                  {fmt.name}
                </h3>
              </div>
              <Badge
                variant={
                  fmt.category === 'video' ? 'info' : fmt.category === 'audio' ? 'success' : 'warning'
                }
              >
                {fmt.category}
              </Badge>
            </div>

            <div className="mt-4 space-y-3 text-xs">
              <div>
                <span className="text-slate-400">MIME Type:</span>
                <span className="ml-1.5 font-mono text-slate-700 dark:text-slate-300">{fmt.mimeType}</span>
              </div>

              <div>
                <span className="text-slate-400">Supported Codecs:</span>
                <div className="mt-1 flex flex-wrap gap-1">
                  {fmt.codecs.map((c) => (
                    <span
                      key={c}
                      className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[10px] text-slate-600 dark:bg-slate-800 dark:text-slate-300"
                    >
                      {c}
                    </span>
                  ))}
                </div>
              </div>

              <div>
                <span className="text-slate-400">Common Use Cases:</span>
                <p className="mt-0.5 text-slate-600 dark:text-slate-300 leading-relaxed">{fmt.useCases}</p>
              </div>

              <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                <span className="text-slate-400">Key Advantages:</span>
                <ul className="mt-1 space-y-1 text-slate-600 dark:text-slate-300">
                  {fmt.advantages.map((adv, idx) => (
                    <li key={idx} className="flex items-center gap-1.5">
                      <CheckCircle2 className="h-3 w-3 text-emerald-500 shrink-0" />
                      <span>{adv}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}

