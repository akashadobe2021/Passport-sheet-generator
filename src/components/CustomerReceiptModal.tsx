import React, { useState, useEffect } from 'react';
import {
  X,
  Printer,
  QrCode,
  Barcode as BarcodeIcon,
  CheckCircle2,
  Clock,
  Phone,
  User,
  Scissors,
  Store
} from 'lucide-react';
import { PrintShopOrder } from '../types/passport';
import { BarcodeService } from '../services/barcodeService';
import { PrintShopService, ShopSettings } from '../services/printShopService';

interface CustomerReceiptModalProps {
  isOpen: boolean;
  onClose: () => void;
  order: PrintShopOrder | null;
}

export const CustomerReceiptModal: React.FC<CustomerReceiptModalProps> = ({
  isOpen,
  onClose,
  order,
}) => {
  const [barcodeDataUrl, setBarcodeDataUrl] = useState<string>('');
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [settings, setSettings] = useState<ShopSettings>(PrintShopService.getSettings());

  useEffect(() => {
    if (!order) return;
    setSettings(PrintShopService.getSettings());

    // Generate Code 128 barcode
    const barcode = BarcodeService.generateBarcodeDataUrl(order.tokenNumber, {
      width: 2,
      height: 48,
      displayValue: true,
      fontSize: 12,
    });
    setBarcodeDataUrl(barcode);

    // Generate QR Code with order details
    const qrPayload = JSON.stringify({
      token: order.tokenNumber,
      customer: order.customerName,
      copies: order.copies,
      service: order.serviceType,
      studio: settings.studioName,
      date: new Date(order.createdAt).toLocaleDateString('en-IN'),
    });

    BarcodeService.generateQrCodeDataUrl(qrPayload, { width: 140 }).then((url) => {
      setQrDataUrl(url);
    });
  }, [order]);

  if (!isOpen || !order) return null;

  const handlePrintSlip = () => {
    window.print();
  };

  const formattedDate = new Date(order.createdAt).toLocaleString('en-IN', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl shadow-2xl max-w-lg w-full max-h-[92vh] flex flex-col overflow-hidden text-zinc-100">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-zinc-800 bg-zinc-950/80">
          <div className="flex items-center gap-2">
            <Store className="w-4 h-4 text-amber-400" />
            <span className="font-semibold text-sm">Customer Job Slip & Barcode Receipt</span>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 rounded-lg transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Printable Ticket Area */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          <div
            id="printable-job-slip"
            className="bg-white text-zinc-950 rounded-lg p-5 shadow-inner border border-zinc-200 font-sans select-text"
          >
            {/* Shop Header */}
            <div className="text-center border-b border-zinc-300 pb-3 mb-3">
              <h1 className="font-bold text-base tracking-tight uppercase">
                {settings.studioName}
              </h1>
              <p className="text-[11px] text-zinc-600 font-mono mt-0.5">{settings.studioAddress}</p>
              <p className="text-[11px] text-zinc-600 font-mono">Phone: {settings.studioPhone}</p>
              <div className="inline-block mt-2 px-2.5 py-0.5 bg-zinc-900 text-white font-mono font-bold text-xs rounded">
                STUDIO JOB TOKEN: {order.tokenNumber}
              </div>
            </div>

            {/* Barcode Strip */}
            <div className="flex flex-col items-center justify-center py-2 bg-zinc-50 border border-dashed border-zinc-300 rounded mb-3">
              {barcodeDataUrl && (
                <img
                  src={barcodeDataUrl}
                  alt={`Barcode ${order.tokenNumber}`}
                  className="h-14 max-w-full object-contain"
                />
              )}
              <span className="text-[10px] text-zinc-500 font-mono tracking-widest mt-0.5">
                ★ SCAN BARCODE AT COUNTER ★
              </span>
            </div>

            {/* Customer & Job Info Grid */}
            <div className="grid grid-cols-2 gap-2 text-xs border-b border-zinc-200 pb-3 mb-3">
              <div>
                <span className="text-[10px] text-zinc-500 uppercase font-semibold block">Customer Name</span>
                <span className="font-bold text-zinc-900 text-sm">{order.customerName}</span>
              </div>
              <div>
                <span className="text-[10px] text-zinc-500 uppercase font-semibold block">Contact Phone</span>
                <span className="font-mono text-zinc-800 font-medium">{order.phone || 'N/A'}</span>
              </div>
              <div>
                <span className="text-[10px] text-zinc-500 uppercase font-semibold block">Service Specification</span>
                <span className="font-semibold text-zinc-800">{order.serviceType}</span>
              </div>
              <div>
                <span className="text-[10px] text-zinc-500 uppercase font-semibold block">Copies & Paper</span>
                <span className="font-bold text-zinc-900">{order.copies} Photos ({order.paperSize})</span>
              </div>
              <div>
                <span className="text-[10px] text-zinc-500 uppercase font-semibold block">Order Placed</span>
                <span className="text-zinc-600 font-mono text-[11px]">{formattedDate}</span>
              </div>
              <div>
                <span className="text-[10px] text-zinc-500 uppercase font-semibold block">Estimated Ready</span>
                <span className="text-emerald-700 font-bold text-[11px]">{order.pickupTime || 'Immediate'}</span>
              </div>
            </div>

            {/* Price & QR Strip */}
            <div className="flex items-center justify-between bg-zinc-100 p-3 rounded border border-zinc-200">
              <div className="space-y-1">
                <div className="text-[10px] text-zinc-500 uppercase font-semibold">Bill Amount</div>
                <div className="text-xl font-black text-zinc-950">
                  {settings.currencySymbol}{order.price}
                </div>
                <span
                  className={`inline-block px-2 py-0.5 text-[10px] font-bold uppercase rounded ${
                    order.paymentStatus === 'paid'
                      ? 'bg-emerald-600 text-white'
                      : 'bg-amber-500 text-zinc-950'
                  }`}
                >
                  Payment: {order.paymentStatus}
                </span>
              </div>

              {qrDataUrl && (
                <div className="text-center">
                  <img src={qrDataUrl} alt="Order QR" className="w-16 h-16 rounded border border-zinc-300" />
                  <span className="text-[8px] text-zinc-500 font-mono block mt-0.5">Quick Verify</span>
                </div>
              )}
            </div>

            {/* Cut Line */}
            <div className="mt-4 pt-3 border-t border-dashed border-zinc-300 flex items-center justify-center gap-1 text-[10px] text-zinc-400 font-mono">
              <Scissors className="w-3 h-3" />
              <span>Detach customer copy · Standard Lab Terms Apply</span>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between px-5 py-3 border-t border-zinc-800 bg-zinc-950/80">
          <div className="text-xs text-zinc-400 font-mono">
            Token: <span className="text-amber-400 font-bold">{order.tokenNumber}</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-3 py-1.5 text-xs text-zinc-300 bg-zinc-800 hover:bg-zinc-700 rounded-lg transition-colors"
            >
              Close
            </button>
            <button
              onClick={handlePrintSlip}
              className="flex items-center gap-1.5 px-4 py-1.5 text-xs font-semibold text-zinc-950 bg-amber-400 hover:bg-amber-300 rounded-lg transition-colors shadow-sm"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print Slip / Receipt</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
