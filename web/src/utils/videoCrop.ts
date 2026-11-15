export interface CropRect { x: number; y: number; width: number; height: number }

export function zoomCrop(rect: CropRect, sourceWidth: number, sourceHeight: number, percent: number, ratio = rect.width / rect.height): CropRect {
  if (sourceWidth <= 0 || sourceHeight <= 0 || !Number.isFinite(ratio) || ratio <= 0) return rect;
  const scale = Math.max(1, percent / 100);
  const width = Math.min(sourceWidth, sourceHeight * ratio) / scale;
  const height = width / ratio;
  return clampCrop({ x: rect.x + (rect.width - width) / 2, y: rect.y + (rect.height - height) / 2, width, height }, sourceWidth, sourceHeight);
}

export function clampCrop(rect: CropRect, sourceWidth: number, sourceHeight: number): CropRect {
  const even = (n: number) => Math.floor((Number.isFinite(n) ? n : 0) / 2) * 2;
  const width = Math.max(2, Math.min(even(sourceWidth), even(rect.width)));
  const height = Math.max(2, Math.min(even(sourceHeight), even(rect.height)));
  return { width, height, x: Math.max(0, Math.min(even(sourceWidth - width), even(rect.x))),
    y: Math.max(0, Math.min(even(sourceHeight - height), even(rect.y))) };
}
