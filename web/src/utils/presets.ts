export interface VideoPreset {
  id: string;
  label: string;
  description: string;
  resolution: string;
  videoBitrate: string;
  audioBitrate: string;
}

export interface AudioPreset {
  id: string;
  label: string;
  description: string;
  bitrate: string;
  sampleRate: number;
}

export interface ImagePreset {
  id: string;
  label: string;
  description: string;
  quality: number;
}

export const VIDEO_PRESETS: VideoPreset[] = [
  {
    id: 'original',
    label: 'Original Quality',
    description: 'Preserves native resolution and near-lossless bitrate',
    resolution: 'source',
    videoBitrate: 'auto',
    audioBitrate: 'auto',
  },
  {
    id: 'high',
    label: 'High Quality (1080p)',
    description: 'Full HD 1080p, 2500 kbps video, 256 kbps audio',
    resolution: '1080p',
    videoBitrate: '2500k',
    audioBitrate: '256k',
  },
  {
    id: 'balanced',
    label: 'Balanced (720p)',
    description: 'Crisp HD 720p, 1200 kbps video, 192 kbps audio (Recommended)',
    resolution: '720p',
    videoBitrate: '1200k',
    audioBitrate: '192k',
  },
  {
    id: 'small',
    label: 'Small File Size (480p)',
    description: 'Compact 480p, 600 kbps video, 128 kbps audio for quick sharing',
    resolution: '480p',
    videoBitrate: '600k',
    audioBitrate: '128k',
  },
];

export const AUDIO_PRESETS: AudioPreset[] = [
  {
    id: 'high',
    label: 'High Quality (320 kbps)',
    description: 'Studio-grade audio bitstream at 48000 Hz',
    bitrate: '320k',
    sampleRate: 48000,
  },
  {
    id: 'standard',
    label: 'Standard Quality (192 kbps)',
    description: 'Balanced fidelity at 44100 Hz (Recommended)',
    bitrate: '192k',
    sampleRate: 44100,
  },
  {
    id: 'small',
    label: 'Small File Size (128 kbps)',
    description: 'Voice and podcast optimized compact audio',
    bitrate: '128k',
    sampleRate: 44100,
  },
];

export const IMAGE_PRESETS: ImagePreset[] = [
  {
    id: 'high',
    label: 'High Quality (90%)',
    description: 'Visually lossless clarity and detail preservation',
    quality: 90,
  },
  {
    id: 'balanced',
    label: 'Balanced (75%)',
    description: 'Optimal web balance of size and visual fidelity',
    quality: 75,
  },
  {
    id: 'compression',
    label: 'Maximum Compression (50%)',
    description: 'Smallest possible file footprint',
    quality: 50,
  },
];

export const VIDEO_EXTENSIONS = ['mp4', 'mkv', 'webm', 'mov', 'avi', 'flv', 'wmv', 'm4v', '3gp', 'ts'];
export const AUDIO_EXTENSIONS = ['mp3', 'wav', 'aac', 'flac', 'm4a', 'ogg', 'wma', 'aiff', 'opus'];
export const IMAGE_EXTENSIONS = ['jpg', 'jpeg', 'png', 'webp', 'avif', 'bmp', 'gif', 'tiff', 'svg'];

export type MediaType = 'video' | 'audio' | 'image' | 'unknown';

export function detectMediaType(filename: string): MediaType {
  const ext = filename.split('.').pop()?.toLowerCase() || '';
  if (VIDEO_EXTENSIONS.includes(ext)) return 'video';
  if (AUDIO_EXTENSIONS.includes(ext)) return 'audio';
  if (IMAGE_EXTENSIONS.includes(ext)) return 'image';
  return 'unknown';
}

export function getCompatibleOutputFormats(filename: string): string[] {
  const type = detectMediaType(filename);
  switch (type) {
    case 'video':
      return ['mp4', 'webm', 'mkv', 'mov', 'avi', 'mp3', 'wav', 'aac', 'flac'];
    case 'audio':
      return ['mp3', 'wav', 'aac', 'flac', 'm4a', 'ogg'];
    case 'image':
      return ['jpg', 'png', 'webp', 'avif'];
    default:
      return ['mp4', 'mp3', 'jpg'];
  }
}

export function getDefaultOutputFormat(filename: string): string {
  const type = detectMediaType(filename);
  switch (type) {
    case 'video':
      return 'mp4';
    case 'audio':
      return 'mp3';
    case 'image':
      return 'webp';
    default:
      return 'mp4';
  }
}
