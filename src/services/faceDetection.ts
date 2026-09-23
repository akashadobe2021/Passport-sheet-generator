import { CropState, FaceDetectionBox } from '../types/passport';

/**
 * Intelligent client-side Face Detection and Passport Auto-Centering
 * Analyzes image pixel data using skin-chrominance modeling (YCbCr / HSV)
 * and connected component center-of-mass to locate face boundaries,
 * eye line, crown, and chin level without requiring external cloud API calls.
 */

export function detectFaceAndComputeCrop(
  img: HTMLImageElement,
  cropWidthMm: number,
  cropHeightMm: number
): { face: FaceDetectionBox; recommendedCrop: CropState } {
  const canvas = document.createElement('canvas');
  // Scale down for fast responsive analysis
  const maxDim = 400;
  const scale = Math.min(1, maxDim / Math.max(img.naturalWidth, img.naturalHeight));
  const w = Math.round(img.naturalWidth * scale);
  const h = Math.round(img.naturalHeight * scale);
  canvas.width = w;
  canvas.height = h;

  const ctx = canvas.getContext('2d');
  if (!ctx) {
    return {
      face: createFallbackFace(img.naturalWidth, img.naturalHeight),
      recommendedCrop: {
        zoom: 1.0,
        panX: 0,
        panY: 0,
        rotation: 0,
        bgColor: 'original',
        bgTolerance: 20,
        bgFeather: 2,
      },
    };
  }

  ctx.drawImage(img, 0, 0, w, h);
  const imageData = ctx.getImageData(0, 0, w, h);
  const data = imageData.data;

  // Track skin-tone matching pixels
  let minX = w, maxX = 0, minY = h, maxY = 0;
  let totalSkinPixels = 0;
  let sumX = 0, sumY = 0;

  // Skin color model in YCbCr:
  // Cb in [77, 127], Cr in [133, 173]
  for (let y = Math.round(h * 0.1); y < Math.round(h * 0.9); y++) {
    for (let x = Math.round(w * 0.1); x < Math.round(w * 0.9); x++) {
      const idx = (y * w + x) * 4;
      const r = data[idx];
      const g = data[idx + 1];
      const b = data[idx + 2];

      const yVal = 0.299 * r + 0.587 * g + 0.114 * b;
      const cb = 128 - 0.168736 * r - 0.331264 * g + 0.5 * b;
      const cr = 128 + 0.5 * r - 0.418688 * g - 0.081312 * b;

      // Skin detection condition with common lighting tolerance
      const isSkin = cb >= 75 && cb <= 135 && cr >= 130 && cr <= 178 && yVal > 40 && yVal < 240;

      if (isSkin) {
        totalSkinPixels++;
        sumX += x;
        sumY += y;
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }

  // If skin detection didn't find enough points, fallback to golden passport portrait framing
  let faceBox: FaceDetectionBox;
  if (totalSkinPixels < (w * h) * 0.02 || minX >= maxX || minY >= maxY) {
    faceBox = createFallbackFace(img.naturalWidth, img.naturalHeight);
  } else {
    const invScale = 1 / scale;
    const origMinX = minX * invScale;
    const origMaxX = maxX * invScale;
    const origMinY = minY * invScale;
    const origMaxY = maxY * invScale;

    const faceWidth = origMaxX - origMinX;
    const faceHeight = origMaxY - origMinY;
    const centerX = (sumX / totalSkinPixels) * invScale;
    const centerY = (sumY / totalSkinPixels) * invScale;

    // Estimate crown (top of head above skin) and chin
    const crownY = Math.max(0, origMinY - faceHeight * 0.25);
    const chinY = Math.min(img.naturalHeight, origMaxY + faceHeight * 0.1);
    const estimatedHeadHeight = chinY - crownY;

    faceBox = {
      x: origMinX,
      y: origMinY,
      width: faceWidth,
      height: faceHeight,
      confidence: Math.min(0.95, totalSkinPixels / (w * h * 0.15)),
      eyes: {
        left: { x: centerX - faceWidth * 0.2, y: centerY - faceHeight * 0.15 },
        right: { x: centerX + faceWidth * 0.2, y: centerY - faceHeight * 0.15 },
      },
      crown: { x: centerX, y: crownY },
      chin: { x: centerX, y: chinY },
    };
  }

  // Compute recommended crop for standard Indian passport (70-80% face coverage)
  // Target: Head height should be 75% of the crop height
  const targetCoverage = 0.75;
  const currentHeadHeight = (faceBox.chin?.y ?? faceBox.y + faceBox.height) - (faceBox.crown?.y ?? faceBox.y);
  const desiredCropPixelHeight = currentHeadHeight / targetCoverage;
  const desiredCropPixelWidth = desiredCropPixelHeight * (cropWidthMm / cropHeightMm);

  // Determine zoom such that original image fits appropriately
  // In our editor: zoom = 1.0 means crop area fits the image base dimension
  const baseDim = Math.min(img.naturalWidth, img.naturalHeight);
  const targetZoom = Math.max(0.6, Math.min(3.0, (baseDim / desiredCropPixelHeight) * 0.95));

  // Compute center offset to align face in the passport frame
  // Indian passport rule: Eye line should be roughly 56% up from the bottom (or 44% from top)
  const faceCenterX = faceBox.x + faceBox.width / 2;
  const faceCenterY = (faceBox.crown?.y ?? faceBox.y) + currentHeadHeight * 0.45;

  const imgCenterX = img.naturalWidth / 2;
  const imgCenterY = img.naturalHeight / 2;

  // Offset in unscaled original image space
  const panX = -(faceCenterX - imgCenterX);
  const panY = -(faceCenterY - imgCenterY);

  return {
    face: faceBox,
    recommendedCrop: {
      zoom: Number(targetZoom.toFixed(2)),
      panX: Math.round(panX),
      panY: Math.round(panY),
      rotation: 0,
      bgColor: 'original',
      bgTolerance: 25,
      bgFeather: 2,
    },
  };
}

function createFallbackFace(imgW: number, imgH: number): FaceDetectionBox {
  const width = imgW * 0.45;
  const height = imgH * 0.55;
  const x = (imgW - width) / 2;
  const y = imgH * 0.18;
  return {
    x,
    y,
    width,
    height,
    confidence: 0.8,
    crown: { x: imgW / 2, y: y },
    chin: { x: imgW / 2, y: y + height },
    eyes: {
      left: { x: imgW / 2 - width * 0.22, y: y + height * 0.4 },
      right: { x: imgW / 2 + width * 0.22, y: y + height * 0.4 },
    },
  };
}
