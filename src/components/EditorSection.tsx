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
  Maximize2
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
  const [detectedFace, setDetectedFace] = useState<FaceDetectionBox | null>(null);
  const [isDetectingFace, setIsDetectingFace] = useState(false);

  const photoWidthMm = selectedPreset.id === 'custom' ? customWidthMm : selectedPreset.widthMm;
  const photoHeightMm = selectedPreset.id === 'custom' ? customHeightMm : selectedPreset.heightMm;
  const aspect = photoWidthMm / photoHeightMm;

  // Draw photo onto preview canvas whenever state changes
  const redraw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !image) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const w = canvas.width;
    const h = canvas.height;

    ctx.clearRect(0, 0, w, h);

    // Fill background
    ctx.fillStyle = crop.bgColor !== 'original' ? crop.bgColor : '#FFFFFF';
    ctx.fillRect(0, 0, w, h);

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

    const scaleRatio = h / Math.min(image.naturalWidth, image.naturalHeight);
    const scaledPanX = crop.panX * scaleRatio * crop.zoom;
    const scaledPanY = crop.panY * scaleRatio * crop.zoom;

    ctx.drawImage(
      image,
      -drawW / 2 + scaledPanX,
      -drawH / 2 + scaledPanY,
      drawW,
      drawH
    );
    ctx.restore();

    // If background replacement is active, apply quick visual simulation
    if (crop.bgColor !== 'original') {
      applyQuickBgSimulation(ctx, w, h, crop.bgColor, crop.bgTolerance);
    }

    // Draw Indian Passport Guideline Overlay
    if (showGuides) {
      drawPassportGuidelines(ctx, w, h, selectedPreset);
    }
  }, [image, crop, aspect, showGuides, selectedPreset]);

  useEffect(() => {
    redraw();
  }, [redraw]);

  // Handle Drag to Pan
  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    setIsDragging(true);
    setDragStart({ x: e.clientX, y: e.clientY });
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDragging || !image || !canvasRef.current) return;
    const dx = e.clientX - dragStart.x;
    const dy = e.clientY - dragStart.y;
    setDragStart({ x: e.clientX, y: e.clientY });

    // Convert mouse movement to unscaled image space
    const canvasH = canvasRef.current.height;
    const scaleRatio = canvasH / Math.min(image.naturalWidth, image.naturalHeight);
    const panFactor = 1 / (scaleRatio * crop.zoom);

    setCrop((prev) => ({
      ...prev,
      panX: prev.panX + dx * panFactor,
      panY: prev.panY + dy * panFactor,
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

  // Auto-Center Face using client-side facial landmark geometry
  const handleAutoCenterFace = () => {
    if (!image) return;
    setIsDetectingFace(true);
    setTimeout(() => {
      try {
        const result = detectFaceAndComputeCrop(image, photoWidthMm, photoHeightMm);
        setDetectedFace(result.face);
        setCrop((prev) => ({
          ...prev,
          zoom: result.recommendedCrop.zoom,
          panX: result.recommendedCrop.panX,
          panY: result.recommendedCrop.panY,
          rotation: 0,
        }));
      } catch (err) {
        console.error('Face auto-detect error:', err);
      } finally {
        setIsDetectingFace(false);
      }
    }, 50);
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
    <div className="bg-neutral-900/80 border border-neutral-800 rounded-xl p-4 lg:p-5 flex flex-col gap-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <h2 className="text-sm font-semibold text-neutral-200">2. Passport Crop Editor</h2>
          <p className="text-xs text-neutral-400 mt-0.5">
            Click & drag to position face. Align with the official 70–80% guidelines.
          </p>
        </div>

        <div className="flex items-center gap-1.5 self-start sm:self-auto">
          <button
            type="button"
            onClick={() => setShowGuides(!showGuides)}
            className={`inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-md border transition-colors ${
              showGuides
                ? 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                : 'bg-neutral-800/80 text-neutral-400 border-neutral-700/60 hover:text-neutral-200'
            }`}
          >
            <Eye className="w-3.5 h-3.5" />
            <span>Guide Overlay</span>
          </button>

          <button
            type="button"
            onClick={handleAutoCenterFace}
            disabled={!image || isDetectingFace}
            className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-medium text-amber-300 bg-neutral-800 hover:bg-neutral-750 border border-neutral-700 rounded-md transition-colors disabled:opacity-40"
            title="Auto-detect face and align to 75% height"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>{isDetectingFace ? 'Detecting...' : 'Auto-Center Face'}</span>
          </button>

          <button
            type="button"
            onClick={handleResetCrop}
            disabled={!image}
            className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-neutral-400 hover:text-neutral-200 bg-neutral-800/80 hover:bg-neutral-800 border border-neutral-700/60 rounded-md transition-colors disabled:opacity-40"
            title="Reset zoom, pan, and rotation"
          >
            <ResetIcon className="w-3.5 h-3.5" />
            <span>Reset</span>
          </button>
        </div>
      </div>

      {/* Main Canvas Viewport */}
      <div className="flex flex-col xl:flex-row items-center justify-center gap-6">
        <div className="relative flex flex-col items-center">
          {/* Passport Aspect Ratio Frame */}
          <div
            className="relative border-2 border-neutral-700 rounded-md shadow-2xl overflow-hidden cursor-grab active:cursor-grabbing bg-neutral-950"
            style={{
              width: aspect >= 1 ? '320px' : `${Math.round(380 * aspect)}px`,
              height: aspect >= 1 ? `${Math.round(320 / aspect)}px` : '380px',
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
                onWheel={handleWheel}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center p-6 text-center text-neutral-500">
                <Paintbrush className="w-8 h-8 mb-2 opacity-30" />
                <p className="text-xs">Upload a photograph to start editing</p>
              </div>
            )}

            {/* Dimension Badge in corner */}
            <div className="absolute bottom-2 right-2 bg-neutral-950/80 border border-neutral-800 backdrop-blur px-2 py-0.5 rounded text-[10px] font-mono text-neutral-300">
              {photoWidthMm} × {photoHeightMm} mm
            </div>
          </div>

          <div className="text-[11px] text-neutral-500 mt-2 text-center">
            Click & drag to pan · Scroll to zoom
          </div>
        </div>

        {/* Sliders & Fine Tuning Controls */}
        <div className="w-full xl:w-72 flex flex-col gap-3.5 text-xs">
          {/* Zoom Slider */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-neutral-300">
              <span className="flex items-center gap-1.5">
                <ZoomIn className="w-3.5 h-3.5 text-neutral-400" />
                Zoom
              </span>
              <span className="font-mono text-neutral-400 tabular-nums">{crop.zoom}x</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setCrop((p) => ({ ...p, zoom: Math.max(0.5, Number((p.zoom - 0.1).toFixed(2))) }))}
                className="p-1 rounded bg-neutral-800 text-neutral-300 hover:bg-neutral-700"
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
                className="p-1 rounded bg-neutral-800 text-neutral-300 hover:bg-neutral-700"
              >
                <ZoomIn className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Rotation Slider & Step Buttons */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-neutral-300">
              <span className="flex items-center gap-1.5">
                <RotateCw className="w-3.5 h-3.5 text-neutral-400" />
                Rotation
              </span>
              <span className="font-mono text-neutral-400 tabular-nums">{crop.rotation}°</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => rotateBy(-90)}
                className="p-1.5 rounded bg-neutral-800 text-neutral-300 hover:bg-neutral-700"
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
                className="p-1.5 rounded bg-neutral-800 text-neutral-300 hover:bg-neutral-700"
                title="Rotate 90° Clockwise"
              >
                <RotateCw className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Background Replacement Tools */}
          <div className="space-y-2 pt-2 border-t border-neutral-800">
            <div className="flex items-center justify-between text-neutral-300">
              <span className="font-medium">Studio Background</span>
              <span className="text-[11px] text-neutral-500">
                {crop.bgColor === 'original' ? 'Original' : 'Color Replaced'}
              </span>
            </div>

            <div className="grid grid-cols-4 gap-1.5">
              <button
                type="button"
                onClick={() => setCrop((p) => ({ ...p, bgColor: 'original' }))}
                className={`py-1.5 px-2 rounded text-center border text-[11px] font-medium transition-colors ${
                  crop.bgColor === 'original'
                    ? 'bg-neutral-800 text-amber-400 border-amber-500/50'
                    : 'bg-neutral-950/60 text-neutral-400 border-neutral-800 hover:text-neutral-200'
                }`}
              >
                Original
              </button>

              <button
                type="button"
                onClick={() => setCrop((p) => ({ ...p, bgColor: '#FFFFFF' }))}
                className={`py-1.5 px-2 rounded text-center border text-[11px] font-medium flex items-center justify-center gap-1 transition-colors ${
                  crop.bgColor === '#FFFFFF'
                    ? 'bg-neutral-800 text-amber-400 border-amber-500/50'
                    : 'bg-neutral-950/60 text-neutral-300 border-neutral-800 hover:text-white'
                }`}
                title="Indian Passport Standard White Background"
              >
                <span className="w-2.5 h-2.5 rounded-full bg-white border border-neutral-300 inline-block" />
                White
              </button>

              <button
                type="button"
                onClick={() => setCrop((p) => ({ ...p, bgColor: '#D0E4F7' }))}
                className={`py-1.5 px-2 rounded text-center border text-[11px] font-medium flex items-center justify-center gap-1 transition-colors ${
                  crop.bgColor === '#D0E4F7'
                    ? 'bg-neutral-800 text-amber-400 border-amber-500/50'
                    : 'bg-neutral-950/60 text-neutral-300 border-neutral-800 hover:text-white'
                }`}
                title="Studio Light Blue Background"
              >
                <span className="w-2.5 h-2.5 rounded-full bg-[#D0E4F7] border border-blue-300 inline-block" />
                Blue
              </button>

              <button
                type="button"
                onClick={() => setCrop((p) => ({ ...p, bgColor: '#E2E8F0' }))}
                className={`py-1.5 px-2 rounded text-center border text-[11px] font-medium flex items-center justify-center gap-1 transition-colors ${
                  crop.bgColor === '#E2E8F0'
                    ? 'bg-neutral-800 text-amber-400 border-amber-500/50'
                    : 'bg-neutral-950/60 text-neutral-300 border-neutral-800 hover:text-white'
                }`}
                title="Neutral Studio Grey Background"
              >
                <span className="w-2.5 h-2.5 rounded-full bg-[#E2E8F0] border border-neutral-400 inline-block" />
                Grey
              </button>
            </div>

            {crop.bgColor !== 'original' && (
              <div className="space-y-1 pt-1">
                <div className="flex justify-between text-[11px] text-neutral-400">
                  <span>Chroma Sensitivity</span>
                  <span className="font-mono tabular-nums">{crop.bgTolerance}</span>
                </div>
                <input
                  type="range"
                  min="5"
                  max="60"
                  value={crop.bgTolerance}
                  onChange={(e) => setCrop((p) => ({ ...p, bgTolerance: parseInt(e.target.value, 10) }))}
                  className="w-full accent-amber-400 cursor-pointer"
                />
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
  h: number,
  preset: PhotoPreset
) {
  ctx.save();

  // Outer semi-transparent boundary
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
  const headTop = h * 0.12; // Crown level
  const chinBottom = h * 0.84; // Chin level
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

  // Guide Labels on right
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
 * Fast client-side backdrop replacement simulation on preview canvas
 */
function applyQuickBgSimulation(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  targetHex: string,
  tolerance: number
) {
  const imgData = ctx.getImageData(0, 0, w, h);
  const data = imgData.data;

  const bgR = data[0];
  const bgG = data[1];
  const bgB = data[2];

  const tR = parseInt(targetHex.slice(1, 3), 16);
  const tG = parseInt(targetHex.slice(3, 5), 16);
  const tB = parseInt(targetHex.slice(5, 7), 16);

  const tolSq = tolerance * tolerance * 3;

  for (let i = 0; i < data.length; i += 4) {
    const distSq =
      (data[i] - bgR) ** 2 +
      (data[i + 1] - bgG) ** 2 +
      (data[i + 2] - bgB) ** 2;

    if (distSq < tolSq) {
      const blend = Math.min(1, Math.sqrt(distSq / tolSq));
      data[i] = Math.round(tR * (1 - blend) + data[i] * blend);
      data[i + 1] = Math.round(tG * (1 - blend) + data[i + 1] * blend);
      data[i + 2] = Math.round(tB * (1 - blend) + data[i + 2] * blend);
    }
  }

  ctx.putImageData(imgData, 0, 0);
}
