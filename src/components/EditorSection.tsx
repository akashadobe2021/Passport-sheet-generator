import React, { useRef, useEffect, useState, useCallback } from 'react';
import {
  ZoomIn,
  ZoomOut,
  RotateCw,
  RotateCcw,
  Sparkles,
  RotateCcw as ResetIcon,
  Eye,
  Sliders,
  Paintbrush,
  Maximize2,
  Move,
  Smartphone,
  Scissors,
  Wand2,
  Check,
  Pipette,
  Layers
} from 'lucide-react';
import { CropState, FaceDetectionBox, PhotoPreset } from '../types/passport';
import { detectFaceAndComputeCrop } from '../services/faceDetection';

interface EditorSectionProps {
  image: HTMLImageElement | null;
  crop: CropState;
  setCrop: React.Dispatch<React.SetStateAction<CropState>>;
  selectedPreset: PhotoPreset;
  customWidthMm: number;
  customHeightMm: number;
  showGuides: boolean;
  setShowGuides: (show: boolean) => void;
}

export const EditorSection: React.FC<EditorSectionProps> = ({
  image,
  crop,
  setCrop,
  selectedPreset,
  customWidthMm,
  customHeightMm,
  showGuides,
  setShowGuides,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  
  // Touch gesture state (supporting 1-finger pan and 2-finger pinch zoom)
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);
  const pinchStartDistanceRef = useRef<number | null>(null);
  const initialZoomRef = useRef<number>(crop.zoom);

  const [detectedFace, setDetectedFace] = useState<FaceDetectionBox | null>(null);
  const [isDetectingFace, setIsDetectingFace] = useState(false);
  const [detectionNotice, setDetectionNotice] = useState<string | null>(null);
  const [customColorHex, setCustomColorHex] = useState<string>('#E0F2FE');

  const photoWidthMm = selectedPreset.id === 'custom' ? customWidthMm : selectedPreset.widthMm;
  const photoHeightMm = selectedPreset.id === 'custom' ? customHeightMm : selectedPreset.heightMm;
  const aspect = photoWidthMm / photoHeightMm;

  // Draw photo onto preview canvas whenever state changes
  const redraw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !image) return;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return;

    const w = canvas.width;
    const h = canvas.height;

    ctx.clearRect(0, 0, w, h);

    // If background is NOT transparent and NOT original, fill with target background color
    if (crop.bgColor !== 'original' && crop.bgColor !== 'transparent') {
      ctx.fillStyle = crop.bgColor;
      ctx.fillRect(0, 0, w, h);
    }

    // Save and transform
    ctx.save();
    ctx.translate(w / 2, h / 2);
    ctx.rotate((crop.rotation * Math.PI) / 180);

    const imgAspect = image.naturalWidth / image.naturalHeight;
    let drawW: number;
    let drawH: number;

    if (imgAspect > aspect) {
      drawH = h * crop.zoom;
      drawW = drawH * imgAspect;
    } else {
      drawW = w * crop.zoom;
      drawH = drawW / imgAspect;
    }

    // Precise drawing scale relative to original photo resolution
    const imgScale = drawH / image.naturalHeight;
    const scaledPanX = crop.panX * imgScale;
    const scaledPanY = crop.panY * imgScale;

    ctx.drawImage(
      image,
      -drawW / 2 + scaledPanX,
      -drawH / 2 + scaledPanY,
      drawW,
      drawH
    );
    ctx.restore();

    // If background removal or color replacement is active, apply quick visual cutout
    if (crop.bgColor !== 'original') {
      applyQuickBgCutout(ctx, w, h, crop.bgColor, crop.bgTolerance, crop.bgFeather);
    }

    // Draw Indian Passport Guideline Overlay
    if (showGuides) {
      drawPassportGuidelines(ctx, w, h);
    }
  }, [image, crop, aspect, showGuides]);

  useEffect(() => {
    redraw();
  }, [redraw]);

  // Helper to compute pixel movement to original unscaled image units
  const getPanScaleFactor = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !image) return 1;
    const h = canvas.height;
    const imgAspect = image.naturalWidth / image.naturalHeight;
    let drawH: number;
    if (imgAspect > aspect) {
      drawH = h * crop.zoom;
    } else {
      const drawW = canvas.width * crop.zoom;
      drawH = drawW / imgAspect;
    }
    const imgScale = drawH / image.naturalHeight;
    const rect = canvas.getBoundingClientRect();
    const cssToCanvasRatio = canvas.width / (rect.width || 1);
    return cssToCanvasRatio / imgScale;
  }, [image, aspect, crop.zoom]);

  // ---------------------------------------------------------
  // MOUSE EVENT HANDLERS
  // ---------------------------------------------------------
  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    setIsDragging(true);
    setDragStart({ x: e.clientX, y: e.clientY });
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDragging || !image) return;
    const dx = e.clientX - dragStart.x;
    const dy = e.clientY - dragStart.y;
    setDragStart({ x: e.clientX, y: e.clientY });

    const factor = getPanScaleFactor();
    setCrop((prev) => ({
      ...prev,
      panX: prev.panX + dx * factor,
      panY: prev.panY + dy * factor,
    }));
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Wheel to Zoom
  const handleWheel = (e: React.WheelEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const zoomDelta = e.deltaY < 0 ? 0.05 : -0.05;
    setCrop((prev) => ({
      ...prev,
      zoom: Math.max(0.5, Math.min(3.5, Number((prev.zoom + zoomDelta).toFixed(2)))),
    }));
  };

  // ---------------------------------------------------------
  // TOUCH EVENT HANDLERS (Mobile 1-finger pan & 2-finger pinch)
  // ---------------------------------------------------------
  const handleTouchStart = (e: React.TouchEvent<HTMLCanvasElement>) => {
    if (!image) return;
    setIsDragging(true);

    if (e.touches.length === 1) {
      const touch = e.touches[0];
      touchStartRef.current = { x: touch.clientX, y: touch.clientY };
      pinchStartDistanceRef.current = null;
    } else if (e.touches.length === 2) {
      const touch1 = e.touches[0];
      const touch2 = e.touches[1];
      const distance = Math.hypot(touch1.clientX - touch2.clientX, touch1.clientY - touch2.clientY);
      pinchStartDistanceRef.current = distance;
      initialZoomRef.current = crop.zoom;
      touchStartRef.current = {
        x: (touch1.clientX + touch2.clientX) / 2,
        y: (touch1.clientY + touch2.clientY) / 2,
      };
    }
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLCanvasElement>) => {
    if (!image) return;

    if (e.touches.length === 1 && touchStartRef.current) {
      const touch = e.touches[0];
      const dx = touch.clientX - touchStartRef.current.x;
      const dy = touch.clientY - touchStartRef.current.y;
      touchStartRef.current = { x: touch.clientX, y: touch.clientY };

      const factor = getPanScaleFactor();
      setCrop((prev) => ({
        ...prev,
        panX: prev.panX + dx * factor,
        panY: prev.panY + dy * factor,
      }));
    } else if (e.touches.length === 2 && pinchStartDistanceRef.current) {
      const touch1 = e.touches[0];
      const touch2 = e.touches[1];
      const currentDist = Math.hypot(touch1.clientX - touch2.clientX, touch1.clientY - touch2.clientY);
      const scaleMultiplier = currentDist / pinchStartDistanceRef.current;
      const nextZoom = Math.max(0.5, Math.min(3.5, Number((initialZoomRef.current * scaleMultiplier).toFixed(2))));

      if (touchStartRef.current) {
        const midX = (touch1.clientX + touch2.clientX) / 2;
        const midY = (touch1.clientY + touch2.clientY) / 2;
        const dx = midX - touchStartRef.current.x;
        const dy = midY - touchStartRef.current.y;
        touchStartRef.current = { x: midX, y: midY };

        const factor = getPanScaleFactor();
        setCrop((prev) => ({
          ...prev,
          zoom: nextZoom,
          panX: prev.panX + dx * factor,
          panY: prev.panY + dy * factor,
        }));
      } else {
        setCrop((prev) => ({ ...prev, zoom: nextZoom }));
      }
    }
  };

  const handleTouchEnd = () => {
    touchStartRef.current = null;
    pinchStartDistanceRef.current = null;
    setIsDragging(false);
  };

  // ---------------------------------------------------------
  // AUTO-CENTER FACE
  // ---------------------------------------------------------
  const handleAutoCenterFace = async () => {
    if (!image || isDetectingFace) return;
    setIsDetectingFace(true);
    setDetectionNotice(null);

    try {
      const result = await detectFaceAndComputeCrop(image, photoWidthMm, photoHeightMm);
      setDetectedFace(result.face);
      setCrop((prev) => ({
        ...prev,
        zoom: result.recommendedCrop.zoom,
        panX: result.recommendedCrop.panX,
        panY: result.recommendedCrop.panY,
        rotation: 0,
      }));
      setDetectionNotice('✓ Face centered to 70–80% Indian passport standard');
      setTimeout(() => setDetectionNotice(null), 3500);
    } catch (err) {
      console.error('Face auto-detect error:', err);
      setDetectionNotice('Could not auto-align face. Please adjust manually.');
    } finally {
      setIsDetectingFace(false);
    }
  };

  const handleResetCrop = () => {
    setCrop({
      zoom: 1.0,
      panX: 0,
      panY: 0,
      rotation: 0,
      bgColor: 'original',
      bgTolerance: 25,
      bgFeather: 2,
    });
    setDetectionNotice(null);
  };

  const rotateBy = (deg: number) => {
    setCrop((prev) => {
      let nextRot = prev.rotation + deg;
      if (nextRot > 180) nextRot -= 360;
      if (nextRot < -180) nextRot += 360;
      return { ...prev, rotation: nextRot };
    });
  };

  const isBgRemoved = crop.bgColor !== 'original';

  return (
    <div className="bg-zinc-900/90 border border-zinc-800 rounded-xl p-4 lg:p-5 flex flex-col gap-4 shadow-xl">
      {/* Top Header & Actions Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-semibold text-zinc-100">Passport Crop & Framing Editor</h2>
            <span className="text-[10px] px-2 py-0.5 rounded bg-amber-400/10 text-amber-300 border border-amber-500/20 font-mono">
              {photoWidthMm}×{photoHeightMm} mm
            </span>
          </div>
          <p className="text-xs text-zinc-400 mt-0.5">
            Drag to position face, auto-align with 1-click, and remove or customize the background.
          </p>
        </div>

        <div className="flex items-center gap-1.5 flex-wrap self-start sm:self-auto">
          <button
            type="button"
            onClick={() => setShowGuides(!showGuides)}
            className={`inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-md border transition-colors ${
              showGuides
                ? 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                : 'bg-zinc-800 text-zinc-400 border-zinc-700/60 hover:text-zinc-200'
            }`}
          >
            <Eye className="w-3.5 h-3.5" />
            <span>Guide Lines</span>
          </button>

          <button
            type="button"
            onClick={handleAutoCenterFace}
            disabled={!image || isDetectingFace}
            className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-semibold text-zinc-950 bg-amber-400 hover:bg-amber-300 rounded-md transition-colors disabled:opacity-40 shadow-sm"
            title="Auto-detect face and align to 75% height"
          >
            <Sparkles className="w-3.5 h-3.5 text-zinc-950" />
            <span>{isDetectingFace ? 'Detecting...' : 'Auto-Center Face'}</span>
          </button>

          <button
            type="button"
            onClick={handleResetCrop}
            disabled={!image}
            className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-zinc-400 hover:text-zinc-200 bg-zinc-800 hover:bg-zinc-750 border border-zinc-700/60 rounded-md transition-colors disabled:opacity-40"
            title="Reset framing"
          >
            <ResetIcon className="w-3.5 h-3.5" />
            <span>Reset</span>
          </button>
        </div>
      </div>

      {detectionNotice && (
        <div className="text-xs py-1.5 px-3 rounded bg-amber-500/10 border border-amber-500/20 text-amber-300 flex items-center gap-2">
          <Sparkles className="w-3.5 h-3.5 text-amber-400 shrink-0" />
          <span>{detectionNotice}</span>
        </div>
      )}

      {/* Main Interactive Touch/Mouse Canvas Viewport + Controls */}
      <div className="flex flex-col xl:flex-row items-center justify-center gap-6">
        <div className="relative flex flex-col items-center">
          {/* Passport Aspect Ratio Frame with Transparency Checkerboard support */}
          <div
            className={`relative border-2 border-zinc-700 hover:border-amber-400/80 rounded-md shadow-2xl overflow-hidden cursor-grab active:cursor-grabbing touch-none select-none transition-colors ${
              crop.bgColor === 'transparent'
                ? 'bg-[linear-gradient(45deg,#18181b_25%,transparent_25%),linear-gradient(-45deg,#18181b_25%,transparent_25%),linear-gradient(45deg,transparent_75%,#18181b_75%),linear-gradient(-45deg,transparent_75%,#18181b_75%)] bg-[size:16px_16px] bg-[position:0_0,0_8px,8px_-8px,-8px_0px] bg-zinc-900'
                : 'bg-zinc-950'
            }`}
            style={{
              width: aspect >= 1 ? '320px' : `${Math.round(380 * aspect)}px`,
              height: aspect >= 1 ? `${Math.round(320 / aspect)}px` : '380px',
              touchAction: 'none',
            }}
          >
            {image ? (
              <canvas
                ref={canvasRef}
                width={Math.round(aspect >= 1 ? 320 * 2 : 380 * aspect * 2)}
                height={Math.round(aspect >= 1 ? (320 / aspect) * 2 : 380 * 2)}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
                onTouchCancel={handleTouchEnd}
                onWheel={handleWheel}
                className="w-full h-full object-cover block touch-none"
                style={{ touchAction: 'none' }}
              />
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center p-6 text-center text-zinc-500">
                <Paintbrush className="w-8 h-8 mb-2 opacity-30" />
                <p className="text-xs">Upload a photograph to start editing</p>
              </div>
            )}

            {/* Dimension Badge in corner */}
            <div className="absolute bottom-2 right-2 bg-zinc-950/85 border border-zinc-800 backdrop-blur px-2 py-0.5 rounded text-[10px] font-mono text-zinc-300 pointer-events-none">
              {photoWidthMm} × {photoHeightMm} mm
            </div>

            {/* Background Cutout status indicator pill */}
            {crop.bgColor === 'transparent' && (
              <div className="absolute top-2 left-2 bg-emerald-500/90 text-zinc-950 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 shadow pointer-events-none">
                <Scissors className="w-3 h-3" />
                <span>Cutout / Transparent</span>
              </div>
            )}
          </div>

          {/* User Guide Hint (Mobile & Desktop) */}
          <div className="flex items-center gap-1.5 text-[11px] text-zinc-400 mt-2.5 text-center">
            <Move className="w-3.5 h-3.5 text-amber-400" />
            <span>
              <strong className="text-zinc-200">Drag with finger / mouse</strong> to pan · <strong className="text-zinc-200">Pinch or scroll</strong> to zoom
            </span>
          </div>
        </div>

        {/* Sliders & Fine Tuning Controls */}
        <div className="w-full xl:w-88 flex flex-col gap-3.5 text-xs bg-zinc-950/60 p-4 rounded-xl border border-zinc-800/90 shadow-md">
          {/* Zoom Slider */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-zinc-300">
              <span className="flex items-center gap-1.5 font-medium">
                <ZoomIn className="w-3.5 h-3.5 text-zinc-400" />
                Zoom Scale
              </span>
              <span className="font-mono text-amber-400 tabular-nums font-semibold">{crop.zoom}x</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setCrop((p) => ({ ...p, zoom: Math.max(0.5, Number((p.zoom - 0.1).toFixed(2))) }))}
                className="p-1.5 rounded bg-zinc-800 text-zinc-300 hover:bg-zinc-700 transition-colors"
                title="Zoom Out"
              >
                <ZoomOut className="w-3.5 h-3.5" />
              </button>
              <input
                type="range"
                min="0.5"
                max="3.5"
                step="0.05"
                value={crop.zoom}
                onChange={(e) => setCrop((p) => ({ ...p, zoom: parseFloat(e.target.value) }))}
                className="flex-1 accent-amber-400 cursor-pointer"
              />
              <button
                type="button"
                onClick={() => setCrop((p) => ({ ...p, zoom: Math.min(3.5, Number((p.zoom + 0.1).toFixed(2))) }))}
                className="p-1.5 rounded bg-zinc-800 text-zinc-300 hover:bg-zinc-700 transition-colors"
                title="Zoom In"
              >
                <ZoomIn className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Rotation Slider & Step Buttons */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-zinc-300">
              <span className="flex items-center gap-1.5 font-medium">
                <RotateCw className="w-3.5 h-3.5 text-zinc-400" />
                Rotation Angle
              </span>
              <span className="font-mono text-zinc-300 tabular-nums">{crop.rotation}°</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => rotateBy(-90)}
                className="p-1.5 rounded bg-zinc-800 text-zinc-300 hover:bg-zinc-700 transition-colors"
                title="Rotate 90° Counter-Clockwise"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
              <input
                type="range"
                min="-180"
                max="180"
                step="1"
                value={crop.rotation}
                onChange={(e) => setCrop((p) => ({ ...p, rotation: parseInt(e.target.value, 10) }))}
                className="flex-1 accent-amber-400 cursor-pointer"
              />
              <button
                type="button"
                onClick={() => rotateBy(90)}
                className="p-1.5 rounded bg-zinc-800 text-zinc-300 hover:bg-zinc-700 transition-colors"
                title="Rotate 90° Clockwise"
              >
                <RotateCw className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* --------------------------------------------------------- */}
          {/* BACKGROUND REMOVAL & COLOR STUDIO SECTION                 */}
          {/* --------------------------------------------------------- */}
          <div className="pt-3 border-t border-zinc-800/90 space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-zinc-200 font-semibold text-xs">
                <Scissors className="w-3.5 h-3.5 text-amber-400" />
                <span>Background Removal & Color</span>
              </div>
              <span className="text-[10px] font-mono text-amber-400">
                {crop.bgColor === 'original'
                  ? 'Original'
                  : crop.bgColor === 'transparent'
                  ? 'Transparent Cutout'
                  : 'Studio Replaced'}
              </span>
            </div>

            {/* Quick 1-Click Background Remover Button */}
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setCrop((p) => ({ ...p, bgColor: p.bgColor === 'transparent' ? 'original' : 'transparent' }))}
                className={`py-2 px-3 rounded-lg border text-xs font-semibold flex items-center justify-center gap-2 transition-all shadow-sm ${
                  crop.bgColor === 'transparent'
                    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50 shadow-emerald-950/40 ring-1 ring-emerald-500/40'
                    : 'bg-zinc-900 hover:bg-zinc-850 text-zinc-200 border-zinc-700 hover:border-zinc-600'
                }`}
              >
                <Scissors className={`w-3.5 h-3.5 ${crop.bgColor === 'transparent' ? 'text-emerald-400' : 'text-amber-400'}`} />
                <span>{crop.bgColor === 'transparent' ? '✓ BG Removed' : 'Remove Background'}</span>
              </button>

              <button
                type="button"
                onClick={() => setCrop((p) => ({ ...p, bgColor: '#FFFFFF' }))}
                className={`py-2 px-3 rounded-lg border text-xs font-semibold flex items-center justify-center gap-2 transition-all shadow-sm ${
                  crop.bgColor === '#FFFFFF'
                    ? 'bg-amber-400 text-zinc-950 border-amber-400 shadow-amber-950/40 ring-1 ring-amber-300'
                    : 'bg-zinc-900 hover:bg-zinc-850 text-zinc-200 border-zinc-700 hover:border-zinc-600'
                }`}
                title="Official Passport White Background"
              >
                <span className="w-3 h-3 rounded-full bg-white border border-zinc-400 shadow-xs inline-block" />
                <span>White (Standard)</span>
              </button>
            </div>

            {/* Background Style Options Palette */}
            <div className="grid grid-cols-5 gap-1.5 pt-1">
              <button
                type="button"
                onClick={() => setCrop((p) => ({ ...p, bgColor: 'original' }))}
                className={`py-1.5 px-1 rounded text-center border text-[11px] font-medium transition-colors ${
                  crop.bgColor === 'original'
                    ? 'bg-zinc-800 text-amber-400 border-amber-500/50 font-semibold'
                    : 'bg-zinc-900 text-zinc-400 border-zinc-800 hover:text-zinc-200'
                }`}
                title="Keep original background untouched"
              >
                Original
              </button>

              <button
                type="button"
                onClick={() => setCrop((p) => ({ ...p, bgColor: 'transparent' }))}
                className={`py-1.5 px-1 rounded text-center border text-[11px] font-medium flex items-center justify-center gap-1 transition-colors ${
                  crop.bgColor === 'transparent'
                    ? 'bg-zinc-800 text-emerald-400 border-emerald-500/50 font-semibold'
                    : 'bg-zinc-900 text-zinc-400 border-zinc-800 hover:text-zinc-200'
                }`}
                title="Cutout transparent background"
              >
                <Scissors className="w-2.5 h-2.5 text-emerald-400" />
                <span>Cutout</span>
              </button>

              <button
                type="button"
                onClick={() => setCrop((p) => ({ ...p, bgColor: '#FFFFFF' }))}
                className={`py-1.5 px-1 rounded text-center border text-[11px] font-medium flex items-center justify-center gap-1 transition-colors ${
                  crop.bgColor === '#FFFFFF'
                    ? 'bg-zinc-800 text-amber-400 border-amber-500/50 font-semibold'
                    : 'bg-zinc-900 text-zinc-300 border-zinc-800 hover:text-white'
                }`}
                title="Pure White (Passport standard)"
              >
                <span className="w-2.5 h-2.5 rounded-full bg-white border border-zinc-400 inline-block" />
                <span>White</span>
              </button>

              <button
                type="button"
                onClick={() => setCrop((p) => ({ ...p, bgColor: '#D0E4F7' }))}
                className={`py-1.5 px-1 rounded text-center border text-[11px] font-medium flex items-center justify-center gap-1 transition-colors ${
                  crop.bgColor === '#D0E4F7'
                    ? 'bg-zinc-800 text-sky-400 border-sky-500/50 font-semibold'
                    : 'bg-zinc-900 text-zinc-300 border-zinc-800 hover:text-white'
                }`}
                title="Studio Light Blue"
              >
                <span className="w-2.5 h-2.5 rounded-full bg-[#D0E4F7] inline-block" />
                <span>Blue</span>
              </button>

              <button
                type="button"
                onClick={() => setCrop((p) => ({ ...p, bgColor: '#E2E8F0' }))}
                className={`py-1.5 px-1 rounded text-center border text-[11px] font-medium flex items-center justify-center gap-1 transition-colors ${
                  crop.bgColor === '#E2E8F0'
                    ? 'bg-zinc-800 text-amber-400 border-amber-500/50 font-semibold'
                    : 'bg-zinc-900 text-zinc-300 border-zinc-800 hover:text-white'
                }`}
                title="Neutral Studio Grey"
              >
                <span className="w-2.5 h-2.5 rounded-full bg-[#E2E8F0] inline-block" />
                <span>Grey</span>
              </button>
            </div>

            {/* Custom Color Selector */}
            <div className="flex items-center gap-2 pt-1">
              <label className="text-[11px] text-zinc-400 shrink-0">Custom Tint:</label>
              <div className="flex items-center gap-1.5 flex-1">
                <input
                  type="color"
                  value={crop.bgColor.startsWith('#') ? crop.bgColor : customColorHex}
                  onChange={(e) => {
                    const col = e.target.value;
                    setCustomColorHex(col);
                    setCrop((p) => ({ ...p, bgColor: col }));
                  }}
                  className="w-6 h-6 rounded cursor-pointer border border-zinc-700 bg-transparent p-0"
                  title="Pick custom studio color"
                />
                <input
                  type="text"
                  value={crop.bgColor.startsWith('#') ? crop.bgColor : ''}
                  placeholder="#Hex Color"
                  onChange={(e) => {
                    const col = e.target.value;
                    if (col.startsWith('#') && col.length <= 7) {
                      setCrop((p) => ({ ...p, bgColor: col }));
                    }
                  }}
                  className="w-24 bg-zinc-900 border border-zinc-800 rounded px-1.5 py-0.5 text-[11px] text-zinc-200 font-mono"
                />
              </div>
            </div>

            {/* Advanced Cutout Sensitivity & Feathering Sliders (When BG is active) */}
            {isBgRemoved && (
              <div className="space-y-2 pt-2 border-t border-zinc-800/80 bg-zinc-900/60 p-2.5 rounded-lg">
                <div className="space-y-1">
                  <div className="flex justify-between text-[11px] text-zinc-300">
                    <span>Background Sensitivity (Tolerance)</span>
                    <span className="font-mono tabular-nums text-amber-400 font-semibold">{crop.bgTolerance}</span>
                  </div>
                  <input
                    type="range"
                    min="5"
                    max="80"
                    value={crop.bgTolerance}
                    onChange={(e) => setCrop((p) => ({ ...p, bgTolerance: parseInt(e.target.value, 10) }))}
                    className="w-full accent-amber-400 cursor-pointer"
                  />
                </div>

                <div className="space-y-1">
                  <div className="flex justify-between text-[11px] text-zinc-300">
                    <span>Edge Softness (Feather)</span>
                    <span className="font-mono tabular-nums text-sky-400 font-semibold">{crop.bgFeather}px</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="10"
                    value={crop.bgFeather}
                    onChange={(e) => setCrop((p) => ({ ...p, bgFeather: parseInt(e.target.value, 10) }))}
                    className="w-full accent-sky-400 cursor-pointer"
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

/**
 * Draws Indian Passport guidelines (crown, eye line, chin line, 70-80% height bracket)
 */
function drawPassportGuidelines(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number
) {
  ctx.save();

  // Outer boundary
  ctx.strokeStyle = 'rgba(245, 158, 11, 0.4)';
  ctx.lineWidth = 1;

  // Vertical center line
  ctx.beginPath();
  ctx.setLineDash([4, 4]);
  ctx.moveTo(w / 2, 0);
  ctx.lineTo(w / 2, h);
  ctx.stroke();

  // Head area oval guide:
  // Head occupies 70% to 80% of photo height in Indian passport specs
  const headTop = h * 0.13; // Crown level
  const chinBottom = h * 0.85; // Chin level
  const headHeight = chinBottom - headTop;
  const eyeLevel = headTop + headHeight * 0.42;

  // Crown guideline (Top of head)
  ctx.strokeStyle = '#F59E0B'; // Amber
  ctx.setLineDash([3, 3]);
  ctx.beginPath();
  ctx.moveTo(w * 0.15, headTop);
  ctx.lineTo(w * 0.85, headTop);
  ctx.stroke();

  // Eye level guideline
  ctx.strokeStyle = '#38BDF8'; // Light sky blue
  ctx.beginPath();
  ctx.moveTo(w * 0.2, eyeLevel);
  ctx.lineTo(w * 0.8, eyeLevel);
  ctx.stroke();

  // Chin guideline
  ctx.strokeStyle = '#F59E0B';
  ctx.beginPath();
  ctx.moveTo(w * 0.15, chinBottom);
  ctx.lineTo(w * 0.85, chinBottom);
  ctx.stroke();

  // Head Oval Contour
  ctx.strokeStyle = 'rgba(245, 158, 11, 0.6)';
  ctx.setLineDash([4, 4]);
  ctx.beginPath();
  ctx.ellipse(w / 2, headTop + headHeight / 2, w * 0.32, headHeight / 2, 0, 0, Math.PI * 2);
  ctx.stroke();

  // Guide Labels
  ctx.fillStyle = '#F59E0B';
  ctx.font = '9px "JetBrains Mono", monospace';
  ctx.textAlign = 'right';
  ctx.fillText('Crown (Top)', w - 6, headTop - 3);

  ctx.fillStyle = '#38BDF8';
  ctx.fillText('Eye Level', w - 6, eyeLevel - 3);

  ctx.fillStyle = '#F59E0B';
  ctx.fillText('Chin', w - 6, chinBottom + 10);

  ctx.restore();
}

/**
 * Fast client-side backdrop removal / cutout simulation on preview canvas
 */
function applyQuickBgCutout(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  targetColor: string,
  tolerance: number,
  feather: number = 2
) {
  const imgData = ctx.getImageData(0, 0, w, h);
  const data = imgData.data;

  // Sample top corners and top edge
  const sampleIndices = [
    0,
    Math.min(data.length - 4, Math.floor(w * 0.05) * 4),
    Math.min(data.length - 4, Math.floor(w * 0.95) * 4),
    Math.min(data.length - 4, (w - 1) * 4),
    Math.min(data.length - 4, (Math.floor(h * 0.1) * w + Math.floor(w * 0.02)) * 4),
    Math.min(data.length - 4, (Math.floor(h * 0.1) * w + Math.floor(w * 0.98)) * 4),
  ];

  let bgR = 0, bgG = 0, bgB = 0;
  sampleIndices.forEach((idx) => {
    bgR += data[idx];
    bgG += data[idx + 1];
    bgB += data[idx + 2];
  });
  bgR /= sampleIndices.length;
  bgG /= sampleIndices.length;
  bgB /= sampleIndices.length;

  const isTransparent = targetColor === 'transparent';
  let targetR = 255, targetG = 255, targetB = 255;

  if (!isTransparent) {
    const hex = targetColor.startsWith('#') ? targetColor : '#FFFFFF';
    if (hex.length >= 7) {
      targetR = parseInt(hex.slice(1, 3), 16) || 255;
      targetG = parseInt(hex.slice(3, 5), 16) || 255;
      targetB = parseInt(hex.slice(5, 7), 16) || 255;
    }
  }

  const tolSq = tolerance * tolerance * 3;
  const featherSq = Math.max(1, (tolerance + feather * 3) ** 2 * 3);

  const centerCenterX = w / 2;
  const centerCenterY = h * 0.45;
  const headRadiusX = w * 0.22;
  const headRadiusY = h * 0.25;

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];

      const distSq = (r - bgR) ** 2 + (g - bgG) ** 2 + (b - bgB) ** 2;

      // Face core preservation
      const dx = (x - centerCenterX) / headRadiusX;
      const dy = (y - centerCenterY) / headRadiusY;
      const inFaceCore = (dx * dx + dy * dy) < 0.65;

      if (distSq < tolSq && !inFaceCore) {
        if (isTransparent) {
          data[i + 3] = 0;
        } else {
          data[i] = targetR;
          data[i + 1] = targetG;
          data[i + 2] = targetB;
          data[i + 3] = 255;
        }
      } else if (distSq < featherSq && !inFaceCore) {
        const blend = (Math.sqrt(distSq) - tolerance * Math.sqrt(3)) / ((feather * 3 + 1) * Math.sqrt(3));
        const clampedBlend = Math.max(0, Math.min(1, blend));

        if (isTransparent) {
          data[i + 3] = Math.round(255 * clampedBlend);
        } else {
          data[i] = Math.round(targetR * (1 - clampedBlend) + r * clampedBlend);
          data[i + 1] = Math.round(targetG * (1 - clampedBlend) + g * clampedBlend);
          data[i + 2] = Math.round(targetB * (1 - clampedBlend) + b * clampedBlend);
        }
      }
    }
  }

  ctx.putImageData(imgData, 0, 0);
}
