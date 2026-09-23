import React, { useRef, useEffect, useState } from 'react';
import { ZoomIn, ZoomOut, Maximize2, RefreshCw, Printer, Download } from 'lucide-react';
import { LayoutConfig, PhotoPreset } from '../types/passport';
import { PAPER_SIZES } from '../constants/presets';
import { calculateSheetLayout, renderCompleteSheetCanvas } from '../services/imageProcessing';

interface PreviewSectionProps {
  singlePhotoCanvas: HTMLCanvasElement | null;
  selectedPreset: PhotoPreset;
  customWidthMm: number;
  customHeightMm: number;
  layout: LayoutConfig;
  targetDpi: 300 | 600;
  onDownloadPdf: () => void;
  onPrint: () => void;
  isExporting: boolean;
}

export const PreviewSection: React.FC<PreviewSectionProps> = ({
  singlePhotoCanvas,
  selectedPreset,
  customWidthMm,
  customHeightMm,
  layout,
  targetDpi,
  onDownloadPdf,
  onPrint,
  isExporting,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
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

  // Re-render sheet preview canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !singlePhotoCanvas) return;

    // For screen preview, use 150 DPI for rapid, fluid updates
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
    <div className="bg-neutral-900/80 border border-neutral-800 rounded-xl p-4 lg:p-5 flex flex-col gap-4">
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-neutral-200">4. Live Print Sheet Preview</h2>
          <div className="flex items-center gap-2 text-xs text-neutral-400 mt-0.5">
            <span>{paper.label}</span>
            <span aria-hidden="true">·</span>
            <span className="font-mono tabular-nums">{paperWidthMm} × {paperHeightMm} mm</span>
            <span aria-hidden="true">·</span>
            <span className="font-mono text-amber-400 tabular-nums">
              {grid.actualCopies} photos ({grid.cols} cols × {grid.rows} rows)
            </span>
          </div>
        </div>

        {/* Viewport controls */}
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <div className="flex items-center bg-neutral-950 border border-neutral-800 rounded-md p-0.5 text-xs">
            <button
              type="button"
              onClick={() => setZoomScale('auto')}
              className={`px-2 py-1 rounded transition-colors ${
                zoomScale === 'auto' ? 'bg-neutral-800 text-amber-400 font-medium' : 'text-neutral-400 hover:text-neutral-200'
              }`}
            >
              Fit
            </button>
            <button
              type="button"
              onClick={() => setZoomScale(0.5)}
              className={`px-2 py-1 rounded transition-colors ${
                zoomScale === 0.5 ? 'bg-neutral-800 text-amber-400 font-medium' : 'text-neutral-400 hover:text-neutral-200'
              }`}
            >
              50%
            </button>
            <button
              type="button"
              onClick={() => setZoomScale(0.75)}
              className={`px-2 py-1 rounded transition-colors ${
                zoomScale === 0.75 ? 'bg-neutral-800 text-amber-400 font-medium' : 'text-neutral-400 hover:text-neutral-200'
              }`}
            >
              75%
            </button>
            <button
              type="button"
              onClick={() => setZoomScale(1.0)}
              className={`px-2 py-1 rounded transition-colors ${
                zoomScale === 1.0 ? 'bg-neutral-800 text-amber-400 font-medium' : 'text-neutral-400 hover:text-neutral-200'
              }`}
            >
              100%
            </button>
          </div>

          <button
            type="button"
            onClick={onPrint}
            disabled={!singlePhotoCanvas}
            className="p-1.5 rounded-md bg-neutral-800 text-neutral-300 hover:bg-neutral-750 border border-neutral-700 disabled:opacity-40"
            title="Print sheet"
          >
            <Printer className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main Preview Container with Physical Drop-Shadow and Millimeter Scales */}
      <div
        ref={containerRef}
        className="w-full min-h-[500px] max-h-[750px] overflow-auto bg-neutral-950/70 border border-neutral-800 rounded-lg p-6 lg:p-10 flex items-center justify-center relative select-none"
      >
        {singlePhotoCanvas ? (
          <div
            className="relative transition-all shadow-2xl rounded-sm border border-neutral-400/20 bg-white"
            style={{
              width:
                zoomScale === 'auto'
                  ? isLandscape ? '100%' : 'auto'
                  : `${(paperWidthMm / 25.4) * 96 * (zoomScale as number)}px`,
              maxWidth: zoomScale === 'auto' ? (isLandscape ? '720px' : '520px') : 'none',
              aspectRatio: `${paperWidthMm} / ${paperHeightMm}`,
            }}
          >
            <canvas
              ref={canvasRef}
              className="w-full h-full object-contain block"
            />
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center text-center text-neutral-500 py-16">
            <RefreshCw className="w-8 h-8 mb-2 opacity-30 animate-spin" />
            <p className="text-xs">Waiting for photograph to generate live preview...</p>
          </div>
        )}
      </div>

      {/* Physical Sheet Summary Metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
        <div className="bg-neutral-950/50 p-2.5 rounded-lg border border-neutral-800">
          <div className="text-[11px] text-neutral-400">Sheet Dimensions</div>
          <div className="font-mono text-neutral-200 mt-0.5 tabular-nums">
            {paperWidthMm} × {paperHeightMm} mm
          </div>
        </div>

        <div className="bg-neutral-950/50 p-2.5 rounded-lg border border-neutral-800">
          <div className="text-[11px] text-neutral-400">Photo Size</div>
          <div className="font-mono text-neutral-200 mt-0.5 tabular-nums">
            {photoWidthMm} × {photoHeightMm} mm
          </div>
        </div>

        <div className="bg-neutral-950/50 p-2.5 rounded-lg border border-neutral-800">
          <div className="text-[11px] text-neutral-400">Grid Copies</div>
          <div className="font-mono text-amber-400 font-semibold mt-0.5 tabular-nums">
            {grid.actualCopies} Photos ({grid.cols}×{grid.rows})
          </div>
        </div>

        <div className="bg-neutral-950/50 p-2.5 rounded-lg border border-neutral-800">
          <div className="text-[11px] text-neutral-400">Export Quality</div>
          <div className="font-mono text-emerald-400 font-semibold mt-0.5 tabular-nums">
            {targetDpi} DPI Print-Ready
          </div>
        </div>
      </div>
    </div>
  );
};
