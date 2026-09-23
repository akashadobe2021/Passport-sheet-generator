import React, { useState } from 'react';
import {
  Download,
  FileText,
  Image as ImageIcon,
  Printer,
  Sparkles,
  CheckCircle,
  FileCheck,
  Settings2,
  Share2
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { LayoutConfig, PhotoPreset } from '../types/passport';
import { PAPER_SIZES } from '../constants/presets';
import { calculateSheetLayout, renderCompleteSheetCanvas, renderSinglePassportPhoto } from '../services/imageProcessing';
import { generatePassportSheetPdf, downloadPdfBlob } from '../services/pdfService';
import { StorageService } from '../services/storageService';

interface ExportSectionProps {
  image: HTMLImageElement | null;
  singlePhotoCanvas: HTMLCanvasElement | null;
  crop: any;
  selectedPreset: PhotoPreset;
  customWidthMm: number;
  customHeightMm: number;
  layout: LayoutConfig;
  targetDpi: 300 | 600;
  setTargetDpi: (dpi: 300 | 600) => void;
  onPrint: () => void;
}

export const ExportSection: React.FC<ExportSectionProps> = ({
  image,
  singlePhotoCanvas,
  crop,
  selectedPreset,
  customWidthMm,
  customHeightMm,
  layout,
  targetDpi,
  setTargetDpi,
  onPrint,
}) => {
  const [isExporting, setIsExporting] = useState(false);
  const [exportSuccessMsg, setExportSuccessMsg] = useState<string | null>(null);

  const photoWidthMm = selectedPreset.id === 'custom' ? customWidthMm : selectedPreset.widthMm;
  const photoHeightMm = selectedPreset.id === 'custom' ? customHeightMm : selectedPreset.heightMm;

  const triggerConfetti = () => {
    try {
      confetti({
        particleCount: 60,
        spread: 60,
        origin: { y: 0.8 },
      });
    } catch {
      // ignore
    }
  };

  const handleDownloadPdf = async () => {
    if (!image || !singlePhotoCanvas) return;
    setIsExporting(true);
    setExportSuccessMsg(null);

    try {
      // 1. Render photo at selected DPI
      const photoCanvas = renderSinglePassportPhoto(
        image,
        crop,
        photoWidthMm,
        photoHeightMm,
        targetDpi
      );

      // 2. Generate PDF
      const pdfBytes = await generatePassportSheetPdf(
        photoCanvas,
        photoWidthMm,
        photoHeightMm,
        layout,
        targetDpi
      );

      const fileName = `passport-sheet-${layout.paperSize.toLowerCase()}-${layout.copies}copies-${targetDpi}dpi.pdf`;
      downloadPdfBlob(pdfBytes, fileName);

      // Record in history
      StorageService.recordExport({
        fileName,
        exportType: 'pdf',
        copiesCount: layout.copies,
        paperSize: layout.paperSize,
        dpi: targetDpi,
        fileSizeKb: Math.round(pdfBytes.byteLength / 1024),
      });

      triggerConfetti();
      setExportSuccessMsg(`Successfully generated print-ready PDF (${fileName})`);
    } catch (err) {
      console.error('PDF export failed:', err);
      alert('Failed to generate PDF. Please try again.');
    } finally {
      setIsExporting(false);
    }
  };

  const handleDownloadSheetImage = (format: 'png' | 'jpeg') => {
    if (!image) return;
    setIsExporting(true);
    setExportSuccessMsg(null);

    setTimeout(() => {
      try {
        const photoCanvas = renderSinglePassportPhoto(
          image,
          crop,
          photoWidthMm,
          photoHeightMm,
          targetDpi
        );

        const paper = PAPER_SIZES[layout.paperSize];
        const isLandscape = layout.orientation === 'landscape';
        const paperW = isLandscape ? paper.heightMm : paper.widthMm;
        const paperH = isLandscape ? paper.widthMm : paper.heightMm;

        const initialGrid = calculateSheetLayout(
          paperW,
          paperH,
          photoWidthMm,
          photoHeightMm,
          layout.copies,
          layout.marginMm,
          layout.gapMm,
          0
        );

        const ext = format === 'png' ? 'png' : 'jpg';
        const mime = format === 'png' ? 'image/png' : 'image/jpeg';

        for (let p = 0; p < initialGrid.totalPages; p++) {
          const sheetCanvas = renderCompleteSheetCanvas(
            photoCanvas,
            photoWidthMm,
            photoHeightMm,
            layout,
            targetDpi,
            p
          );

          const dataUrl = sheetCanvas.toDataURL(mime, 0.95);
          const a = document.createElement('a');
          const pageSuffix = initialGrid.totalPages > 1 ? `-sheet-${p + 1}-of-${initialGrid.totalPages}` : '';
          const fileName = `passport-sheet-${layout.paperSize.toLowerCase()}-${layout.copies}copies${pageSuffix}-${targetDpi}dpi.${ext}`;
          a.href = dataUrl;
          a.download = fileName;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);

          StorageService.recordExport({
            fileName,
            exportType: ext as any,
            copiesCount: layout.copies,
            paperSize: layout.paperSize,
            dpi: targetDpi,
            fileSizeKb: Math.round(dataUrl.length * 0.75 / 1024),
          });
        }

        triggerConfetti();
        setExportSuccessMsg(
          initialGrid.totalPages > 1
            ? `Downloaded ${initialGrid.totalPages} sheet images for ${layout.copies} copies`
            : `Downloaded full sheet image`
        );
      } catch (err) {
        console.error('Image export failed:', err);
      } finally {
        setIsExporting(false);
      }
    }, 50);
  };

  const handleDownloadSinglePhoto = (format: 'png' | 'jpeg') => {
    if (!image) return;
    try {
      const photoCanvas = renderSinglePassportPhoto(
        image,
        crop,
        photoWidthMm,
        photoHeightMm,
        targetDpi
      );

      const ext = format === 'png' ? 'png' : 'jpg';
      const mime = format === 'png' ? 'image/png' : 'image/jpeg';
      const dataUrl = photoCanvas.toDataURL(mime, 0.98);

      const a = document.createElement('a');
      const fileName = `passport-photo-${photoWidthMm}x${photoHeightMm}mm-${targetDpi}dpi.${ext}`;
      a.href = dataUrl;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);

      setExportSuccessMsg(`Downloaded single passport photo (${photoCanvas.width}×${photoCanvas.height} px)`);
    } catch (err) {
      console.error('Single photo export failed:', err);
    }
  };

  return (
    <div className="bg-neutral-900/80 border border-neutral-800 rounded-xl p-4 lg:p-5 flex flex-col gap-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-neutral-200">5. Export High-Resolution Outputs</h2>
          <p className="text-xs text-neutral-400 mt-0.5">
            Download print-ready PDF, full sheet images, or single cropped passport photos.
          </p>
        </div>

        {/* DPI Toggle */}
        <div className="flex items-center gap-1.5 self-start sm:self-auto bg-neutral-950 p-1 rounded-md border border-neutral-800 text-xs">
          <span className="text-neutral-400 text-[11px] px-1.5">Print DPI:</span>
          <button
            type="button"
            onClick={() => setTargetDpi(300)}
            className={`px-2.5 py-1 rounded font-medium transition-colors ${
              targetDpi === 300
                ? 'bg-neutral-800 text-amber-400 shadow-sm'
                : 'text-neutral-400 hover:text-neutral-200'
            }`}
          >
            300 DPI (Standard)
          </button>
          <button
            type="button"
            onClick={() => setTargetDpi(600)}
            className={`px-2.5 py-1 rounded font-medium transition-colors ${
              targetDpi === 600
                ? 'bg-neutral-800 text-amber-400 shadow-sm'
                : 'text-neutral-400 hover:text-neutral-200'
            }`}
            title="Ultra high definition for fine-art or high-end dye-sublimation printers"
          >
            600 DPI (Ultra-HD)
          </button>
        </div>
      </div>

      {/* Export Action Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {/* Card 1: Print-Ready PDF (Primary) */}
        <div className="bg-neutral-950/60 border border-amber-500/30 hover:border-amber-500/50 rounded-lg p-4 flex flex-col justify-between gap-3 transition-colors">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-amber-400 flex items-center gap-1.5">
                <FileText className="w-4 h-4" />
                Print-Ready PDF
              </span>
              <span className="text-[10px] bg-amber-500/10 text-amber-300 border border-amber-500/20 px-1.5 py-0.5 rounded font-mono">
                RECOMMENDED
              </span>
            </div>
            <p className="text-xs text-neutral-400 mt-2">
              Uncompressed vector PDF with exact {layout.paperSize} physical dimensions (210×297mm) and razor-sharp cutting lines.
            </p>
          </div>

          <button
            type="button"
            onClick={handleDownloadPdf}
            disabled={!image || isExporting}
            className="w-full py-2 px-3 bg-amber-400 hover:bg-amber-300 text-neutral-950 font-semibold text-xs rounded-md transition-colors flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed shadow-sm"
          >
            <Download className="w-3.5 h-3.5" />
            <span>{isExporting ? 'Generating PDF...' : `Download PDF (${targetDpi} DPI)`}</span>
          </button>
        </div>

        {/* Card 2: Full Sheet Image (PNG / JPG) */}
        <div className="bg-neutral-950/60 border border-neutral-800 hover:border-neutral-700 rounded-lg p-4 flex flex-col justify-between gap-3 transition-colors">
          <div>
            <span className="text-xs font-semibold text-neutral-200 flex items-center gap-1.5">
              <ImageIcon className="w-4 h-4 text-neutral-400" />
              Full Sheet Image
            </span>
            <p className="text-xs text-neutral-400 mt-2">
              High-resolution raster sheet image for direct photo lab digital printing, minilab kiosks, or dye-sub printers.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => handleDownloadSheetImage('png')}
              disabled={!image || isExporting}
              className="py-1.5 px-2 bg-neutral-800 hover:bg-neutral-750 text-neutral-200 font-medium text-xs rounded-md border border-neutral-700 transition-colors flex items-center justify-center gap-1.5 disabled:opacity-40"
            >
              <Download className="w-3 h-3" />
              <span>Sheet PNG</span>
            </button>
            <button
              type="button"
              onClick={() => handleDownloadSheetImage('jpeg')}
              disabled={!image || isExporting}
              className="py-1.5 px-2 bg-neutral-800 hover:bg-neutral-750 text-neutral-200 font-medium text-xs rounded-md border border-neutral-700 transition-colors flex items-center justify-center gap-1.5 disabled:opacity-40"
            >
              <Download className="w-3 h-3" />
              <span>Sheet JPG</span>
            </button>
          </div>
        </div>

        {/* Card 3: Single Cropped Photo (For Online Forms / Portals) */}
        <div className="bg-neutral-950/60 border border-neutral-800 hover:border-neutral-700 rounded-lg p-4 flex flex-col justify-between gap-3 transition-colors">
          <div>
            <span className="text-xs font-semibold text-neutral-200 flex items-center gap-1.5">
              <FileCheck className="w-4 h-4 text-neutral-400" />
              Single Passport Photo
            </span>
            <p className="text-xs text-neutral-400 mt-2">
              Exact {photoWidthMm}×{photoHeightMm} mm single photo ({Math.round(photoWidthMm / 25.4 * targetDpi)}×{Math.round(photoHeightMm / 25.4 * targetDpi)} px) for online Indian passport or visa uploads.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => handleDownloadSinglePhoto('jpeg')}
              disabled={!image}
              className="py-1.5 px-2 bg-neutral-800 hover:bg-neutral-750 text-neutral-200 font-medium text-xs rounded-md border border-neutral-700 transition-colors flex items-center justify-center gap-1.5 disabled:opacity-40"
            >
              <Download className="w-3 h-3" />
              <span>Single JPG</span>
            </button>
            <button
              type="button"
              onClick={() => handleDownloadSinglePhoto('png')}
              disabled={!image}
              className="py-1.5 px-2 bg-neutral-800 hover:bg-neutral-750 text-neutral-200 font-medium text-xs rounded-md border border-neutral-700 transition-colors flex items-center justify-center gap-1.5 disabled:opacity-40"
            >
              <Download className="w-3 h-3" />
              <span>Single PNG</span>
            </button>
          </div>
        </div>
      </div>

      {/* Success notification banner */}
      {exportSuccessMsg && (
        <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-lg text-emerald-400 text-xs flex items-center gap-2">
          <CheckCircle className="w-4 h-4 shrink-0" />
          <span>{exportSuccessMsg}</span>
        </div>
      )}
    </div>
  );
};
