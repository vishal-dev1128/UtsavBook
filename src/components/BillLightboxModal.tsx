import { Download, RotateCw, X, ZoomIn, ZoomOut } from 'lucide-react';
import { useEffect, useState } from 'react';

interface BillLightboxModalProps {
  imageUrl: string | null;
  title?: string;
  subtitle?: string;
  onClose: () => void;
}

export function BillLightboxModal({ imageUrl, title, subtitle, onClose }: BillLightboxModalProps) {
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);

  useEffect(() => {
    setZoom(1);
    setRotation(0);
  }, [imageUrl]);

  useEffect(() => {
    if (!imageUrl) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === '+' || e.key === '=') setZoom((z) => Math.min(3, Number((z + 0.5).toFixed(1))));
      if (e.key === '-') setZoom((z) => Math.max(1, Number((z - 0.5).toFixed(1))));
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [imageUrl, onClose]);

  if (!imageUrl) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col bg-slate-950/90 backdrop-blur-md"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={title || 'Expense Bill Viewer'}
    >
      {/* Top Toolbar */}
      <div
        className="flex items-center justify-between gap-3 border-b border-white/10 bg-slate-950/70 px-4 py-3 text-white"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="min-w-0">
          <p className="truncate text-[14px] font-bold">{title || 'Expense Bill / Kacchi Parchi'}</p>
          {subtitle && <p className="truncate text-[11px] text-slate-300">{subtitle}</p>}
        </div>

        <div className="flex shrink-0 items-center gap-1.5">
          <button
            type="button"
            onClick={() => setZoom((z) => Math.max(1, Number((z - 0.5).toFixed(1))))}
            disabled={zoom <= 1}
            className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10 text-white hover:bg-white/20 disabled:opacity-40"
            title="Zoom Out"
          >
            <ZoomOut className="h-4 w-4" />
          </button>
          <span className="min-w-[44px] text-center font-mono text-[12px] font-bold tabular-nums text-blue-300">
            {zoom.toFixed(1)}x
          </span>
          <button
            type="button"
            onClick={() => setZoom((z) => Math.min(3, Number((z + 0.5).toFixed(1))))}
            disabled={zoom >= 3}
            className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10 text-white hover:bg-white/20 disabled:opacity-40"
            title="Zoom In"
          >
            <ZoomIn className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => setRotation((r) => (r + 90) % 360)}
            className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10 text-white hover:bg-white/20"
            title="Rotate 90°"
          >
            <RotateCw className="h-4 w-4" />
          </button>
          <a
            href={imageUrl}
            download={`bill-${Date.now()}.jpg`}
            className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 text-white hover:bg-blue-500"
            title="Download Bill Image"
          >
            <Download className="h-4 w-4" />
          </a>
          <button
            type="button"
            onClick={onClose}
            className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/15 text-white hover:bg-rose-600"
            title="Close Viewer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* Image Viewport */}
      <div
        className="flex flex-1 items-center justify-center overflow-auto p-4 sm:p-8"
        onClick={onClose}
      >
        <img
          src={imageUrl}
          alt={title || 'Bill photo'}
          onClick={(e) => {
            e.stopPropagation();
            setZoom((z) => (z < 2 ? 2 : 1));
          }}
          style={{
            transform: `scale(${zoom}) rotate(${rotation}deg)`,
            transformOrigin: 'center center',
          }}
          className="max-h-[82vh] max-w-full cursor-zoom-in rounded-xl border border-white/15 object-contain shadow-2xl transition-transform duration-200"
        />
      </div>

      {/* Footer Hint */}
      <div className="py-2 text-center text-[11px] font-medium text-slate-400">
        Tap image to toggle 2x zoom · Tap outside or press Esc to close
      </div>
    </div>
  );
}
