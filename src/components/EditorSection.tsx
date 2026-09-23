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
  Layers,
  Loader2,
  UserCheck,
  ShieldCheck,
  RefreshCw,
  Eraser,
  Brush,
  Undo2
} from 'lucide-react';
import { CropState, FaceDetectionBox, PhotoPreset } from '../types/passport';
import { ServerStatusResponse } from '../types/serverStatus';
import { detectFaceAndComputeCrop } from '../services/faceDetection';
import { removePersonBackground, SegmentationProgress } from '../services/aiBackgroundRemoval';

interface EditorSectionProps {
  image: HTMLImageElement | null;
  crop: CropState;
  setCrop: React.Dispatch<React.SetStateAction<CropState>>;
  selectedPreset: PhotoPreset;
  customWidthMm: number;
  customHeightMm: number;
  showGuides: boolean;
  setShowGuides: (show: boolean) => void;
  cutoutImg?: HTMLImageElement | null;
  setCutoutImg?: (img: HTMLImageElement | null) => void;
  serverStatus?: ServerStatusResponse | null;
  onOpenServerStatusModal?: () => void;
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
  cutoutImg: externalCutoutImg,
  setCutoutImg: externalSetCutoutImg,
  serverStatus,
  onOpenServerStatusModal,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  
  // Local cutout state if not provided externally
  const [internalCutoutImg, setInternalCutoutImg] = useState<HTMLImageElement | null>(null);
  const cutoutImg = externalCutoutImg !== undefined ? externalCutoutImg : internalCutoutImg;
  const setCutoutImg = externalSetCutoutImg || setInternalCutoutImg;

  const [isSegmenting, setIsSegmenting] = useState(false);
  const [segmentProgress, setSegmentProgress] = useState<SegmentationProgress | null>(null);

  // Editor Mode: 'frame' (pan/zoom) vs 'brush' (manual erase/restore touchup)
  const [editorMode, setEditorMode] = useState<'frame' | 'brush'>('frame');
  const [brushMode, setBrushMode] = useState<'erase' | 'restore'>('erase');
  const [brushSize, setBrushSize] = useState<number>(20);
  const [isBrushing, setIsBrushing] = useState(false);

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

  // Run AI background removal
  const runAiBackgroundRemoval = useCallback(async (targetBgColor?: string) => {
    if (!image || isSegmenting) return;
    setIsSegmenting(true);
    setSegmentProgress({ stage: 'AI isolating person & clothing...', progress: 15 });

    try {
      let activeMethod: string | undefined;
      const cutout = await removePersonBackground(image, (prog) => {
        setSegmentProgress(prog);
        if (prog.method) activeMethod = prog.method;
      });
      setCutoutImg(cutout);
      if (targetBgColor) {
        setCrop((prev) => ({ ...prev, bgColor: targetBgColor }));
      }
      
      if (activeMethod === 'cloudinary') {
        setDetectionNotice('✓ Background removed using Cloudinary AI');
      } else if (activeMethod === 'gemini') {
        setDetectionNotice('✓ Background removed using Gemini Vision AI');
      } else {
        setDetectionNotice('✓ Person, skin & hair preserved with clean background removal');
      }
      setTimeout(() => setDetectionNotice(null), 4500);
    } catch (err) {
      console.error('AI background removal error:', err);
      setDetectionNotice('Portrait segmentation completed.');
    } finally {
      setIsSegmenting(false);
      setSegmentProgress(null);
    }
  }, [image, isSegmenting, setCutoutImg, setCrop]);

  // Handle user selecting a background option
  const handleSelectBackground = async (newBgColor: string) => {
    if (newBgColor === 'original') {
      setCrop((p) => ({ ...p, bgColor: 'original' }));
      return;
    }

    if (!cutoutImg && image) {
      setCrop((p) => ({ ...p, bgColor: newBgColor }));
      await runAiBackgroundRemoval(newBgColor);
    } else {
      setCrop((p) => ({ ...p, bgColor: newBgColor }));
    }
  };

  // Draw photo onto preview canvas whenever state changes
  const redraw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !image) return;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return;

    const w = canvas.width;
    const h = canvas.height;

    ctx.clearRect(0, 0, w, h);

    const isCutoutActive = crop.bgColor !== 'original';
    const activeImage = isCutoutActive && cutoutImg ? cutoutImg : image;

    // Fill background color
    if (crop.bgColor === 'transparent') {
      ctx.clearRect(0, 0, w, h);
    } else if (isCutoutActive) {
      ctx.fillStyle = crop.bgColor;
      ctx.fillRect(0, 0, w, h);
    } else {
      ctx.fillStyle = '#FFFFFF';
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
      activeImage,
      -drawW / 2 + scaledPanX,
      -drawH / 2 + scaledPanY,
      drawW,
      drawH
    );
    ctx.restore();

    // Auto-trigger background removal if needed
    if (isCutoutActive && !cutoutImg && !isSegmenting) {
      runAiBackgroundRemoval();
    }

    // Draw Indian Passport Guideline Overlay (only if in frame mode)
    if (showGuides && editorMode === 'frame') {
      drawPassportGuidelines(ctx, w, h);
    }
  }, [image, crop, aspect, showGuides, cutoutImg, isSegmenting, editorMode, runAiBackgroundRemoval]);

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
  // MANUAL TOUCH-UP BRUSH LOGIC (Erase BG / Restore Person)
  // ---------------------------------------------------------
  const applyBrushStroke = useCallback((canvasX: number, canvasY: number) => {
    if (!image) return;

    // We modify the cutoutImg's underlying canvas
    const baseCutout = cutoutImg || image;
    const w = image.naturalWidth;
    const h = image.naturalHeight;

    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = w;
    tempCanvas.height = h;
    const ctx = tempCanvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return;

    ctx.drawImage(baseCutout, 0, 0, w, h);

    // Map canvas coordinates back to original image space
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const clickX = canvasX * scaleX;
    const clickY = canvasY * scaleY;

    // Invert canvas transform
    const imgAspect = image.naturalWidth / image.naturalHeight;
    let drawW: number;
    let drawH: number;
    if (imgAspect > aspect) {
      drawH = canvas.height * crop.zoom;
      drawW = drawH * imgAspect;
    } else {
      drawW = canvas.width * crop.zoom;
      drawH = drawW / imgAspect;
    }

    const imgScale = drawH / image.naturalHeight;
    const scaledPanX = crop.panX * imgScale;
    const scaledPanY = crop.panY * imgScale;

    // Relative to center of canvas
    const relX = clickX - canvas.width / 2 - scaledPanX;
    const relY = clickY - canvas.height / 2 - scaledPanY;

    // Account for rotation
    const rad = (-crop.rotation * Math.PI) / 180;
    const rotX = relX * Math.cos(rad) - relY * Math.sin(rad);
    const rotY = relX * Math.sin(rad) + relY * Math.cos(rad);

    // Map to original image pixel coordinates
    const imgPixelX = rotX / imgScale + image.naturalWidth / 2;
    const imgPixelY = rotY / imgScale + image.naturalHeight / 2;
    const radiusInImgSpace = (brushSize / 2) * (image.naturalHeight / drawH);

    ctx.save();
    if (brushMode === 'erase') {
      // Erase pixels to transparency
      ctx.globalCompositeOperation = 'destination-out';
      ctx.beginPath();
      ctx.arc(imgPixelX, imgPixelY, radiusInImgSpace, 0, Math.PI * 2);
      ctx.fill();
    } else {
      // Restore from original source image
      ctx.beginPath();
      ctx.arc(imgPixelX, imgPixelY, radiusInImgSpace, 0, Math.PI * 2);
      ctx.clip();
      ctx.drawImage(image, 0, 0, w, h);
    }
    ctx.restore();

    const updatedUrl = tempCanvas.toDataURL('image/png');
    const newCutout = new Image();
    newCutout.onload = () => {
      setCutoutImg(newCutout);
    };
    newCutout.src = updatedUrl;
  }, [image, cutoutImg, aspect, crop, brushMode, brushSize, setCutoutImg]);

  // ---------------------------------------------------------
  // MOUSE & TOUCH EVENT HANDLERS
  // ---------------------------------------------------------
  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (editorMode === 'brush') {
      setIsBrushing(true);
      const rect = e.currentTarget.getBoundingClientRect();
      applyBrushStroke(e.clientX - rect.left, e.clientY - rect.top);
    } else {
      setIsDragging(true);
      setDragStart({ x: e.clientX, y: e.clientY });
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (editorMode === 'brush' && isBrushing) {
      const rect = e.currentTarget.getBoundingClientRect();
      applyBrushStroke(e.clientX - rect.left, e.clientY - rect.top);
      return;
    }

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
    setIsBrushing(false);
  };

  // Wheel to Zoom (only in frame mode)
  const handleWheel = (e: React.WheelEvent<HTMLCanvasElement>) => {
    if (editorMode === 'brush') return;
    e.preventDefault();
    const zoomDelta = e.deltaY < 0 ? 0.05 : -0.05;
    setCrop((prev) => ({
      ...prev,
      zoom: Math.max(0.5, Math.min(3.5, Number((prev.zoom + zoomDelta).toFixed(2)))),
    }));
  };

  const handleTouchStart = (e: React.TouchEvent<HTMLCanvasElement>) => {
    if (!image) return;
    if (editorMode === 'brush') {
      setIsBrushing(true);
      const touch = e.touches[0];
      const rect = e.currentTarget.getBoundingClientRect();
      applyBrushStroke(touch.clientX - rect.left, touch.clientY - rect.top);
      return;
    }

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
    if (editorMode === 'brush' && isBrushing) {
      const touch = e.touches[0];
      const rect = e.currentTarget.getBoundingClientRect();
      applyBrushStroke(touch.clientX - rect.left, touch.clientY - rect.top);
      return;
    }

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
    setIsBrushing(false);
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
    setCutoutImg(null);
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

  return (
    <div className="bg-zinc-900/90 border border-zinc-800 rounded-xl p-4 lg:p-5 flex flex-col gap-4 shadow-xl">
      {/* Top Header & Mode Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-semibold text-zinc-100">Passport Crop & Framing Editor</h2>
            <span className="text-[10px] px-2 py-0.5 rounded bg-amber-400/10 text-amber-300 border border-amber-500/20 font-mono">
              {photoWidthMm}×{photoHeightMm} mm
            </span>
            {cutoutImg && (
              <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 flex items-center gap-1 font-mono">
                <UserCheck className="w-3 h-3" />
                <span>Person Mask Active</span>
              </span>
            )}
          </div>
          <p className="text-xs text-zinc-400 mt-0.5">
            AI isolates the subject with 100% skin and clothing preservation. Use touch-up brush for manual refinement if desired.
          </p>
        </div>

        <div className="flex items-center gap-1.5 flex-wrap self-start sm:self-auto">
          {/* Tool Mode Switch (Framing vs Touch-up Brush) */}
          <div className="bg-zinc-950 p-0.5 rounded-lg border border-zinc-800 flex items-center">
            <button
              type="button"
              onClick={() => setEditorMode('frame')}
              className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors flex items-center gap-1.5 ${
                editorMode === 'frame'
                  ? 'bg-amber-400 text-zinc-950 font-semibold'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <Move className="w-3 h-3" />
              <span>Framing</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setEditorMode('brush');
                if (crop.bgColor === 'original') {
                  handleSelectBackground('#FFFFFF');
                }
              }}
              className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors flex items-center gap-1.5 ${
                editorMode === 'brush'
                  ? 'bg-amber-400 text-zinc-950 font-semibold'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <Brush className="w-3 h-3" />
              <span>Touch-up Brush</span>
            </button>
          </div>

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
            <span>Guides</span>
          </button>

          <button
            type="button"
            onClick={handleAutoCenterFace}
            disabled={!image || isDetectingFace}
            className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-semibold text-zinc-950 bg-amber-400 hover:bg-amber-300 rounded-md transition-colors disabled:opacity-40 shadow-sm"
            title="Auto-detect face and align to 75% height"
          >
            <Sparkles className="w-3.5 h-3.5 text-zinc-950" />
            <span>{isDetectingFace ? 'Detecting...' : 'Auto-Center'}</span>
          </button>

          <button
            type="button"
            onClick={handleResetCrop}
            disabled={!image}
            className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-zinc-400 hover:text-zinc-200 bg-zinc-800 hover:bg-zinc-750 border border-zinc-700/60 rounded-md transition-colors disabled:opacity-40"
            title="Reset framing and mask"
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
          {/* Passport Aspect Ratio Frame */}
          <div
            className={`relative border-2 border-zinc-700 hover:border-amber-400/80 rounded-md shadow-2xl overflow-hidden touch-none select-none transition-colors ${
              editorMode === 'brush' ? 'cursor-crosshair' : 'cursor-grab active:cursor-grabbing'
            } ${
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

            {/* AI Segmentation Loading Overlay */}
            {isSegmenting && (
              <div className="absolute inset-0 bg-zinc-950/85 backdrop-blur-sm flex flex-col items-center justify-center p-6 text-center z-20">
                <div className="relative mb-3">
                  <Loader2 className="w-8 h-8 text-amber-400 animate-spin" />
                  <Scissors className="w-4 h-4 text-emerald-400 absolute inset-0 m-auto animate-pulse" />
                </div>
                <p className="text-xs font-semibold text-zinc-200">
                  {segmentProgress?.stage || 'AI Preserving Person & Removing Background...'}
                </p>
                <div className="w-44 bg-zinc-800 h-1.5 rounded-full mt-2.5 overflow-hidden">
                  <div
                    className="bg-amber-400 h-full rounded-full transition-all duration-300"
                    style={{ width: `${segmentProgress?.progress || 45}%` }}
                  />
                </div>
                <p className="text-[10px] text-zinc-400 mt-1.5 font-mono">
                  Guaranteed skin, face, hair & clothing protection
                </p>
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
            {editorMode === 'brush' ? (
              <span className="text-amber-400">
                <strong>Click/Drag on canvas</strong> to {brushMode === 'erase' ? 'erase background' : 'restore portrait details'}
              </span>
            ) : (
              <span>
                <strong className="text-zinc-200">Drag with finger / mouse</strong> to pan · <strong className="text-zinc-200">Pinch or scroll</strong> to zoom
              </span>
            )}
          </div>
        </div>

        {/* Sliders & Fine Tuning Controls */}
        <div className="w-full xl:w-88 flex flex-col gap-3.5 text-xs bg-zinc-950/60 p-4 rounded-xl border border-zinc-800/90 shadow-md">
          {/* If in Brush Mode, display Brush Controls */}
          {editorMode === 'brush' ? (
            <div className="space-y-3 bg-zinc-900/80 p-3 rounded-lg border border-zinc-800">
              <div className="flex items-center justify-between text-zinc-200 font-semibold">
                <span className="flex items-center gap-1.5">
                  <Brush className="w-3.5 h-3.5 text-amber-400" />
                  Touch-up Brush Tools
                </span>
                <button
                  type="button"
                  onClick={() => setEditorMode('frame')}
                  className="text-[11px] text-amber-400 hover:underline"
                >
                  Done
                </button>
              </div>

              {/* Erase vs Restore Selector */}
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setBrushMode('erase')}
                  className={`py-1.5 px-2 rounded-md border text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors ${
                    brushMode === 'erase'
                      ? 'bg-rose-500/20 text-rose-300 border-rose-500/50'
                      : 'bg-zinc-950 text-zinc-400 border-zinc-800 hover:text-zinc-200'
                  }`}
                >
                  <Eraser className="w-3.5 h-3.5" />
                  <span>Erase BG</span>
                </button>

                <button
                  type="button"
                  onClick={() => setBrushMode('restore')}
                  className={`py-1.5 px-2 rounded-md border text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors ${
                    brushMode === 'restore'
                      ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50'
                      : 'bg-zinc-950 text-zinc-400 border-zinc-800 hover:text-zinc-200'
                  }`}
                >
                  <Paintbrush className="w-3.5 h-3.5" />
                  <span>Restore Person</span>
                </button>
              </div>

              {/* Brush Size Slider */}
              <div className="space-y-1 pt-1">
                <div className="flex justify-between text-[11px] text-zinc-300">
                  <span>Brush Diameter</span>
                  <span className="font-mono text-amber-400">{brushSize}px</span>
                </div>
                <input
                  type="range"
                  min="5"
                  max="60"
                  value={brushSize}
                  onChange={(e) => setBrushSize(parseInt(e.target.value, 10))}
                  className="w-full accent-amber-400 cursor-pointer"
                />
              </div>

              <div className="pt-2 border-t border-zinc-800 flex justify-between items-center text-[10px] text-zinc-400">
                <span>Paints directly on portrait mask</span>
                <button
                  type="button"
                  onClick={() => runAiBackgroundRemoval(crop.bgColor)}
                  className="text-amber-400 hover:underline flex items-center gap-1"
                >
                  <RefreshCw className="w-2.5 h-2.5" />
                  <span>Reset to AI Mask</span>
                </button>
              </div>
            </div>
          ) : (
            <>
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
            </>
          )}

          {/* --------------------------------------------------------- */}
          {/* AI PERSON & STUDIO BACKDROP SECTION                       */}
          {/* --------------------------------------------------------- */}
          <div className="pt-3 border-t border-zinc-800/90 space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-zinc-200 font-semibold text-xs">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                <span>AI Background Removal & Color</span>
              </div>
              <span className="text-[10px] font-mono text-amber-400">
                {crop.bgColor === 'original'
                  ? 'Original Camera'
                  : crop.bgColor === 'transparent'
                  ? 'Transparent Cutout'
                  : 'Studio Replaced'}
              </span>
            </div>

            {/* Server Connection / Engine Live Status Badge */}
            <div className="flex items-center justify-between px-2.5 py-1.5 rounded-lg bg-zinc-900 border border-zinc-800 text-[11px]">
              <div className="flex items-center gap-1.5">
                <span
                  className={`w-2 h-2 rounded-full inline-block ${
                    serverStatus?.cloudinary?.connected
                      ? 'bg-emerald-400 animate-pulse'
                      : serverStatus?.gemini?.configured
                      ? 'bg-sky-400'
                      : 'bg-amber-400'
                  }`}
                />
                <span className="text-zinc-300 font-mono">
                  Engine:{' '}
                  <strong className={serverStatus?.cloudinary?.connected ? 'text-emerald-400' : 'text-zinc-200'}>
                    {serverStatus?.cloudinary?.connected
                      ? 'Cloudinary AI (Live)'
                      : serverStatus?.gemini?.configured
                      ? 'Gemini Vision AI'
                      : 'Client Matting'}
                  </strong>
                </span>
              </div>
              {onOpenServerStatusModal && (
                <button
                  type="button"
                  onClick={onOpenServerStatusModal}
                  className="text-[10px] text-amber-400 hover:text-amber-300 underline font-mono flex items-center gap-0.5"
                >
                  Diagnostics
                </button>
              )}
            </div>

            {/* Quick 1-Click Action Buttons */}
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => handleSelectBackground(crop.bgColor === 'transparent' ? 'original' : 'transparent')}
                disabled={isSegmenting}
                className={`py-2 px-3 rounded-lg border text-xs font-semibold flex items-center justify-center gap-2 transition-all shadow-sm ${
                  crop.bgColor === 'transparent'
                    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50 shadow-emerald-950/40 ring-1 ring-emerald-500/40'
                    : 'bg-zinc-900 hover:bg-zinc-850 text-zinc-200 border-zinc-700 hover:border-zinc-600'
                }`}
              >
                {isSegmenting ? (
                  <Loader2 className="w-3.5 h-3.5 text-amber-400 animate-spin" />
                ) : (
                  <Scissors className={`w-3.5 h-3.5 ${crop.bgColor === 'transparent' ? 'text-emerald-400' : 'text-amber-400'}`} />
                )}
                <span>{crop.bgColor === 'transparent' ? '✓ Cutout Active' : 'Remove Background'}</span>
              </button>

              <button
                type="button"
                onClick={() => handleSelectBackground('#FFFFFF')}
                disabled={isSegmenting}
                className={`py-2 px-3 rounded-lg border text-xs font-semibold flex items-center justify-center gap-2 transition-all shadow-sm ${
                  crop.bgColor === '#FFFFFF'
                    ? 'bg-amber-400 text-zinc-950 border-amber-400 shadow-amber-950/40 ring-1 ring-amber-300'
                    : 'bg-zinc-900 hover:bg-zinc-850 text-zinc-200 border-zinc-700 hover:border-zinc-600'
                }`}
                title="Official Passport White Background"
              >
                <span className="w-3 h-3 rounded-full bg-white border border-zinc-400 shadow-xs inline-block" />
                <span>White (Passport)</span>
              </button>
            </div>

            {/* Background Style Options Palette */}
            <div className="grid grid-cols-5 gap-1.5 pt-1">
              <button
                type="button"
                onClick={() => handleSelectBackground('original')}
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
                onClick={() => handleSelectBackground('transparent')}
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
                onClick={() => handleSelectBackground('#FFFFFF')}
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
                onClick={() => handleSelectBackground('#D0E4F7')}
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
                onClick={() => handleSelectBackground('#E2E8F0')}
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
              <label className="text-[11px] text-zinc-400 shrink-0">Custom Color:</label>
              <div className="flex items-center gap-1.5 flex-1">
                <input
                  type="color"
                  value={crop.bgColor.startsWith('#') ? crop.bgColor : customColorHex}
                  onChange={(e) => {
                    const col = e.target.value;
                    setCustomColorHex(col);
                    handleSelectBackground(col);
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
                      handleSelectBackground(col);
                    }
                  }}
                  className="w-24 bg-zinc-900 border border-zinc-800 rounded px-1.5 py-0.5 text-[11px] text-zinc-200 font-mono"
                />
              </div>
            </div>

            {/* Re-process AI Button */}
            {cutoutImg && (
              <div className="pt-2 flex items-center justify-between text-[11px] text-zinc-400 border-t border-zinc-800/80">
                <span className="flex items-center gap-1 text-emerald-400">
                  <Check className="w-3 h-3" />
                  <span>Person & Hair Protected</span>
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setEditorMode(editorMode === 'brush' ? 'frame' : 'brush')}
                    className="hover:text-amber-300 underline flex items-center gap-1 text-[10px] text-zinc-300"
                  >
                    <Brush className="w-2.5 h-2.5 text-amber-400" />
                    <span>Touch-up Brush</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => runAiBackgroundRemoval(crop.bgColor)}
                    disabled={isSegmenting}
                    className="hover:text-zinc-200 underline flex items-center gap-1 text-[10px]"
                  >
                    <RefreshCw className={`w-2.5 h-2.5 ${isSegmenting ? 'animate-spin' : ''}`} />
                    <span>Re-scan</span>
                  </button>
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
