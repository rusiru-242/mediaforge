export const IMAGE_FILTERS = [
  { id: 'original', label: 'Original', brightness: 0, contrast: 1, saturation: 1, warmth: 0 },
  { id: 'vivid', label: 'Vivid', brightness: 0.03, contrast: 1.12, saturation: 1.45, warmth: 0 },
  { id: 'vivid-warm', label: 'Vivid Warm', brightness: 0.03, contrast: 1.1, saturation: 1.3, warmth: 0.3 },
  { id: 'vivid-cool', label: 'Vivid Cool', brightness: 0.02, contrast: 1.1, saturation: 1.3, warmth: -0.3 },
  { id: 'dramatic', label: 'Dramatic', brightness: -0.04, contrast: 1.4, saturation: 0.8, warmth: 0 },
  { id: 'mono', label: 'Mono', brightness: 0, contrast: 1.15, saturation: 0, warmth: 0 },
] as const;
export const IMAGE_RATIOS = ['original', '1:1', '4:3', '3:4', '16:9', '9:16', '4:5', '3:2', '2:3', '21:9', 'custom'];
