import React, { useRef, useState } from 'react';
import {
  UploadCloud,
  Sparkles,
  RotateCw,
  RotateCcw,
  ZoomIn,
  ZoomOut,
  Sliders,
  Square,
  FileSpreadsheet,
  Scissors,
  Eye,
  Maximize2,
  FileText,
  Image as ImageIcon,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Layers,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { CropState, LayoutConfig, PhotoPreset, QualityValidation } from '../types/passport';
import { ServerStatusResponse } from '../types/serverStatus';
import { COPY_OPTIONS, PAPER_SIZES, PHOTO_PRESETS } from '../constants/presets';
import { generateSamplePassportPhoto } from '../utils/samplePhoto';
import { detectFaceAndComputeCrop } from '../services/faceDetection';
import { removePersonBackground } from '../services/aiBackgroundRemoval';

interface StudioSidebarProps {
  image: HTMLImageElement | null;
  fileName: string | null;
  fileSizeKb: number | null;
  quality: QualityValidation | null;
  crop: CropState;
  setCrop: React.Dispatch<React.SetStateAction<CropState>>;
  selectedPreset: PhotoPreset;
  setSelectedPreset: (preset: PhotoPreset) => void;
  customWidthMm: number;
  setCustomWidthMm: (w: number) => void;
  customHeightMm: number;
  setCustomHeightMm: (h: number) => void;
  layout: LayoutConfig;
  setLayout: React.Dispatch<React.SetStateAction<LayoutConfig>>;
  maxPossibleCopies: number;
  showGuides: boolean;
  setShowGuides: (show: boolean) => void;
  onImageLoaded: (img: HTMLImageElement, name: string, sizeKb: number) => void;
  onOpenCropFocus: () => void;
  onDownloadPdf: () => void;
  onDownloadImage: (format: 'png' | 'jpeg') => void;
  onDownloadSingle: (format: 'png' | 'jpeg') => void;
  isExporting: boolean;
  targetDpi: 300 | 600;
  cutoutImg?: HTMLImageElement | null;
  setCutoutImg?: (img: HTMLImageElement | null) => void;
  serverStatus?: ServerStatusResponse | null;
  onOpenServerStatusModal?: () => void;
}

export const StudioSidebar: React.FC<StudioSidebarProps> = ({
  image,
  fileName,
  fileSizeKb,
  quality,
  crop,
  setCrop,
  selectedPreset,
  setSelectedPreset,
  customWidthMm,
  setCustomWidthMm,
  customHeightMm,
  setCustomHeightMm,
  layout,
  setLayout,
  maxPossibleCopies,
  showGuides,
  setShowGuides,
  onImageLoaded,
  onOpenCropFocus,
  onDownloadPdf,
  onDownloadImage,
  onDownloadSingle,
  isExporting,
  targetDpi,
  cutoutImg,
  setCutoutImg,
  serverStatus,
  onOpenServerStatusModal,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [activeAccordion, setActiveAccordion] = useState<'photo' | 'layout' | 'export'>('layout');
  const [isDetectingFace, setIsDetectingFace] = useState(false);
  const [isRemovingBg, setIsRemovingBg] = useState(false);

  const photoWidthMm = selectedPreset.id === 'custom' ? customWidthMm : selectedPreset.widthMm;
  const photoHeightMm = selectedPreset.id === 'custom' ? customHeightMm : selectedPreset.heightMm;

  const handleSelectBackground = async (newBgColor: string) => {
    if (newBgColor === 'original') {
      setCrop((p) => ({ ...p, bgColor: 'original' }));
      return;
    }

    setCrop((p) => ({ ...p, bgColor: newBgColor }));

    if (!cutoutImg && image && setCutoutImg && !isRemovingBg) {
      setIsRemovingBg(true);
      try {
        const cutout = await removePersonBackground(image);
        setCutoutImg(cutout);
      } catch (err) {
        console.error('Sidebar BG removal failed:', err);
      } finally {
        setIsRemovingBg(false);
      }
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.onload = (ev) => {
        const img = new Image();
        img.onload = () => onImageLoaded(img, file.name, Math.round(file.size / 1024));
        img.src = ev.target?.result as string;
      };
      reader.readAsDataURL(file);
    }
  };

  const handleLoadSample = () => {
    const sampleDataUrl = generateSamplePassportPhoto();
    const img = new Image();
    img.onload = () => onImageLoaded(img, 'sample-indian-passport-photo.jpg', 184);
    img.src = sampleDataUrl;
  };

  const handleAutoCenterFace = async () => {
    if (!image || isDetectingFace) return;
    setIsDetectingFace(true);
    try {
      const result = await detectFaceAndComputeCrop(image, photoWidthMm, photoHeightMm);
      setCrop((prev) => ({
        ...prev,
        zoom: result.recommendedCrop.zoom,
        panX: result.recommendedCrop.panX,
        panY: result.recommendedCrop.panY,
        rotation: 0,
      }));
    } catch (err) {
      console.error('Auto-center face failed:', err);
    } finally {
      setIsDetectingFace(false);
    }
  };

  const rotateBy = (deg: number) => {
    setCrop((prev) => {
      let nextRot = prev.rotation + deg;
      if (nextRot > 180) nextRot -= 360;
      if (nextRot < -180) nextRot += 360;
      return { ...prev, rotation: nextRot };
    });
  };

  return (
    <aside className="w-full lg:w-[390px] shrink-0 bg-zinc-900/90 border border-zinc-800 rounded-xl flex flex-col divide-y divide-zinc-800/80 shadow-xl overflow-hidden">
      {/* 1. PHOTO SOURCE BAR */}
      <div className="p-4 bg-zinc-950/40">
        <div className="flex items-center justify-between gap-2 mb-2.5">
          <span className="text-xs font-semibold text-zinc-200 uppercase tracking-wider font-mono">
            Candidate Photograph
          </span>
          <button
            type="button"
            onClick={handleLoadSample}
            className="text-[11px] text-amber-400 hover:text-amber-300 flex items-center gap-1 font-medium transition-colors"
          >
            <Sparkles className="w-3 h-3" />
            <span>Load Sample Photo</span>
          </button>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/jpg"
          className="hidden"
          onChange={handleFileChange}
        />

        <div className="flex items-center gap-3">
          {/* Mini Thumbnail or upload button */}
          <div
            onClick={() => fileInputRef.current?.click()}
            className="w-14 h-18 rounded border border-zinc-700 hover:border-amber-400 bg-zinc-900 flex flex-col items-center justify-center cursor-pointer transition-colors relative overflow-hidden group shrink-0"
            title="Click to change photo"
          >
            {image ? (
              <img
                src={image.src}
                alt="Uploaded"
                className="w-full h-full object-cover group-hover:opacity-75 transition-opacity"
              />
            ) : (
              <UploadCloud className="w-5 h-5 text-zinc-500" />
            )}
            <div className="absolute inset-0 bg-zinc-950/60 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity text-[10px] text-amber-300 text-center font-medium">
              Change
            </div>
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-1">
              <span className="text-xs font-medium text-zinc-200 truncate" title={fileName || ''}>
                {fileName || 'No photo loaded'}
              </span>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="text-[11px] text-zinc-400 hover:text-white px-2 py-0.5 rounded bg-zinc-800 hover:bg-zinc-700 transition-colors shrink-0"
              >
                Browse...
              </button>
            </div>

            {/* Quality pill */}
            {quality && (
              <div className="mt-1 flex items-center gap-2 text-[11px] text-zinc-400">
                <span className="font-mono">{quality.originalPixels.width}×{quality.originalPixels.height}px</span>
                <span>·</span>
                <span
                  className={
                    quality.qualityLevel === 'critical'
                      ? 'text-rose-400 font-medium'
                      : quality.qualityLevel === 'warning'
                      ? 'text-amber-400 font-medium'
                      : 'text-emerald-400 font-medium'
                  }
                >
                  {quality.effectiveDpi} DPI Print
                </span>
              </div>
            )}

            {/* Quick Face Center Button */}
            <div className="mt-2 flex items-center gap-2">
              <button
                type="button"
                onClick={handleAutoCenterFace}
                disabled={!image || isDetectingFace}
                className="text-[11px] py-1 px-2.5 rounded bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-300 font-medium flex items-center gap-1.5 transition-colors disabled:opacity-40"
              >
                <Sparkles className="w-3 h-3 text-amber-400" />
                <span>{isDetectingFace ? 'Centering...' : 'Auto-Center Face'}</span>
              </button>

              <button
                type="button"
                onClick={onOpenCropFocus}
                className="text-[11px] py-1 px-2 text-zinc-400 hover:text-zinc-200 transition-colors"
              >
                Fine Crop Editor →
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 2. PHOTO DIMENSIONS & BACKGROUND */}
      <div className="p-4 space-y-3">
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-zinc-300 flex items-center justify-between">
            <span>Passport Dimension Standard</span>
            <span className="text-[10px] text-amber-400/90 font-mono">
              {photoWidthMm} × {photoHeightMm} mm
            </span>
          </label>
          <select
            value={selectedPreset.id}
            onChange={(e) => {
              const p = PHOTO_PRESETS.find((x) => x.id === e.target.value);
              if (p) setSelectedPreset(p);
            }}
            className="w-full bg-zinc-950 border border-zinc-700/80 rounded-md px-3 py-1.5 text-zinc-200 text-xs focus:outline-none focus:border-amber-400"
          >
            {PHOTO_PRESETS.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} ({p.widthMm}×{p.heightMm} mm)
              </option>
            ))}
          </select>
        </div>

        {selectedPreset.id === 'custom' && (
          <div className="grid grid-cols-2 gap-2 pt-1">
            <div>
              <span className="text-[10px] text-zinc-400">Width (mm)</span>
              <input
                type="number"
                value={customWidthMm}
                onChange={(e) => setCustomWidthMm(Math.max(10, parseFloat(e.target.value) || 35))}
                className="w-full bg-zinc-950 border border-zinc-700 rounded px-2 py-1 text-xs text-zinc-200"
              />
            </div>
            <div>
              <span className="text-[10px] text-zinc-400">Height (mm)</span>
              <input
                type="number"
                value={customHeightMm}
                onChange={(e) => setCustomHeightMm(Math.max(10, parseFloat(e.target.value) || 45))}
                className="w-full bg-zinc-950 border border-zinc-700 rounded px-2 py-1 text-xs text-zinc-200"
              />
            </div>
          </div>
        )}

        {/* Quick Framing Controls (Zoom & Rotate) */}
        <div className="pt-2 border-t border-zinc-800/80 grid grid-cols-2 gap-3 text-xs">
          <div>
            <div className="flex justify-between text-[11px] text-zinc-400 mb-1">
              <span>Zoom Scale</span>
              <span className="font-mono text-zinc-200">{crop.zoom}x</span>
            </div>
            <div className="flex items-center gap-1">
              <input
                type="range"
                min="0.5"
                max="3.0"
                step="0.05"
                value={crop.zoom}
                onChange={(e) => setCrop((p) => ({ ...p, zoom: parseFloat(e.target.value) }))}
                className="w-full accent-amber-400 cursor-pointer"
              />
            </div>
          </div>

          <div>
            <div className="flex justify-between text-[11px] text-zinc-400 mb-1">
              <span>Rotate</span>
              <span className="font-mono text-zinc-200">{crop.rotation}°</span>
            </div>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => rotateBy(-90)}
                className="p-1 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300"
                title="Rotate -90°"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
              <input
                type="range"
                min="-180"
                max="180"
                step="2"
                value={crop.rotation}
                onChange={(e) => setCrop((p) => ({ ...p, rotation: parseInt(e.target.value, 10) }))}
                className="w-full accent-amber-400 cursor-pointer"
              />
              <button
                type="button"
                onClick={() => rotateBy(90)}
                className="p-1 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300"
                title="Rotate +90°"
              >
                <RotateCw className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>

        {/* Studio Background Selector */}
        <div className="pt-2 border-t border-zinc-800/80">
          <div className="flex items-center justify-between text-[11px] text-zinc-400 mb-1.5">
            <span className="font-medium text-zinc-300">Studio Background</span>
            {onOpenServerStatusModal && (
              <button
                type="button"
                onClick={onOpenServerStatusModal}
                className="text-[10px] font-mono text-amber-400 hover:underline flex items-center gap-1"
              >
                <span
                  className={`w-1.5 h-1.5 rounded-full ${
                    serverStatus?.cloudinary?.connected
                      ? 'bg-emerald-400'
                      : serverStatus?.gemini?.configured
                      ? 'bg-sky-400'
                      : 'bg-amber-400'
                  }`}
                />
                <span>
                  {serverStatus?.cloudinary?.connected
                    ? 'Cloudinary Live'
                    : serverStatus?.gemini?.configured
                    ? 'Gemini Live'
                    : 'Client Engine'}
                </span>
              </button>
            )}
          </div>
          <div className="grid grid-cols-5 gap-1 text-[11px]">
            <button
              type="button"
              onClick={() => handleSelectBackground('original')}
              className={`py-1 rounded text-center border transition-colors ${
                crop.bgColor === 'original'
                  ? 'bg-zinc-800 text-amber-400 border-amber-500/50 font-semibold'
                  : 'bg-zinc-950/60 text-zinc-400 border-zinc-800'
              }`}
            >
              Orig
            </button>
            <button
              type="button"
              onClick={() => handleSelectBackground('transparent')}
              className={`py-1 rounded text-center border transition-colors flex items-center justify-center gap-1 ${
                crop.bgColor === 'transparent'
                  ? 'bg-zinc-800 text-emerald-400 border-emerald-500/50 font-semibold'
                  : 'bg-zinc-950/60 text-zinc-400 border-zinc-800'
              }`}
              title="Remove Background (Transparent)"
            >
              <Scissors className="w-2.5 h-2.5 text-emerald-400" />
              <span>Cut</span>
            </button>
            <button
              type="button"
              onClick={() => handleSelectBackground('#FFFFFF')}
              className={`py-1 rounded text-center border transition-colors flex items-center justify-center gap-1 ${
                crop.bgColor === '#FFFFFF'
                  ? 'bg-zinc-800 text-amber-400 border-amber-500/50 font-semibold'
                  : 'bg-zinc-950/60 text-zinc-300 border-zinc-800'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-white border border-zinc-400 inline-block" />
              White
            </button>
            <button
              type="button"
              onClick={() => handleSelectBackground('#D0E4F7')}
              className={`py-1 rounded text-center border transition-colors flex items-center justify-center gap-1 ${
                crop.bgColor === '#D0E4F7'
                  ? 'bg-zinc-800 text-sky-400 border-sky-500/50 font-semibold'
                  : 'bg-zinc-950/60 text-zinc-300 border-zinc-800'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-[#D0E4F7] inline-block" />
              Blue
            </button>
            <button
              type="button"
              onClick={() => handleSelectBackground('#E2E8F0')}
              className={`py-1 rounded text-center border transition-colors flex items-center justify-center gap-1 ${
                crop.bgColor === '#E2E8F0'
                  ? 'bg-zinc-800 text-amber-400 border-amber-500/50 font-semibold'
                  : 'bg-zinc-950/60 text-zinc-300 border-zinc-800'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-[#E2E8F0] inline-block" />
              Grey
            </button>
          </div>
        </div>
      </div>

      {/* 3. A4 SHEET & GRID LAYOUT */}
      <div className="p-4 space-y-3.5">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-zinc-200 uppercase tracking-wider font-mono">
            Sheet & Grid Layout
          </span>
          <span className="text-[11px] font-mono text-zinc-400">
            Capacity: {maxPossibleCopies}
          </span>
        </div>

        {/* Paper format selector */}
        <div className="grid grid-cols-4 gap-1 text-xs">
          {(Object.keys(PAPER_SIZES) as Array<keyof typeof PAPER_SIZES>).map((key) => (
            <button
              key={key}
              type="button"
              onClick={() => setLayout((p) => ({ ...p, paperSize: key }))}
              className={`py-1.5 px-1 rounded text-center border font-mono transition-colors ${
                layout.paperSize === key
                  ? 'bg-zinc-800 text-amber-400 border-amber-500/50 font-semibold shadow-sm'
                  : 'bg-zinc-950/60 text-zinc-400 border-zinc-800 hover:text-white'
              }`}
            >
              {key}
            </button>
          ))}
        </div>

        {/* Orientation toggle */}
        <div className="grid grid-cols-2 gap-1.5 text-xs">
          <button
            type="button"
            onClick={() => setLayout((p) => ({ ...p, orientation: 'portrait' }))}
            className={`py-1.5 rounded text-center border transition-colors ${
              layout.orientation === 'portrait'
                ? 'bg-zinc-800 text-amber-400 border-amber-500/50 font-medium'
                : 'bg-zinc-950/60 text-zinc-400 border-zinc-800'
            }`}
          >
            Portrait Sheet
          </button>
          <button
            type="button"
            onClick={() => setLayout((p) => ({ ...p, orientation: 'landscape' }))}
            className={`py-1.5 rounded text-center border transition-colors ${
              layout.orientation === 'landscape'
                ? 'bg-zinc-800 text-amber-400 border-amber-500/50 font-medium'
                : 'bg-zinc-950/60 text-zinc-400 border-zinc-800'
            }`}
          >
            Landscape Sheet
          </button>
        </div>

        {/* Number of Copies */}
        <div className="space-y-1.5">
          <div className="flex justify-between text-xs text-zinc-300">
            <span>Number of Copies</span>
            <span className="font-mono text-amber-400 font-semibold">{layout.copies} Photos</span>
          </div>
          <div className="grid grid-cols-7 gap-1">
            {COPY_OPTIONS.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setLayout((p) => ({ ...p, copies: c }))}
                className={`py-1 rounded text-center border text-xs font-mono transition-colors ${
                  layout.copies === c
                    ? 'bg-amber-400 text-zinc-950 font-bold border-amber-400 shadow-sm'
                    : 'bg-zinc-950/60 text-zinc-400 border-zinc-800 hover:text-white'
                }`}
              >
                {c}
              </button>
            ))}
          </div>
        </div>

        {/* Spacing & Margins Sliders */}
        <div className="grid grid-cols-2 gap-3 text-xs pt-1">
          <div>
            <div className="flex justify-between text-[11px] text-zinc-400 mb-1">
              <span>Photo Gap</span>
              <span className="font-mono text-zinc-200">{layout.gapMm} mm</span>
            </div>
            <input
              type="range"
              min="0"
              max="10"
              step="0.5"
              value={layout.gapMm}
              onChange={(e) => setLayout((p) => ({ ...p, gapMm: parseFloat(e.target.value) }))}
              className="w-full accent-amber-400 cursor-pointer"
            />
          </div>

          <div>
            <div className="flex justify-between text-[11px] text-zinc-400 mb-1">
              <span>Sheet Margin</span>
              <span className="font-mono text-zinc-200">{layout.marginMm} mm</span>
            </div>
            <input
              type="range"
              min="2"
              max="20"
              step="1"
              value={layout.marginMm}
              onChange={(e) => setLayout((p) => ({ ...p, marginMm: parseFloat(e.target.value) }))}
              className="w-full accent-amber-400 cursor-pointer"
            />
          </div>
        </div>

        {/* Toggles: Cut Marks & Borders */}
        <div className="pt-2 border-t border-zinc-800/80 space-y-2 text-xs">
          <div className="flex items-center justify-between">
            <label className="flex items-center gap-2 cursor-pointer text-zinc-300">
              <input
                type="checkbox"
                checked={layout.showCutMarks}
                onChange={(e) => setLayout((p) => ({ ...p, showCutMarks: e.target.checked }))}
                className="rounded accent-amber-400"
              />
              <span>Cutting Guides</span>
            </label>
            {layout.showCutMarks && (
              <select
                value={layout.cutMarkStyle}
                onChange={(e) => setLayout((p) => ({ ...p, cutMarkStyle: e.target.value as any }))}
                className="bg-zinc-950 border border-zinc-700 rounded px-2 py-0.5 text-[11px] text-zinc-300"
              >
                <option value="ticks">Corner Ticks</option>
                <option value="dashed">Dashed Lines</option>
                <option value="solid">Solid Box</option>
              </select>
            )}
          </div>

          <div className="flex items-center justify-between">
            <label className="flex items-center gap-2 cursor-pointer text-zinc-300">
              <input
                type="checkbox"
                checked={layout.showBorder}
                onChange={(e) => setLayout((p) => ({ ...p, showBorder: e.target.checked }))}
                className="rounded accent-amber-400"
              />
              <span>Photo Edge Border (0.2mm)</span>
            </label>
          </div>
        </div>
      </div>

      {/* 4. EXPORT BUTTONS DRAWER */}
      <div className="p-4 bg-zinc-950/60 space-y-2">
        <button
          type="button"
          onClick={onDownloadPdf}
          disabled={!image || isExporting}
          className="w-full py-2.5 px-4 bg-amber-400 hover:bg-amber-300 text-zinc-950 font-bold text-xs rounded-md transition-all flex items-center justify-center gap-2 shadow-md shadow-amber-950/30 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <FileText className="w-4 h-4" />
          <span>{isExporting ? 'Generating PDF...' : `Download Print PDF (${targetDpi} DPI)`}</span>
        </button>

        <div className="grid grid-cols-2 gap-2 text-xs">
          <button
            type="button"
            onClick={() => onDownloadImage('png')}
            disabled={!image || isExporting}
            className="py-1.5 px-2 bg-zinc-800 hover:bg-zinc-750 text-zinc-200 rounded font-medium border border-zinc-700/80 transition-colors flex items-center justify-center gap-1.5 disabled:opacity-40"
          >
            <ImageIcon className="w-3.5 h-3.5 text-sky-400" />
            <span>Sheet PNG</span>
          </button>
          <button
            type="button"
            onClick={() => onDownloadSingle('jpeg')}
            disabled={!image}
            className="py-1.5 px-2 bg-zinc-800 hover:bg-zinc-750 text-zinc-200 rounded font-medium border border-zinc-700/80 transition-colors flex items-center justify-center gap-1.5 disabled:opacity-40"
            title="Download single photo for online application upload"
          >
            <Square className="w-3.5 h-3.5 text-amber-400" />
            <span>Single Photo</span>
          </button>
        </div>
      </div>
    </aside>
  );
};
