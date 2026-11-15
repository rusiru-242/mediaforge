export function detectDownloadPlatform(value: string, fallback = 'direct'): string {
  if (!value.trim()) return fallback;
  try {
    const url = new URL(value.trim());
    if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password) return 'direct';
    const matches = (domain: string) => url.hostname === domain || url.hostname.endsWith(`.${domain}`);
    if (['youtube.com', 'youtu.be', 'youtube-nocookie.com'].some(matches)) return 'youtube';
    if (matches('tiktok.com')) return 'tiktok';
    if (['facebook.com', 'fb.watch', 'fb.com'].some(matches)) return 'facebook';
    if (matches('instagram.com')) return 'instagram';
    if (['twitter.com', 'x.com', 't.co'].some(matches)) return 'twitter';
  } catch { /* Incomplete input remains editable. */ }
  return 'direct';
}
