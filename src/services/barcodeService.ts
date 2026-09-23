/**
 * Barcode and QR Code Generation Service for Print Shop Tracking
 * Generates high-resolution Code-128 barcodes and QR codes for sheet margins and customer slips.
 */

import JsBarcode from 'jsbarcode';
import QRCode from 'qrcode';

export class BarcodeService {
  /**
   * Generate next formatted token string, e.g., "TK-1082"
   */
  static generateTokenNumber(): string {
    const randomNum = Math.floor(1000 + Math.random() * 9000);
    return `TK-${randomNum}`;
  }

  /**
   * Render a Code-128 barcode as a base64 PNG data URL
   */
  static generateBarcodeDataUrl(
    text: string,
    options: {
      width?: number;
      height?: number;
      displayValue?: boolean;
      fontSize?: number;
      lineColor?: string;
      background?: string;
    } = {}
  ): string {
    try {
      const canvas = document.createElement('canvas');
      JsBarcode(canvas, text, {
        format: 'CODE128',
        width: options.width ?? 2,
        height: options.height ?? 40,
        displayValue: options.displayValue ?? true,
        fontSize: options.fontSize ?? 12,
        font: 'monospace',
        lineColor: options.lineColor ?? '#000000',
        background: options.background ?? '#FFFFFF',
        margin: 4,
      });
      return canvas.toDataURL('image/png');
    } catch (err) {
      console.error('Failed to generate Code128 barcode:', err);
      return '';
    }
  }

  /**
   * Render a QR Code as a base64 PNG data URL
   */
  static async generateQrCodeDataUrl(
    text: string,
    options: {
      width?: number;
      margin?: number;
      color?: { dark: string; light: string };
    } = {}
  ): Promise<string> {
    try {
      return await QRCode.toDataURL(text, {
        width: options.width ?? 120,
        margin: options.margin ?? 1,
        color: {
          dark: options.color?.dark ?? '#000000',
          light: options.color?.light ?? '#FFFFFF',
        },
      });
    } catch (err) {
      console.error('Failed to generate QR code:', err);
      return '';
    }
  }

  /**
   * Synchronously draw barcode onto a 2D canvas context at specified coordinates
   */
  static drawBarcodeToCanvas(
    ctx: CanvasRenderingContext2D,
    text: string,
    x: number,
    y: number,
    targetWidthPx: number,
    targetHeightPx: number,
    includeText: boolean = true
  ) {
    try {
      const tempCanvas = document.createElement('canvas');
      JsBarcode(tempCanvas, text, {
        format: 'CODE128',
        width: 2,
        height: Math.max(24, Math.round(targetHeightPx * 0.7)),
        displayValue: includeText,
        fontSize: 10,
        font: 'monospace',
        margin: 2,
        background: '#FFFFFF',
        lineColor: '#000000',
      });

      ctx.drawImage(tempCanvas, x, y, targetWidthPx, targetHeightPx);
    } catch (err) {
      console.error('Failed to draw barcode to canvas:', err);
    }
  }
}
