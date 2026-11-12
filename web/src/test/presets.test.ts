import { describe, it, expect } from 'vitest';
import {
  detectMediaType,
  getCompatibleOutputFormats,
  getDefaultOutputFormat,
  VIDEO_PRESETS,
  AUDIO_PRESETS,
  IMAGE_PRESETS,
} from '@/utils/presets';

describe('Preset and Format Utilities', () => {
  it('correctly detects media types from filenames', () => {
    expect(detectMediaType('sample_video.mp4')).toBe('video');
    expect(detectMediaType('test.mkv')).toBe('video');
    expect(detectMediaType('clip.webm')).toBe('video');
    expect(detectMediaType('recording.mp3')).toBe('audio');
    expect(detectMediaType('track.wav')).toBe('audio');
    expect(detectMediaType('lossless.flac')).toBe('audio');
    expect(detectMediaType('photo.jpg')).toBe('image');
    expect(detectMediaType('banner.webp')).toBe('image');
    expect(detectMediaType('unknown.xyz')).toBe('unknown');
  });

  it('returns valid compatible output formats', () => {
    const videoFormats = getCompatibleOutputFormats('movie.mp4');
    expect(videoFormats).toContain('mp4');
    expect(videoFormats).toContain('webm');
    expect(videoFormats).toContain('mp3'); // audio extraction

    const audioFormats = getCompatibleOutputFormats('song.wav');
    expect(audioFormats).toContain('mp3');
    expect(audioFormats).toContain('flac');
    expect(audioFormats).not.toContain('mp4');

    const imageFormats = getCompatibleOutputFormats('icon.png');
    expect(imageFormats).toContain('webp');
    expect(imageFormats).toContain('avif');
    expect(imageFormats).not.toContain('mp3');
  });

  it('returns sensible default output format', () => {
    expect(getDefaultOutputFormat('input.mov')).toBe('mp4');
    expect(getDefaultOutputFormat('input.wav')).toBe('mp3');
    expect(getDefaultOutputFormat('input.png')).toBe('webp');
  });

  it('defines quality presets for video, audio, and images', () => {
    expect(VIDEO_PRESETS.length).toBeGreaterThan(0);
    expect(AUDIO_PRESETS.length).toBeGreaterThan(0);
    expect(IMAGE_PRESETS.length).toBeGreaterThan(0);

    const highVideo = VIDEO_PRESETS.find((p) => p.id === 'high');
    expect(highVideo).toBeDefined();
    expect(highVideo?.resolution).toBe('1080p');

    const highAudio = AUDIO_PRESETS.find((p) => p.id === 'high');
    expect(highAudio).toBeDefined();
    expect(highAudio?.bitrate).toBe('320k');

    const balancedImage = IMAGE_PRESETS.find((p) => p.id === 'balanced');
    expect(balancedImage).toBeDefined();
    expect(balancedImage?.quality).toBe(75);
  });
});
