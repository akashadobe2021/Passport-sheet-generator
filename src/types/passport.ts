/**
 * Types and interfaces for Passport Sheet Generator
 */

export type PaperSize = 'A4' | '4x6' | '5x7' | 'Letter';
export type Orientation = 'portrait' | 'landscape';

export interface PaperDimensions {
  name: PaperSize;
  label: string;
  widthMm: number;
  heightMm: number;
  description: string;
}

export interface PhotoPreset {
  id: string;
  name: string;
  widthMm: number;
  heightMm: number;
  country: string;
  faceCoverageMin: number; // e.g., 0.70 for 70%
  faceCoverageMax: number; // e.g., 0.80 for 80%
  description: string;
  standardBg: string; // e.g., 'White'
}

export interface CropState {
  zoom: number; // 0.5 to 4.0
  panX: number; // in pixels
  panY: number; // in pixels
  rotation: number; // degrees -180 to 180
  bgColor: 'original' | 'transparent' | '#FFFFFF' | '#F8FAFC' | '#D0E4F7' | '#E2E8F0' | string;
  bgTolerance: number; // 1 to 80
  bgFeather: number; // 0 to 10
}

export interface LayoutConfig {
  paperSize: PaperSize;
  orientation: Orientation;
  copies: number;
  marginMm: number;
  gapMm: number;
  showCutMarks: boolean;
  cutMarkStyle: 'ticks' | 'dashed' | 'solid';
  showBorder: boolean;
  borderColor: string;
  borderWidthMm: number;
  includeHeader: boolean;
  headerText: string;
  includeBarcodeStamp?: boolean;
  orderToken?: string;
  customerName?: string;
  studioName?: string;
  barcodeType?: 'code128' | 'qr';
}

export interface PrintShopOrder {
  id: string;
  tokenNumber: string; // e.g. "TK-1048"
  customerName: string;
  phone: string;
  serviceType: string; // e.g. "Indian Passport (35×45mm)"
  presetId: string;
  copies: number;
  paperType: '260gsm-glossy' | 'matte-photo' | 'lustre' | 'plain-card';
  paperSize: PaperSize;
  price: number;
  paymentStatus: 'paid' | 'pending' | 'partial';
  status: 'queued' | 'processing' | 'ready' | 'delivered';
  notes?: string;
  createdAt: string;
  pickupTime?: string;
  imageDataUrl?: string;
  appliedCrop?: CropState;
}

export interface PrinterProfile {
  id: string;
  name: string;
  type: 'inkjet' | 'dyesub' | 'laser' | 'minilab';
  recommendedPaper: string;
  dpi: 300 | 600;
  notes: string;
  iccProfileName?: string;
}

export interface QualityValidation {
  effectiveDpi: number;
  targetDpi: number;
  qualityLevel: 'critical' | 'warning' | 'good' | 'excellent';
  warningMessage?: string;
  cropPixels: { width: number; height: number };
  originalPixels: { width: number; height: number };
}

export interface ExportHistoryRecord {
  id: string;
  fileName: string;
  exportType: 'pdf' | 'png' | 'jpg' | 'tiff';
  copiesCount: number;
  paperSize: PaperSize;
  dpi: number;
  fileSizeKb?: number;
  createdAt: string;
  dataUrl?: string;
}

export interface SavedTemplate {
  id: string;
  name: string;
  widthMm: number;
  heightMm: number;
  paperSize: PaperSize;
  orientation: Orientation;
  copies: number;
  gapMm: number;
  marginMm: number;
  showCutMarks: boolean;
  showBorder: boolean;
  dpi: number;
  isDefault?: boolean;
  createdAt: string;
}

export interface AppSettings {
  defaultDPI: 300 | 600;
  defaultCopies: number;
  defaultPaperSize: PaperSize;
  defaultTemplateId: string;
  autoFaceDetect: boolean;
  showGuides: boolean;
  studioName: string;
}

export interface FaceDetectionBox {
  x: number;
  y: number;
  width: number;
  height: number;
  confidence: number;
  eyes?: { left: { x: number; y: number }; right: { x: number; y: number } };
  chin?: { x: number; y: number };
  crown?: { x: number; y: number };
}
