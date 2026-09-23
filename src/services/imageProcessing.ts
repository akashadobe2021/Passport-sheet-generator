import { CropState, LayoutConfig, QualityValidation } from '../types/passport';
import { PAPER_SIZES } from '../constants/presets';

/**
 * Calculates effective printing DPI and provides quality verification
 */
export function calculatePrintQuality(
  img: HTMLImageElement,
  crop: CropState,
  photoWidthMm: number,
  photoHeightMm: number,
  targetDpi: number = 300
): QualityValidation {
  const origW = img.naturalWidth;
  const origH = img.naturalHeight;

  // The proportion of the source image captured by the crop window
  // When zoom = 1.0, the crop window maps to the maximum inscribed area with aspect ratio photoWidthMm / photoHeightMm
  const targetAspect = photoWidthMm / photoHeightMm;
  let baseSourceW = origW;
  let baseSourceH = origW / targetAspect;
  if (baseSourceH > origH) {
    baseSourceH = origH;
    baseSourceW = origH * targetAspect;
  }

  // With zoom applied, the crop window captures fewer source pixels (closer zoom = fewer pixels = lower effective DPI)
  const actualSourceW = Math.max(10, baseSourceW / Math.max(0.2, crop.zoom));
  const actualSourceH = Math.max(10, baseSourceH / Math.max(0.2, crop.zoom));

  const widthInches = photoWidthMm / 25.4;
  const heightInches = photoHeightMm / 25.4;
  const dpiX = actualSourceW / widthInches;
  const dpiY = actualSourceH / heightInches;
  const effectiveDpi = Math.round((dpiX + dpiY) / 2);

  let qualityLevel: QualityValidation['qualityLevel'] = 'good';
  let warningMessage: string | undefined;

  if (effectiveDpi < 150) {
    qualityLevel = 'critical';
    warningMessage = `Low Resolution Warning (${effectiveDpi} DPI): Photo will appear visibly blurry or pixelated when printed. Please use a higher-resolution original camera image.`;
  } else if (effectiveDpi < 300) {
    qualityLevel = 'warning';
    warningMessage = `Moderate Resolution (${effectiveDpi} DPI): Below official 300 DPI passport studio standard. May print acceptable on home inkjet printers, but sharp studio prints require 300+ DPI.`;
  } else if (effectiveDpi >= 450) {
    qualityLevel = 'excellent';
  }

  return {
    effectiveDpi,
    targetDpi,
    qualityLevel,
    warningMessage,
    cropPixels: {
      width: Math.round(actualSourceW),
      height: Math.round(actualSourceH),
    },
    originalPixels: {
      width: origW,
      height: origH,
    },
  };
}

/**
 * Renders a single cropped passport photo at target DPI (e.g. 300 or 600 DPI)
 * Handles zoom, pan, rotation, background substitution, and edge feathering.
 */
export function renderSinglePassportPhoto(
  img: HTMLImageElement,
  crop: CropState,
  photoWidthMm: number,
  photoHeightMm: number,
  dpi: number = 300,
  cutoutImg?: HTMLImageElement | null
): HTMLCanvasElement {
  const pixelWidth = Math.round((photoWidthMm / 25.4) * dpi);
  const pixelHeight = Math.round((photoHeightMm / 25.4) * dpi);

  const canvas = document.createElement('canvas');
  canvas.width = pixelWidth;
  canvas.height = pixelHeight;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) return canvas;

  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';

  const isCutoutActive = crop.bgColor !== 'original';
  const activeImage = isCutoutActive && cutoutImg ? cutoutImg : img;

  // Base background fill
  if (crop.bgColor === 'transparent') {
    ctx.clearRect(0, 0, pixelWidth, pixelHeight);
  } else if (isCutoutActive) {
    ctx.fillStyle = crop.bgColor;
    ctx.fillRect(0, 0, pixelWidth, pixelHeight);
  } else {
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, pixelWidth, pixelHeight);
  }

  // Save context state for photo transform
  ctx.save();
  // Move to center of passport frame
  ctx.translate(pixelWidth / 2, pixelHeight / 2);
  // Apply rotation
  ctx.rotate((crop.rotation * Math.PI) / 180);

  // Calculate base draw dimensions based on the original image dimensions
  const aspect = photoWidthMm / photoHeightMm;
  const imgAspect = img.naturalWidth / img.naturalHeight;
  let drawW: number;
  let drawH: number;

  if (imgAspect > aspect) {
    drawH = pixelHeight * crop.zoom;
    drawW = drawH * imgAspect;
  } else {
    drawW = pixelWidth * crop.zoom;
    drawH = drawW / imgAspect;
  }

  // Pan offset scaled to target canvas resolution
  const imgScale = drawH / img.naturalHeight;
  const scaledPanX = crop.panX * imgScale;
  const scaledPanY = crop.panY * imgScale;

  // Draw image centered with offset
  ctx.drawImage(
    activeImage,
    -drawW / 2 + scaledPanX,
    -drawH / 2 + scaledPanY,
    drawW,
    drawH
  );
  ctx.restore();

  // If background replacement is active and cutoutImg wasn't ready yet, apply chromatic fallback
  if (isCutoutActive && !cutoutImg) {
    applyBackgroundReplacement(ctx, pixelWidth, pixelHeight, crop.bgColor, crop.bgTolerance, crop.bgFeather);
  }

  return canvas;
}

/**
 * Replaces or removes non-subject backdrop pixels
 * Supports:
 * - 'transparent' (Clean cutout with alpha channel for PNG / digital upload)
 * - Solid passport studio colors (Pure White, Studio Blue, Light Grey, or custom hex)
 */
export function applyBackgroundReplacement(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  targetColor: string,
  tolerance: number = 25,
  feather: number = 2
) {
  const imgData = ctx.getImageData(0, 0, width, height);
  const data = imgData.data;

  // Sample outer edges only
  const sampleIndices = [
    0,
    Math.min(data.length - 4, (Math.floor(width * 0.05)) * 4),
    Math.min(data.length - 4, (Math.floor(width * 0.95)) * 4),
    Math.min(data.length - 4, (width - 1) * 4),
    Math.min(data.length - 4, (Math.floor(height * 0.1) * width + Math.floor(width * 0.02)) * 4),
    Math.min(data.length - 4, (Math.floor(height * 0.1) * width + Math.floor(width * 0.98)) * 4),
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

  const centerCenterX = width / 2;
  const centerCenterY = height * 0.50;
  const headRadiusX = width * 0.32;
  const headRadiusY = height * 0.40;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4;
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];

      const dx = (x - centerCenterX) / headRadiusX;
      const dy = (y - centerCenterY) / headRadiusY;
      const distFromCenter = dx * dx + dy * dy;

      // Skin tone detection - NEVER replace skin pixels
      const isSkinTone = r > 70 && g > 40 && b > 25 && r > g && r > b && (r - g > 10);
      if (distFromCenter < 0.65 || (isSkinTone && distFromCenter < 1.15)) {
        continue;
      }

      // Torso check in lower half
      if (y > height * 0.70 && Math.abs(x - centerCenterX) < width * 0.42) {
        continue;
      }

      const distToBg = Math.sqrt((r - bgR) ** 2 + (g - bgG) ** 2 + (b - bgB) ** 2);

      if (distFromCenter > 1.25 && (distToBg < 60 || y < height * 0.12 || x < width * 0.08 || x > width * 0.92)) {
        if (isTransparent) {
          data[i + 3] = 0;
        } else {
          data[i] = targetR;
          data[i + 1] = targetG;
          data[i + 2] = targetB;
          data[i + 3] = 255;
        }
      } else if (distToBg < 40 && !isSkinTone && distFromCenter > 0.85) {
        if (isTransparent) {
          data[i + 3] = 0;
        } else {
          data[i] = targetR;
          data[i + 1] = targetG;
          data[i + 2] = targetB;
          data[i + 3] = 255;
        }
      }
    }
  }

  ctx.putImageData(imgData, 0, 0);
}

/**
 * Calculates grid arrangement (columns & rows) and coordinates on sheet
 */
export function calculateSheetLayout(
  paperWidthMm: number,
  paperHeightMm: number,
  photoWidthMm: number,
  photoHeightMm: number,
  requestedCopies: number,
  marginMm: number,
  gapMm: number
): {
  cols: number;
  rows: number;
  totalPositions: number;
  actualCopies: number;
  startX: number;
  startY: number;
  positions: Array<{ x: number; y: number }>;
} {
  const printableW = paperWidthMm - marginMm * 2;
  const printableH = paperHeightMm - marginMm * 2;

  // Max cols and rows that can physically fit
  const maxCols = Math.max(1, Math.floor((printableW + gapMm) / (photoWidthMm + gapMm)));
  const maxRows = Math.max(1, Math.floor((printableH + gapMm) / (photoHeightMm + gapMm)));

  const maxPossible = maxCols * maxRows;
  const actualCopies = Math.min(requestedCopies, maxPossible);

  // Compute best balanced grid for requested copies
  let cols = Math.min(actualCopies, maxCols);
  let rows = Math.ceil(actualCopies / cols);

  // Optimize aspect ratio to center nicely
  for (let c = maxCols; c >= 1; c--) {
    const r = Math.ceil(actualCopies / c);
    if (r <= maxRows) {
      cols = c;
      rows = r;
      break;
    }
  }

  const gridWidth = cols * photoWidthMm + (cols - 1) * gapMm;
  const gridHeight = rows * photoHeightMm + (rows - 1) * gapMm;

  // Center grid on page
  const startX = (paperWidthMm - gridWidth) / 2;
  const startY = (paperHeightMm - gridHeight) / 2;

  const positions: Array<{ x: number; y: number }> = [];
  let count = 0;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (count >= actualCopies) break;
      const x = startX + c * (photoWidthMm + gapMm);
      const y = startY + r * (photoHeightMm + gapMm);
      positions.push({ x, y });
      count++;
    }
  }

  return {
    cols,
    rows,
    totalPositions: maxPossible,
    actualCopies,
    startX,
    startY,
    positions,
  };
}

/**
 * Renders the entire A4 / Sheet to a high-resolution Canvas
 */
export function renderCompleteSheetCanvas(
  singlePhotoCanvas: HTMLCanvasElement,
  photoWidthMm: number,
  photoHeightMm: number,
  layout: LayoutConfig,
  dpi: number = 300
): HTMLCanvasElement {
  const paper = PAPER_SIZES[layout.paperSize];
  const isLandscape = layout.orientation === 'landscape';
  const paperWidthMm = isLandscape ? paper.heightMm : paper.widthMm;
  const paperHeightMm = isLandscape ? paper.widthMm : paper.heightMm;

  const sheetPixelW = Math.round((paperWidthMm / 25.4) * dpi);
  const sheetPixelH = Math.round((paperHeightMm / 25.4) * dpi);

  const canvas = document.createElement('canvas');
  canvas.width = sheetPixelW;
  canvas.height = sheetPixelH;
  const ctx = canvas.getContext('2d');
  if (!ctx) return canvas;

  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';

  // Sheet background: crisp white paper
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, sheetPixelW, sheetPixelH);

  const grid = calculateSheetLayout(
    paperWidthMm,
    paperHeightMm,
    photoWidthMm,
    photoHeightMm,
    layout.copies,
    layout.marginMm,
    layout.gapMm
  );

  const mmToPx = (mm: number) => (mm / 25.4) * dpi;
  const photoW = mmToPx(photoWidthMm);
  const photoH = mmToPx(photoHeightMm);
  const borderWidth = mmToPx(layout.borderWidthMm);

  // Draw Header / Metadata if enabled
  if (layout.includeHeader && layout.headerText) {
    ctx.save();
    ctx.fillStyle = '#64748B';
    ctx.font = `${Math.round(mmToPx(2.5))}px 'JetBrains Mono', monospace`;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText(
      layout.headerText,
      mmToPx(layout.marginMm),
      mmToPx(layout.marginMm * 0.4)
    );
    ctx.restore();
  }

  // Draw Photos & Cut Guides
  grid.positions.forEach((pos) => {
    const pxX = mmToPx(pos.x);
    const pxY = mmToPx(pos.y);

    // Draw the passport photograph
    ctx.drawImage(singlePhotoCanvas, pxX, pxY, photoW, photoH);

    // Draw border if requested (helps minilab cutter align accurately)
    if (layout.showBorder) {
      ctx.save();
      ctx.strokeStyle = layout.borderColor;
      ctx.lineWidth = Math.max(1, borderWidth);
      ctx.strokeRect(pxX, pxY, photoW, photoH);
      ctx.restore();
    }

    // Draw Cutting Marks / Corner ticks
    if (layout.showCutMarks) {
      drawCutGuides(ctx, pxX, pxY, photoW, photoH, mmToPx(2.0), layout.cutMarkStyle);
    }
  });

  return canvas;
}

/**
 * Draws professional printing cut marks (corner ticks or dashed guides)
 */
function drawCutGuides(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  tickLength: number,
  style: LayoutConfig['cutMarkStyle']
) {
  ctx.save();
  ctx.strokeStyle = '#94A3B8';
  ctx.lineWidth = 1;

  if (style === 'dashed') {
    ctx.setLineDash([4, 4]);
    ctx.strokeRect(x, y, w, h);
  } else if (style === 'solid') {
    ctx.setLineDash([]);
    ctx.strokeRect(x, y, w, h);
  } else {
    // Standard photo lab corner ticks (extend outside corners)
    ctx.beginPath();
    // Top-left
    ctx.moveTo(x - tickLength, y);
    ctx.lineTo(x, y);
    ctx.moveTo(x, y - tickLength);
    ctx.lineTo(x, y);

    // Top-right
    ctx.moveTo(x + w + tickLength, y);
    ctx.lineTo(x + w, y);
    ctx.moveTo(x + w, y - tickLength);
    ctx.lineTo(x + w, y);

    // Bottom-left
    ctx.moveTo(x - tickLength, y + h);
    ctx.lineTo(x, y + h);
    ctx.moveTo(x, y + h + tickLength);
    ctx.lineTo(x, y + h);

    // Bottom-right
    ctx.moveTo(x + w + tickLength, y + h);
    ctx.lineTo(x + w, y + h);
    ctx.moveTo(x + w, y + h + tickLength);
    ctx.lineTo(x + w, y + h);

    ctx.stroke();
  }

  ctx.restore();
}
