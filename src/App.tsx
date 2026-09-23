/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Header } from './components/Header';
import { StudioSidebar } from './components/StudioSidebar';
import { StudioViewport } from './components/StudioViewport';
import { CropFocusView } from './components/CropFocusView';
import { TemplateManager } from './components/TemplateManager';
import { HistorySection } from './components/HistorySection';
import { DocsArchitecture } from './components/DocsArchitecture';
import { ServerConnectionModal } from './components/ServerConnectionModal';
import { PrintShopQueue } from './components/PrintShopQueue';
import {
  CropState,
  LayoutConfig,
  PhotoPreset,
  QualityValidation,
  SavedTemplate,
  PrintShopOrder,
} from './types/passport';
import { ServerStatusResponse } from './types/serverStatus';
import { PHOTO_PRESETS, PAPER_SIZES } from './constants/presets';
import {
  calculatePrintQuality,
  calculateSheetLayout,
  renderSinglePassportPhoto,
  renderCompleteSheetCanvas,
} from './services/imageProcessing';
import { generateSamplePassportPhoto } from './utils/samplePhoto';
import { generatePassportSheetPdf, downloadPdfBlob } from './services/pdfService';
import { StorageService } from './services/storageService';
import { fetchServerStatus } from './services/serverStatusService';
import { PrintShopService } from './services/printShopService';
import confetti from 'canvas-confetti';

export default function App() {
  const [activeView, setActiveView] = useState<
    'studio' | 'crop-focus' | 'orders' | 'templates' | 'history' | 'docs'
  >('studio');

  // Loaded photograph state
  const [image, setImage] = useState<HTMLImageElement | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [fileSizeKb, setFileSizeKb] = useState<number | null>(null);
  const [cutoutImg, setCutoutImg] = useState<HTMLImageElement | null>(null);

  // Server & Cloudinary Connection Status
  const [serverStatus, setServerStatus] = useState<ServerStatusResponse | null>(null);
  const [isStatusLoading, setIsStatusLoading] = useState<boolean>(false);
  const [isServerModalOpen, setIsServerModalOpen] = useState<boolean>(false);

  const checkConnection = useCallback(async () => {
    setIsStatusLoading(true);
    try {
      const status = await fetchServerStatus();
      setServerStatus(status);
    } catch (err) {
      console.error('Failed to check server connection status:', err);
    } finally {
      setIsStatusLoading(false);
    }
  }, []);

  // Poll server connection on initial load
  useEffect(() => {
    checkConnection();
  }, [checkConnection]);

  // Selected Photo Preset
  const [selectedPreset, setSelectedPreset] = useState<PhotoPreset>(PHOTO_PRESETS[0]);
  const [customWidthMm, setCustomWidthMm] = useState<number>(35);
  const [customHeightMm, setCustomHeightMm] = useState<number>(45);

  // Crop State
  const [crop, setCrop] = useState<CropState>({
    zoom: 1.0,
    panX: 0,
    panY: 0,
    rotation: 0,
    bgColor: 'original',
    bgTolerance: 25,
    bgFeather: 2,
  });

  const [showGuides, setShowGuides] = useState(true);

  // Layout Configuration
  const [layout, setLayout] = useState<LayoutConfig>({
    paperSize: 'A4',
    orientation: 'portrait',
    copies: 32,
    marginMm: 8.0,
    gapMm: 2.5,
    showCutMarks: true,
    cutMarkStyle: 'ticks',
    showBorder: true,
    borderColor: '#CBD5E1',
    borderWidthMm: 0.2,
    includeHeader: false,
    headerText: 'Indian Passport 35×45mm · 32 Copies · Studio Standard',
  });

  const [targetDpi, setTargetDpi] = useState<300 | 600>(300);
  const [isExporting, setIsExporting] = useState(false);

  // Load sample image on initial mount
  useEffect(() => {
    const sampleDataUrl = generateSamplePassportPhoto();
    const img = new Image();
    img.onload = () => {
      setImage(img);
      setCutoutImg(null);
      setFileName('sample-indian-passport-photo.jpg');
      setFileSizeKb(184);
    };
    img.src = sampleDataUrl;
  }, []);

  const photoWidthMm = selectedPreset.id === 'custom' ? customWidthMm : selectedPreset.widthMm;
  const photoHeightMm = selectedPreset.id === 'custom' ? customHeightMm : selectedPreset.heightMm;

  // Single Cropped Photo Canvas for Live Preview & PDF generation
  const singlePhotoCanvas = useMemo(() => {
    if (!image) return null;
    return renderSinglePassportPhoto(image, crop, photoWidthMm, photoHeightMm, 300, cutoutImg);
  }, [image, crop, photoWidthMm, photoHeightMm, cutoutImg]);

  // Quality / DPI calculation
  const quality: QualityValidation | null = useMemo(() => {
    if (!image) return null;
    return calculatePrintQuality(image, crop, photoWidthMm, photoHeightMm, targetDpi);
  }, [image, crop, photoWidthMm, photoHeightMm, targetDpi]);

  // Max copies possible on sheet
  const paper = PAPER_SIZES[layout.paperSize];
  const isLandscape = layout.orientation === 'landscape';
  const paperW = isLandscape ? paper.heightMm : paper.widthMm;
  const paperH = isLandscape ? paper.widthMm : paper.heightMm;
  const sheetGrid = useMemo(() => {
    return calculateSheetLayout(
      paperW,
      paperH,
      photoWidthMm,
      photoHeightMm,
      layout.copies,
      layout.marginMm,
      layout.gapMm
    );
  }, [paperW, paperH, photoWidthMm, photoHeightMm, layout.copies, layout.marginMm, layout.gapMm]);

  const handleImageLoaded = (img: HTMLImageElement, name: string, sizeKb: number) => {
    setImage(img);
    setCutoutImg(null);
    setFileName(name);
    setFileSizeKb(sizeKb);
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

  const handleApplyTemplate = (tmpl: SavedTemplate) => {
    const preset = PHOTO_PRESETS.find(
      (p) => p.widthMm === tmpl.widthMm && p.heightMm === tmpl.heightMm
    );
    if (preset) {
      setSelectedPreset(preset);
    } else {
      setSelectedPreset(PHOTO_PRESETS.find((p) => p.id === 'custom')!);
      setCustomWidthMm(tmpl.widthMm);
      setCustomHeightMm(tmpl.heightMm);
    }

    setLayout((prev) => ({
      ...prev,
      paperSize: tmpl.paperSize,
      orientation: tmpl.orientation,
      copies: tmpl.copies,
      gapMm: tmpl.gapMm,
      marginMm: tmpl.marginMm,
      showCutMarks: tmpl.showCutMarks,
      showBorder: tmpl.showBorder,
    }));

    setActiveView('studio');
  };

  const triggerConfetti = () => {
    try {
      confetti({ particleCount: 50, spread: 60, origin: { y: 0.85 } });
    } catch {
      // ignore
    }
  };

  // Quick PDF export from header or sidebar
  const handleQuickExport = async () => {
    if (!image || !singlePhotoCanvas) return;
    setIsExporting(true);
    try {
      const highResPhoto = renderSinglePassportPhoto(
        image,
        crop,
        photoWidthMm,
        photoHeightMm,
        targetDpi,
        cutoutImg
      );
      const pdfBytes = await generatePassportSheetPdf(
        highResPhoto,
        photoWidthMm,
        photoHeightMm,
        layout,
        targetDpi
      );
      const name = `passport-sheet-${layout.paperSize.toLowerCase()}-${layout.copies}copies-${targetDpi}dpi.pdf`;
      downloadPdfBlob(pdfBytes, name);

      StorageService.recordExport({
        fileName: name,
        exportType: 'pdf',
        copiesCount: layout.copies,
        paperSize: layout.paperSize,
        dpi: targetDpi,
        fileSizeKb: Math.round(pdfBytes.byteLength / 1024),
      });

      triggerConfetti();
    } catch (err) {
      console.error(err);
      alert('PDF generation error.');
    } finally {
      setIsExporting(false);
    }
  };

  const handleDownloadSheetImage = (format: 'png' | 'jpeg') => {
    if (!image) return;
    setIsExporting(true);
    setTimeout(() => {
      try {
        const photoCanvas = renderSinglePassportPhoto(
          image,
          crop,
          photoWidthMm,
          photoHeightMm,
          targetDpi,
          cutoutImg
        );

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
            copiesCount: initialGrid.totalPages > 1 ? layout.copies : layout.copies,
            paperSize: layout.paperSize,
            dpi: targetDpi,
            fileSizeKb: Math.round(dataUrl.length * 0.75 / 1024),
          });
        }

        triggerConfetti();
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
        targetDpi,
        cutoutImg
      );
      const ext = format === 'png' ? 'png' : 'jpg';
      const mime = format === 'png' ? 'image/png' : 'image/jpeg';
      const dataUrl = photoCanvas.toDataURL(mime, 0.98);

      const a = document.createElement('a');
      const fileName = `passport-single-${photoWidthMm}x${photoHeightMm}mm-${targetDpi}dpi.${ext}`;
      a.href = dataUrl;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);

      StorageService.recordExport({
        fileName,
        exportType: ext as any,
        copiesCount: 1,
        paperSize: 'A4',
        dpi: targetDpi,
        fileSizeKb: Math.round(dataUrl.length * 0.75 / 1024),
      });

      triggerConfetti();
    } catch (err) {
      console.error('Single photo export failed:', err);
    }
  };

  const handleBrowserPrint = () => {
    window.print();
  };

  const handleLoadOrderToStudio = (order: PrintShopOrder) => {
    // 1. Find matching preset
    const preset = PHOTO_PRESETS.find((p) => p.id === order.presetId) || PHOTO_PRESETS[0];
    setSelectedPreset(preset);

    // 2. Configure Layout with Barcode Tracking Stamp
    setLayout((prev) => ({
      ...prev,
      paperSize: order.paperSize,
      copies: order.copies,
      includeBarcodeStamp: true,
      orderToken: order.tokenNumber,
      customerName: order.customerName,
      studioName: PrintShopService.getSettings().studioName,
    }));

    // 3. Mark status as processing if it was queued
    if (order.status === 'queued') {
      PrintShopService.updateOrderStatus(order.id, 'processing');
    }

    // 4. Switch to Sheet Studio
    setActiveView('studio');
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col font-sans antialiased selection:bg-amber-400 selection:text-zinc-950">
      {/* Universal Top Header */}
      <Header
        activeView={activeView}
        setActiveView={setActiveView}
        hasImage={!!image}
        quality={quality}
        targetDpi={targetDpi}
        setTargetDpi={setTargetDpi}
      />

      {/* Main Studio Area */}
      <main className="flex-1 max-w-[1600px] w-full mx-auto p-3 sm:p-5 lg:p-6 flex flex-col">
        {/* VIEW 1: STUDIO WORKSPACE (Split 2-Column: Inspector Sidebar + Live Sheet Viewport) */}
        {activeView === 'studio' && (
          <div className="flex-1 flex flex-col lg:flex-row gap-5 items-stretch min-h-0">
            {/* Left Studio Inspector Sidebar */}
            <StudioSidebar
              image={image}
              fileName={fileName}
              fileSizeKb={fileSizeKb}
              quality={quality}
              crop={crop}
              setCrop={setCrop}
              selectedPreset={selectedPreset}
              setSelectedPreset={setSelectedPreset}
              customWidthMm={customWidthMm}
              setCustomWidthMm={setCustomWidthMm}
              customHeightMm={customHeightMm}
              setCustomHeightMm={setCustomHeightMm}
              layout={layout}
              setLayout={setLayout}
              maxPossibleCopies={sheetGrid.totalPositions}
              showGuides={showGuides}
              setShowGuides={setShowGuides}
              onImageLoaded={handleImageLoaded}
              onOpenCropFocus={() => setActiveView('crop-focus')}
              onDownloadPdf={handleQuickExport}
              onDownloadImage={handleDownloadSheetImage}
              onDownloadSingle={handleDownloadSinglePhoto}
              isExporting={isExporting}
              targetDpi={targetDpi}
              cutoutImg={cutoutImg}
              setCutoutImg={setCutoutImg}
              serverStatus={serverStatus}
              onOpenServerStatusModal={() => setIsServerModalOpen(true)}
            />

            {/* Right Centerpiece: High-Fidelity Sheet Viewport */}
            <StudioViewport
              singlePhotoCanvas={singlePhotoCanvas}
              selectedPreset={selectedPreset}
              customWidthMm={customWidthMm}
              customHeightMm={customHeightMm}
              layout={layout}
              targetDpi={targetDpi}
              onDownloadPdf={handleQuickExport}
              onPrint={handleBrowserPrint}
              onOpenCropFocus={() => setActiveView('crop-focus')}
              isExporting={isExporting}
            />
          </div>
        )}

        {/* VIEW 2: DEDICATED FACE & CROP FOCUS EDITOR */}
        {activeView === 'crop-focus' && (
          <CropFocusView
            image={image}
            crop={crop}
            setCrop={setCrop}
            selectedPreset={selectedPreset}
            customWidthMm={customWidthMm}
            customHeightMm={customHeightMm}
            showGuides={showGuides}
            setShowGuides={setShowGuides}
            onReturnToStudio={() => setActiveView('studio')}
            cutoutImg={cutoutImg}
            setCutoutImg={setCutoutImg}
            serverStatus={serverStatus}
            onOpenServerStatusModal={() => setIsServerModalOpen(true)}
          />
        )}

        {/* VIEW 3: PRINT SHOP & TOKEN ORDERS (PHASE 5) */}
        {activeView === 'orders' && (
          <PrintShopQueue onLoadOrderToStudio={handleLoadOrderToStudio} />
        )}

        {/* VIEW 4: TEMPLATES */}
        {activeView === 'templates' && (
          <TemplateManager
            currentLayout={layout}
            photoPreset={selectedPreset}
            customWidthMm={customWidthMm}
            customHeightMm={customHeightMm}
            onApplyTemplate={handleApplyTemplate}
          />
        )}

        {/* VIEW 5: EXPORT HISTORY */}
        {activeView === 'history' && <HistorySection />}

        {/* VIEW 6: TECHNICAL DOCS & ARCHITECTURE */}
        {activeView === 'docs' && <DocsArchitecture />}
      </main>

      {/* Diagnostics & Connection Status Modal */}
      <ServerConnectionModal
        isOpen={isServerModalOpen}
        onClose={() => setIsServerModalOpen(false)}
        status={serverStatus}
        isLoading={isStatusLoading}
        onRefresh={checkConnection}
      />

      {/* Minimal Studio Status Footer */}
      <footer className="border-t border-zinc-800/60 py-2.5 px-4 lg:px-6 bg-zinc-950 text-xs text-zinc-500 no-print">
        <div className="max-w-[1600px] mx-auto flex flex-col sm:flex-row items-center justify-between gap-2 text-center sm:text-left">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-zinc-300">Passport Sheet Studio</span>
            <span>·</span>
            <span>Indian Passport Standard (35×45mm · 70–80% Head Fit)</span>
          </div>
          <div className="flex items-center gap-3 text-zinc-400 font-mono text-[11px]">
            <span>AI Neural Portrait Segmentation</span>
            <span>·</span>
            <span>Uncompressed Vector PDF</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
