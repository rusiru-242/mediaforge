'use client';
import { useEffect, useRef, useState } from 'react';
import { CropRect, clampCrop } from '@/utils/videoCrop';

export function ImageCropPreview({ src, name, width, height, crop, enabled, onCrop, onLoad, filter, transform }: {
  src: string; name: string; width: number; height: number; crop: CropRect; enabled: boolean;
  onCrop: (rect: CropRect) => void; onLoad: React.ReactEventHandler<HTMLImageElement>; filter: string; transform: string;
}) {
  const frame = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ width: 0, height: 0 });
  const drag = useRef<{ x: number; y: number; crop: CropRect; edge: string } | null>(null);
  useEffect(() => {
    const node = frame.current; if (!node) return;
    const measure = () => setSize({ width: node.clientWidth, height: node.clientHeight });
    measure();
    const observer = new ResizeObserver(measure); observer.observe(node);
    return () => observer.disconnect();
  }, []);
  const scale = width && height ? Math.min(size.width / width, size.height / height) : 0;
  const left = (size.width - width * scale) / 2, top = (size.height - height * scale) / 2;
  return <div ref={frame} className="relative w-full h-full overflow-hidden">
    <img src={src} alt={name} onLoad={onLoad} className="w-full h-full object-contain" style={{ filter, transform: enabled ? undefined : transform }} />
    {enabled && scale > 0 && <div role="group" aria-label="Crop selection" className="absolute border-2 border-violet-400 cursor-move touch-none shadow-[0_0_0_9999px_rgba(0,0,0,0.5)]"
      style={{ left: left + crop.x * scale, top: top + crop.y * scale, width: crop.width * scale, height: crop.height * scale }}
      onPointerDown={e => { e.preventDefault(); e.currentTarget.setPointerCapture(e.pointerId); drag.current = { x: e.clientX, y: e.clientY, crop, edge: (e.target as HTMLElement).dataset.edge || 'move' }; }}
      onPointerMove={e => {
        const d = drag.current; if (!d) return;
        const dx = (e.clientX - d.x) / scale, dy = (e.clientY - d.y) / scale;
        if (d.edge === 'move') { onCrop(clampCrop({ ...d.crop, x: d.crop.x + dx, y: d.crop.y + dy }, width, height)); return; }
        let x = d.crop.x, y = d.crop.y, right = x + d.crop.width, bottom = y + d.crop.height;
        if (d.edge.includes('w')) x = Math.max(0, Math.min(right - 2, x + dx));
        if (d.edge.includes('e')) right = Math.min(width, Math.max(x + 2, right + dx));
        if (d.edge.includes('n')) y = Math.max(0, Math.min(bottom - 2, y + dy));
        if (d.edge.includes('s')) bottom = Math.min(height, Math.max(y + 2, bottom + dy));
        onCrop(clampCrop({ x, y, width: right - x, height: bottom - y }, width, height));
      }}
      onPointerUp={() => { drag.current = null; }} onPointerCancel={() => { drag.current = null; }}>
      <div className="absolute inset-0 grid grid-cols-3 grid-rows-3 pointer-events-none">{Array.from({ length: 9 }, (_, i) => <div key={i} className="border border-white/25" />)}</div>
      {[
        { edge: 'nw', position: '-left-2 -top-2', cursor: 'nwse-resize' },
        { edge: 'ne', position: '-right-2 -top-2', cursor: 'nesw-resize' },
        { edge: 'sw', position: '-left-2 -bottom-2', cursor: 'nesw-resize' },
        { edge: 'se', position: '-right-2 -bottom-2', cursor: 'nwse-resize' },
        { edge: 'n', position: 'left-1/2 -translate-x-1/2 -top-2', cursor: 'ns-resize' },
        { edge: 's', position: 'left-1/2 -translate-x-1/2 -bottom-2', cursor: 'ns-resize' },
        { edge: 'w', position: 'top-1/2 -translate-y-1/2 -left-2', cursor: 'ew-resize' },
        { edge: 'e', position: 'top-1/2 -translate-y-1/2 -right-2', cursor: 'ew-resize' },
      ].map(handle => <span key={handle.edge} data-edge={handle.edge} aria-label={`Resize crop ${handle.edge}`}
        className={`absolute w-4 h-4 bg-white border-2 border-violet-600 rounded-sm ${handle.position}`} style={{ cursor: handle.cursor }} />)}
    </div>}
  </div>;
}
