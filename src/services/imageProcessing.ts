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
  dpi: number = 300
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

  // Base background fill
  ctx.fillStyle = crop.bgColor !== 'original' ? crop.bgColor : '#FFFFFF';
  ctx.fillRect(0, 0, pixelWidth, pixelHeight);

  // Save context state for photo transform
  ctx.save();
  // Move to center of passport frame
  ctx.translate(pixelWidth / 2, pixelHeight / 2);
  // Apply rotation
  ctx.rotate((crop.rotation * Math.PI) / 180);

  // Calculate base draw dimensions
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
    img,
    -drawW / 2 + scaledPanX,
    -drawH / 2 + scaledPanY,
    drawW,
    drawH
  );
  ctx.restore();

  // If background replacement is active, apply background chroma filter
  if (crop.bgColor !== 'original') {
    applyBackgroundReplacement(ctx, pixelWidth, pixelHeight, crop.bgColor, crop.bgTolerance);
  }

  return canvas;
}

/**
 * Replaces non-subject backdrop pixels with the selected studio passport color
 * (Pure White, Studio Blue, Light Grey) with boundary sampling & tolerance
 */
function applyBackgroundReplacement(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  targetHexColor: string,
  tolerance: number = 25
) {
  const imgData = ctx.getImageData(0, 0, width, height);
  const data = imgData.data;

  // Sample top corners to deduce original backdrop color
  const samplePoints = [
    0, // top-left
    (width - 1) * 4, // top-right
    (Math.floor(width * 0.1)) * 4,
    (Math.floor(width * 0.9)) * 4,
  ];

  let bgR = 0, bgG = 0, bgB = 0;
  samplePoints.forEach((idx) => {
    bgR += data[idx];
    bgG += data[idx + 1];
    bgB += data[idx + 2];
  });
  bgR /= samplePoints.length;
  bgG /= samplePoints.length;
  bgB /= samplePoints.length;

  // Parse target color hex
  const targetR = parseInt(targetHexColor.slice(1, 3), 16);
  const targetG = parseInt(targetHexColor.slice(3, 5), 16);
  const targetB = parseInt(targetHexColor.slice(5, 7), 16);

  const tolSq = tolerance * tolerance * 3;

  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];

    const distSq = (r - bgR) ** 2 + (g - bgG) ** 2 + (b - bgB) ** 2;

    if (distSq < tolSq) {
      // Direct backdrop match
      const blend = Math.min(1, Math.sqrt(distSq / tolSq));
      data[i] = Math.round(targetR * (1 - blend) + r * blend);
      data[i + 1] = Math.round(targetG * (1 - blend) + g * blend);
      data[i + 2] = Math.round(targetB * (1 - blend) + b * blend);
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
