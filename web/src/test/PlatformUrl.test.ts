import { it, expect } from 'vitest';
import { detectDownloadPlatform } from '@/utils/platformUrl';
it.each([
  ['https://youtu.be/owned','youtube'], ['https://www.youtube.com/shorts/owned','youtube'],
  ['https://vt.tiktok.com/owned','tiktok'], ['https://www.facebook.com/reel/123','facebook'],
  ['https://fb.watch/owned','facebook'], ['https://www.instagram.com/reels/owned','instagram'],
  ['https://x.com/owner/status/123','twitter'], ['https://twitter.com/owner/status/123','twitter'],
  ['https://example.com/?next=youtube.com','direct'], ['https://notyoutube.com/owned','direct'],
  ['ftp://youtube.com/owned','direct'], ['https://user:pass@youtube.com/owned','direct'],
])('identifies %s as %s', (url, expected) => expect(detectDownloadPlatform(url)).toBe(expected));
