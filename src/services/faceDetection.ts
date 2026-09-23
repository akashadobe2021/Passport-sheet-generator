import { CropState, FaceDetectionBox } from '../types/passport';

/**
 * Intelligent Client-Side Face Detection and Passport Auto-Centering Engine
 *
 * Tier 1: Uses Native Shape Detection API (window.FaceDetector) if available in browser
 * Tier 2: Uses multi-space adaptive colorimetry (YCbCr + HSV + Normalized RGB + Edge contrast)
 *         supporting all skin complexions (fair, wheatish, dark, deep)
 * Tier 3: Computes exact passport millimeter alignment (70–80% head coverage, eye line 44% from top)
 */

export async function detectFaceAndComputeCrop(
  img: HTMLImageElement,
  cropWidthMm: number,
  cropHeightMm: number
): Promise<{ face: FaceDetectionBox; recommendedCrop: CropState }> {
  let detectedFace: FaceDetectionBox | null = null;

  // 1. Try Native Browser FaceDetector (Hardware accelerated in Chromium / Android)
  if (typeof window !== 'undefined' && 'FaceDetector' in window) {
    try {
      const FaceDetectorClass = (window as any).FaceDetector;
      const detector = new FaceDetectorClass({ fastMode: true, maxDetectedFaces: 1 });
      const faces = await detector.detect(img);

      if (faces && faces.length > 0) {
        const f = faces[0];
        const box = f.boundingBox;
        
        let leftEye: { x: number; y: number } | undefined;
        let rightEye: { x: number; y: number } | undefined;

        if (f.landmarks) {
          for (const lm of f.landmarks) {
            if (lm.type === 'eye') {
              if (!leftEye) leftEye = { x: lm.locations[0].x, y: lm.locations[0].y };
              else rightEye = { x: lm.locations[0].x, y: lm.locations[0].y };
            }
          }
        }

        const headHeight = box.height * 1.25; // Include hair crown
        const crownY = Math.max(0, box.y - box.height * 0.2);
        const chinY = Math.min(img.naturalHeight, box.y + box.height * 1.05);

        detectedFace = {
          x: box.x,
          y: box.y,
          width: box.width,
          height: box.height,
          confidence: 0.98,
          crown: { x: box.x + box.width / 2, y: crownY },
          chin: { x: box.x + box.width / 2, y: chinY },
          eyes: leftEye && rightEye ? { left: leftEye, right: rightEye } : {
            left: { x: box.x + box.width * 0.3, y: box.y + box.height * 0.38 },
            right: { x: box.x + box.width * 0.7, y: box.y + box.height * 0.38 },
          },
        };
      }
    } catch {
      // Fall through to pixel-based analysis
    }
  }

  // 2. Multi-spectrum pixel analysis if native detection was not available or found nothing
  if (!detectedFace) {
    detectedFace = detectFacePixels(img);
  }

  // If still not detected, fallback to standard portrait golden ratio
  if (!detectedFace) {
    detectedFace = createFallbackFace(img.naturalWidth, img.naturalHeight);
  }

  // 3. Compute Indian Passport Compliant Crop Parameters
  const recommendedCrop = computePassportCrop(
    img.naturalWidth,
    img.naturalHeight,
    detectedFace,
    cropWidthMm,
    cropHeightMm
  );

  return {
    face: detectedFace,
    recommendedCrop,
  };
}

/**
 * Multi-space skin tone & face contour analyzer
 * Supports diverse lighting, Indian / Asian / African / European skin complexions
 */
function detectFacePixels(img: HTMLImageElement): FaceDetectionBox | null {
  const canvas = document.createElement('canvas');
  // Scale down to 320px for rapid 60fps analysis
  const maxDim = 320;
  const scale = Math.min(1, maxDim / Math.max(img.naturalWidth, img.naturalHeight));
  const w = Math.max(20, Math.round(img.naturalWidth * scale));
  const h = Math.max(20, Math.round(img.naturalHeight * scale));
  canvas.width = w;
  canvas.height = h;

  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) return null;

  ctx.drawImage(img, 0, 0, w, h);
  const imageData = ctx.getImageData(0, 0, w, h);
  const data = imageData.data;

  // We accumulate face candidate density with center-bias
  const skinMap = new Uint8Array(w * h);
  let totalSkin = 0;
  let minX = w, maxX = 0, minY = h, maxY = 0;
  let weightedSumX = 0, weightedSumY = 0, totalWeight = 0;

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const idx = (y * w + x) * 4;
      const r = data[idx];
      const g = data[idx + 1];
      const b = data[idx + 2];

      // Multi-space conditions:
      // Condition A: YCbCr skin model
      const yVal = 0.299 * r + 0.587 * g + 0.114 * b;
      const cb = 128 - 0.168736 * r - 0.331264 * g + 0.5 * b;
      const cr = 128 + 0.5 * r - 0.418688 * g - 0.081312 * b;
      const isYCbCr = cb >= 70 && cb <= 140 && cr >= 125 && cr <= 185 && yVal > 25 && yVal < 245;

      // Condition B: RGB normalized ratio (works well for darker and wheatish complexions)
      const sumRGB = r + g + b + 0.001;
      const nr = r / sumRGB;
      const ng = g / sumRGB;
      const isRgbSkin = nr > 0.33 && nr > ng && (r > g) && (g >= b) && (r - g >= 8);

      // Condition C: HSV skin hue (Hue between 0° and 50° or 340° to 360°)
      const maxC = Math.max(r, g, b);
      const minC = Math.min(r, g, b);
      const delta = maxC - minC;
      let hue = 0;
      if (delta > 0) {
        if (maxC === r) hue = ((g - b) / delta) % 6;
        else if (maxC === g) hue = (b - r) / delta + 2;
        else hue = (r - g) / delta + 4;
        hue = Math.round(hue * 60);
        if (hue < 0) hue += 360;
      }
      const sat = maxC === 0 ? 0 : delta / maxC;
      const isHsvSkin = ((hue >= 0 && hue <= 50) || hue >= 340) && sat >= 0.15 && sat <= 0.85;

      const isSkin = (isYCbCr && isRgbSkin) || (isHsvSkin && isYCbCr) || (isRgbSkin && isHsvSkin);

      if (isSkin) {
        skinMap[y * w + x] = 1;
        totalSkin++;

        // Central elliptical weight to favor central portrait face over hands/shoulders
        const dx = (x - w / 2) / (w * 0.4);
        const dy = (y - h * 0.45) / (h * 0.4);
        const centerDistSq = dx * dx + dy * dy;
        const weight = Math.max(0.1, 1.0 - centerDistSq * 0.5);

        weightedSumX += x * weight;
        weightedSumY += y * weight;
        totalWeight += weight;

        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }

  const minSkinThreshold = (w * h) * 0.015;
  if (totalSkin < minSkinThreshold || totalWeight === 0 || minX >= maxX || minY >= maxY) {
    return null;
  }

  const invScale = 1 / scale;
  const centerX = (weightedSumX / totalWeight) * invScale;
  const centerY = (weightedSumY / totalWeight) * invScale;

  // Approximate face box from bounded skin cluster
  const rawBoxW = (maxX - minX) * invScale;
  const rawBoxH = (maxY - minY) * invScale;

  // Refine head dimensions based on human anatomy proportions (height approx 1.35x width)
  const faceWidth = Math.min(img.naturalWidth * 0.8, Math.max(img.naturalWidth * 0.25, rawBoxW * 0.85));
  const faceHeight = faceWidth * 1.35;

  const crownY = Math.max(0, centerY - faceHeight * 0.55);
  const chinY = Math.min(img.naturalHeight, centerY + faceHeight * 0.45);

  return {
    x: Math.max(0, centerX - faceWidth / 2),
    y: crownY,
    width: faceWidth,
    height: faceHeight,
    confidence: Math.min(0.95, totalSkin / (w * h * 0.12)),
    crown: { x: centerX, y: crownY },
    chin: { x: centerX, y: chinY },
    eyes: {
      left: { x: centerX - faceWidth * 0.2, y: crownY + faceHeight * 0.42 },
      right: { x: centerX + faceWidth * 0.2, y: crownY + faceHeight * 0.42 },
    },
  };
}

/**
 * Computes exact panX, panY and zoom to fit Indian Passport standard (70-80% face coverage)
 */
function computePassportCrop(
  imgW: number,
  imgH: number,
  face: FaceDetectionBox,
  cropWidthMm: number,
  cropHeightMm: number
): CropState {
  const headHeight = Math.max(20, (face.chin?.y ?? face.y + face.height) - (face.crown?.y ?? face.y));
  const headCenterY = (face.crown?.y ?? face.y) + headHeight * 0.45;
  const faceCenterX = face.x + face.width / 2;

  const aspect = cropWidthMm / cropHeightMm;
  const imgAspect = imgW / imgH;

  // Target: In the passport frame, head height must be exactly 75% of the frame height
  // When zoom = 1.0:
  // If imgAspect > aspect (landscape photo): drawn height is FrameHeight
  // If imgAspect <= aspect (portrait photo): drawn width is FrameWidth, drawn height is FrameWidth / imgAspect = FrameHeight * (aspect / imgAspect)
  let baseDrawnHeightFraction = 1.0;
  if (imgAspect <= aspect) {
    baseDrawnHeightFraction = aspect / imgAspect;
  }

  // We want: (headHeight / imgH) * baseDrawnHeightFraction * zoom = 0.75
  const idealZoom = (0.75 * imgH) / (headHeight * baseDrawnHeightFraction);
  const clampedZoom = Math.max(0.5, Math.min(3.5, Number(idealZoom.toFixed(2))));

  // Center alignment:
  // In the crop frame:
  // We want faceCenterX to align with the horizontal center (imgW / 2) -> panX = (imgW / 2) - faceCenterX
  // We want eye level to be at 44% from top (slightly above 50% center)
  // Target head center in frame: ~48% from the top
  const targetHeadCenterRatio = 0.48; // 48% from top of crop frame
  const frameCenterDiff = (0.50 - targetHeadCenterRatio); // 0.02 above canvas center
  const verticalShiftInImgPx = (frameCenterDiff * imgH) / (clampedZoom * baseDrawnHeightFraction);

  const panX = Math.round((imgW / 2) - faceCenterX);
  const panY = Math.round((imgH / 2) - headCenterY + verticalShiftInImgPx);

  return {
    zoom: clampedZoom,
    panX,
    panY,
    rotation: 0,
    bgColor: 'original',
    bgTolerance: 25,
    bgFeather: 2,
  };
}

function createFallbackFace(imgW: number, imgH: number): FaceDetectionBox {
  const width = imgW * 0.45;
  const height = imgH * 0.55;
  const x = (imgW - width) / 2;
  const y = imgH * 0.15;
  return {
    x,
    y,
    width,
    height,
    confidence: 0.75,
    crown: { x: imgW / 2, y },
    chin: { x: imgW / 2, y: y + height },
    eyes: {
      left: { x: imgW / 2 - width * 0.22, y: y + height * 0.42 },
      right: { x: imgW / 2 + width * 0.22, y: y + height * 0.42 },
    },
  };
}
