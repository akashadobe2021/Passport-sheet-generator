import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import { LayoutConfig, PaperSize } from '../types/passport';
import { PAPER_SIZES } from '../constants/presets';
import { calculateSheetLayout } from './imageProcessing';

const MM_TO_PT = 72 / 25.4; // 2.834645669

/**
 * Generates an uncompressed, studio-grade print-ready PDF
 * with exact millimeter dimensions and vector cutting marks.
 */
export async function generatePassportSheetPdf(
  singlePhotoCanvas: HTMLCanvasElement,
  photoWidthMm: number,
  photoHeightMm: number,
  layout: LayoutConfig,
  dpi: number = 300
): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();

  const paper = PAPER_SIZES[layout.paperSize];
  const isLandscape = layout.orientation === 'landscape';
  const paperWidthMm = isLandscape ? paper.heightMm : paper.widthMm;
  const paperHeightMm = isLandscape ? paper.widthMm : paper.heightMm;

  const pageWidthPt = paperWidthMm * MM_TO_PT;
  const pageHeightPt = paperHeightMm * MM_TO_PT;

  const page = pdfDoc.addPage([pageWidthPt, pageHeightPt]);

  // Convert canvas to lossless / high-quality image bytes
  const dataUrl = singlePhotoCanvas.toDataURL('image/jpeg', 0.98);
  const imageBytes = await fetch(dataUrl).then((res) => res.arrayBuffer());
  const embeddedImage = await pdfDoc.embedJpg(imageBytes);

  const grid = calculateSheetLayout(
    paperWidthMm,
    paperHeightMm,
    photoWidthMm,
    photoHeightMm,
    layout.copies,
    layout.marginMm,
    layout.gapMm
  );

  const photoWidthPt = photoWidthMm * MM_TO_PT;
  const photoHeightPt = photoHeightMm * MM_TO_PT;
  const tickLenPt = 2.0 * MM_TO_PT;

  // Header text if requested
  if (layout.includeHeader && layout.headerText) {
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    page.drawText(layout.headerText, {
      x: layout.marginMm * MM_TO_PT,
      y: pageHeightPt - (layout.marginMm * 0.4 * MM_TO_PT),
      size: 7,
      font,
      color: rgb(0.4, 0.45, 0.5),
    });
  }

  // Draw each passport photo onto the PDF at exact coordinates
  // Note: PDF coordinate system has (0, 0) at the bottom-left!
  grid.positions.forEach((pos) => {
    const xPt = pos.x * MM_TO_PT;
    // Invert Y coordinate for PDF bottom-left origin:
    const yPt = pageHeightPt - (pos.y * MM_TO_PT) - photoHeightPt;

    // 1. Draw image
    page.drawImage(embeddedImage, {
      x: xPt,
      y: yPt,
      width: photoWidthPt,
      height: photoHeightPt,
    });

    // 2. Draw border if specified
    if (layout.showBorder) {
      // Parse hex color or default to subtle slate
      page.drawRectangle({
        x: xPt,
        y: yPt,
        width: photoWidthPt,
        height: photoHeightPt,
        borderWidth: Math.max(0.3, layout.borderWidthMm * MM_TO_PT),
        borderColor: rgb(0.8, 0.83, 0.88),
      });
    }

    // 3. Draw Cutting Guides (Vector lines for razor-sharp printing)
    if (layout.showCutMarks) {
      const guideColor = rgb(0.65, 0.7, 0.75);
      const strokeWidth = 0.5;

      if (layout.cutMarkStyle === 'solid') {
        page.drawRectangle({
          x: xPt,
          y: yPt,
          width: photoWidthPt,
          height: photoHeightPt,
          borderWidth: strokeWidth,
          borderColor: guideColor,
        });
      } else {
        // Corner ticks
        // Top-left corner: (xPt, yPt + photoHeightPt)
        page.drawLine({
          start: { x: xPt - tickLenPt, y: yPt + photoHeightPt },
          end: { x: xPt, y: yPt + photoHeightPt },
          thickness: strokeWidth,
          color: guideColor,
        });
        page.drawLine({
          start: { x: xPt, y: yPt + photoHeightPt },
          end: { x: xPt, y: yPt + photoHeightPt + tickLenPt },
          thickness: strokeWidth,
          color: guideColor,
        });

        // Top-right corner: (xPt + photoWidthPt, yPt + photoHeightPt)
        page.drawLine({
          start: { x: xPt + photoWidthPt, y: yPt + photoHeightPt },
          end: { x: xPt + photoWidthPt + tickLenPt, y: yPt + photoHeightPt },
          thickness: strokeWidth,
          color: guideColor,
        });
        page.drawLine({
          start: { x: xPt + photoWidthPt, y: yPt + photoHeightPt },
          end: { x: xPt + photoWidthPt, y: yPt + photoHeightPt + tickLenPt },
          thickness: strokeWidth,
          color: guideColor,
        });

        // Bottom-left corner: (xPt, yPt)
        page.drawLine({
          start: { x: xPt - tickLenPt, y: yPt },
          end: { x: xPt, y: yPt },
          thickness: strokeWidth,
          color: guideColor,
        });
        page.drawLine({
          start: { x: xPt, y: yPt - tickLenPt },
          end: { x: xPt, y: yPt },
          thickness: strokeWidth,
          color: guideColor,
        });

        // Bottom-right corner: (xPt + photoWidthPt, yPt)
        page.drawLine({
          start: { x: xPt + photoWidthPt, y: yPt },
          end: { x: xPt + photoWidthPt + tickLenPt, y: yPt },
          thickness: strokeWidth,
          color: guideColor,
        });
        page.drawLine({
          start: { x: xPt + photoWidthPt, y: yPt - tickLenPt },
          end: { x: xPt + photoWidthPt, y: yPt },
          thickness: strokeWidth,
          color: guideColor,
        });
      }
    }
  });

  return await pdfDoc.save();
}

/**
 * Initiates browser download of the generated PDF
 */
export function downloadPdfBlob(pdfBytes: Uint8Array, fileName: string) {
  const blob = new Blob([pdfBytes.buffer as ArrayBuffer], { type: 'application/pdf' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName.endsWith('.pdf') ? fileName : `${fileName}.pdf`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 10000);
}

