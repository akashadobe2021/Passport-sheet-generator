import React, { useRef, useEffect, useState } from 'react';
import {
  Printer,
  Download,
  Eye,
  Maximize2,
  ZoomIn,
  ZoomOut,
  RefreshCw,
  FileText,
  Sliders,
  Sparkles
} from 'lucide-react';
import { LayoutConfig, PhotoPreset } from '../types/passport';
import { PAPER_SIZES } from '../constants/presets';
import { calculateSheetLayout, renderCompleteSheetCanvas } from '../services/imageProcessing';

interface StudioViewportProps {
  singlePhotoCanvas: HTMLCanvasElement | null;
  selectedPreset: PhotoPreset;
  customWidthMm: number;
  customHeightMm: number;
  layout: LayoutConfig;
  targetDpi: 300 | 600;
  onDownloadPdf: () => void;
  onPrint: () => void;
  onOpenCropFocus: () => void;
  isExporting: boolean;
}

export const StudioViewport: React.FC<StudioViewportProps> = ({
  singlePhotoCanvas,
  selectedPreset,
  customWidthMm,
  customHeightMm,
  layout,
  targetDpi,
  onDownloadPdf,
  onPrint,
  onOpenCropFocus,
  isExporting,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [zoomScale, setZoomScale] = useState<number | 'auto'>('auto');

  const photoWidthMm = selectedPreset.id === 'custom' ? customWidthMm : selectedPreset.widthMm;
  const photoHeightMm = selectedPreset.id === 'custom' ? customHeightMm : selectedPreset.heightMm;

  const paper = PAPER_SIZES[layout.paperSize];
  const isLandscape = layout.orientation === 'landscape';
  const paperWidthMm = isLandscape ? paper.heightMm : paper.widthMm;
  const paperHeightMm = isLandscape ? paper.widthMm : paper.heightMm;

  const grid = calculateSheetLayout(
    paperWidthMm,
    paperHeightMm,
    photoWidthMm,
    photoHeightMm,
    layout.copies,
    layout.marginMm,
    layout.gapMm
  );

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !singlePhotoCanvas) return;

    // Fast 150 DPI render for immediate, fluid viewport interaction
    const sheetCanvas = renderCompleteSheetCanvas(
      singlePhotoCanvas,
      photoWidthMm,
      photoHeightMm,
      layout,
      150
    );

    canvas.width = sheetCanvas.width;
    canvas.height = sheetCanvas.height;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.drawImage(sheetCanvas, 0, 0);
    }
  }, [singlePhotoCanvas, photoWidthMm, photoHeightMm, layout]);

  return (
    <div className="flex-1 flex flex-col bg-zinc-950/70 border border-zinc-800 rounded-xl overflow-hidden shadow-2xl relative">
      {/* 1. TOP FLOATING STUDIO TOOLBAR */}
      <div className="px-4 py-2.5 bg-zinc-900/90 border-b border-zinc-800 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-xs">
          <span className="font-semibold text-zinc-100">{paper.name} Sheet</span>
          <span className="text-zinc-500">·</span>
          <span className="font-mono text-zinc-400 tabular-nums">
            {paperWidthMm} × {paperHeightMm} mm
          </span>
          <span className="text-zinc-500">·</span>
          <span className="font-mono text-amber-400 font-semibold tabular-nums">
            {grid.actualCopies} Photos ({grid.cols}×{grid.rows} grid)
          </span>
        </div>

        {/* Viewport Scale & Actions */}
        <div className="flex items-center gap-2">
          {/* Zoom controls */}
          <div className="flex items-center bg-zinc-950 border border-zinc-800 rounded-md p-0.5 text-xs font-mono">
            <button
              type="button"
              onClick={() => setZoomScale('auto')}
              className={`px-2 py-0.5 rounded transition-colors ${
                zoomScale === 'auto'
                  ? 'bg-zinc-800 text-amber-400 font-semibold'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              Fit
            </button>
            <button
              type="button"
              onClick={() => setZoomScale(0.5)}
              className={`px-2 py-0.5 rounded transition-colors ${
                zoomScale === 0.5
                  ? 'bg-zinc-800 text-amber-400 font-semibold'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              50%
            </button>
            <button
              type="button"
              onClick={() => setZoomScale(0.75)}
              className={`px-2 py-0.5 rounded transition-colors ${
                zoomScale === 0.75
                  ? 'bg-zinc-800 text-amber-400 font-semibold'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              75%
            </button>
            <button
              type="button"
              onClick={() => setZoomScale(1.0)}
              className={`px-2 py-0.5 rounded transition-colors ${
                zoomScale === 1.0
                  ? 'bg-zinc-800 text-amber-400 font-semibold'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              100%
            </button>
          </div>

          <button
            type="button"
            onClick={onOpenCropFocus}
            className="hidden sm:inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-sky-400 bg-sky-500/10 hover:bg-sky-500/20 border border-sky-500/20 rounded-md transition-colors"
          >
            <Sliders className="w-3 h-3" />
            <span>Face Crop</span>
          </button>

          <button
            type="button"
            onClick={onPrint}
            disabled={!singlePhotoCanvas}
            className="p-1.5 rounded-md bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border border-zinc-700/80 transition-colors disabled:opacity-40"
            title="Browser Print Preview"
          >
            <Printer className="w-3.5 h-3.5" />
          </button>

          <button
            type="button"
            onClick={onDownloadPdf}
            disabled={!singlePhotoCanvas || isExporting}
            className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-semibold text-zinc-950 bg-amber-400 hover:bg-amber-300 rounded-md transition-colors disabled:opacity-40 shadow-sm"
          >
            <Download className="w-3.5 h-3.5" />
            <span>{isExporting ? 'Exporting...' : 'PDF'}</span>
          </button>
        </div>
      </div>

      {/* 2. MAIN SHEET CANVAS STAGE */}
      <div className="flex-1 overflow-auto p-4 sm:p-8 flex items-center justify-center min-h-[550px] relative bg-[#121316] select-none">
        {/* Subtle grid pattern background */}
        <div
          className="absolute inset-0 opacity-15 pointer-events-none"
          style={{
            backgroundImage:
              'radial-gradient(circle at 1px 1px, #71717a 1px, transparent 0)',
            backgroundSize: '24px 24px',
          }}
        />

        {singlePhotoCanvas ? (
          <div
            className="relative shadow-[0_25px_60px_-15px_rgba(0,0,0,0.9)] rounded-sm bg-white transition-all print-sheet-container"
            style={{
              width:
                zoomScale === 'auto'
                  ? isLandscape ? '100%' : 'auto'
                  : `${(paperWidthMm / 25.4) * 96 * (zoomScale as number)}px`,
              maxWidth:
                zoomScale === 'auto'
                  ? isLandscape ? '820px' : '580px'
                  : 'none',
              aspectRatio: `${paperWidthMm} / ${paperHeightMm}`,
            }}
          >
            <canvas ref={canvasRef} className="w-full h-full object-contain block" />
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center text-center text-zinc-500 py-16">
            <RefreshCw className="w-8 h-8 mb-2 opacity-30 animate-spin" />
            <p className="text-xs">Preparing print sheet preview...</p>
          </div>
        )}
      </div>

      {/* 3. BOTTOM RULER / SPEC FOOTER */}
      <div className="px-4 py-2 bg-zinc-900/90 border-t border-zinc-800 text-[11px] text-zinc-400 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-3">
          <span>
            Photo Size: <strong className="text-zinc-200 font-mono">{photoWidthMm}×{photoHeightMm} mm</strong>
          </span>
          <span>·</span>
          <span>
            Margins: <strong className="text-zinc-200 font-mono">{layout.marginMm} mm</strong>
          </span>
          <span>·</span>
          <span>
            Gap: <strong className="text-zinc-200 font-mono">{layout.gapMm} mm</strong>
          </span>
        </div>

        <div className="flex items-center gap-2">
          <span>Resolution:</span>
          <span className="font-mono text-emerald-400 font-semibold">{targetDpi} DPI Vector Lossless</span>
        </div>
      </div>
    </div>
  );
};
