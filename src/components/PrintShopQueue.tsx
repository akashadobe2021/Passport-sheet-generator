import React, { useState, useEffect } from 'react';
import {
  Store,
  Plus,
  Search,
  Printer,
  Barcode as BarcodeIcon,
  QrCode,
  Clock,
  CheckCircle2,
  AlertCircle,
  TrendingUp,
  DollarSign,
  ArrowRight,
  Trash2,
  FileText,
  Sliders,
  Check,
  User,
  Phone,
  Layers,
  Sparkles,
  ExternalLink
} from 'lucide-react';
import { PrintShopOrder, PhotoPreset, LayoutConfig } from '../types/passport';
import { PHOTO_PRESETS } from '../constants/presets';
import {
  PrintShopService,
  ShopSettings,
  DEFAULT_PRINTER_PROFILES
} from '../services/printShopService';
import { CustomerReceiptModal } from './CustomerReceiptModal';

interface PrintShopQueueProps {
  onLoadOrderToStudio: (order: PrintShopOrder) => void;
}

export const PrintShopQueue: React.FC<PrintShopQueueProps> = ({
  onLoadOrderToStudio,
}) => {
  const [orders, setOrders] = useState<PrintShopOrder[]>([]);
  const [activeTab, setActiveTab] = useState<'queue' | 'printers' | 'settings'>('queue');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedReceiptOrder, setSelectedReceiptOrder] = useState<PrintShopOrder | null>(null);
  const [isReceiptOpen, setIsReceiptOpen] = useState<boolean>(false);
  const [isNewOrderOpen, setIsNewOrderOpen] = useState<boolean>(false);

  // Shop Settings State
  const [settings, setSettings] = useState<ShopSettings>(PrintShopService.getSettings());
  const [isSettingsSaved, setIsSettingsSaved] = useState<boolean>(false);

  // New Order Form State
  const [newCustomerName, setNewCustomerName] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newPresetId, setNewPresetId] = useState(PHOTO_PRESETS[0].id);
  const [newCopies, setNewCopies] = useState<number>(32);
  const [newPaperSize, setNewPaperSize] = useState<'A4' | '4x6' | '5x7'>('A4');
  const [newPrice, setNewPrice] = useState<number>(100);
  const [newPaymentStatus, setNewPaymentStatus] = useState<'paid' | 'pending'>('paid');
  const [newPickupTime, setNewPickupTime] = useState('In 30 mins');
  const [newNotes, setNewNotes] = useState('');

  const refreshOrders = () => {
    setOrders(PrintShopService.getOrders());
  };

  useEffect(() => {
    refreshOrders();
  }, []);

  const handleCreateOrder = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCustomerName.trim()) return;

    const preset = PHOTO_PRESETS.find((p) => p.id === newPresetId) || PHOTO_PRESETS[0];

    const order = PrintShopService.createOrder({
      customerName: newCustomerName.trim(),
      phone: newPhone.trim(),
      serviceType: `${preset.name} (${preset.widthMm}×${preset.heightMm}mm)`,
      presetId: preset.id,
      copies: newCopies,
      paperType: settings.defaultPaper,
      paperSize: newPaperSize,
      price: Number(newPrice) || 0,
      paymentStatus: newPaymentStatus,
      status: 'queued',
      notes: newNotes,
      pickupTime: newPickupTime,
    });

    refreshOrders();
    setIsNewOrderOpen(false);
    // Reset form
    setNewCustomerName('');
    setNewPhone('');
    setNewNotes('');

    // Open receipt modal automatically
    setSelectedReceiptOrder(order);
    setIsReceiptOpen(true);
  };

  const handleStatusChange = (orderId: string, status: PrintShopOrder['status']) => {
    PrintShopService.updateOrderStatus(orderId, status);
    refreshOrders();
  };

  const handlePaymentToggle = (orderId: string, current: PrintShopOrder['paymentStatus']) => {
    const nextStatus = current === 'paid' ? 'pending' : 'paid';
    PrintShopService.updatePaymentStatus(orderId, nextStatus);
    refreshOrders();
  };

  const handleDeleteOrder = (orderId: string) => {
    if (confirm('Are you sure you want to remove this job token from queue?')) {
      PrintShopService.deleteOrder(orderId);
      refreshOrders();
    }
  };

  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    PrintShopService.saveSettings(settings);
    setIsSettingsSaved(true);
    setTimeout(() => setIsSettingsSaved(false), 2000);
  };

  // Filtered orders
  const filteredOrders = orders.filter((o) => {
    const matchesFilter = filterStatus === 'all' || o.status === filterStatus;
    const matchesSearch =
      o.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      o.tokenNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      o.phone.includes(searchQuery);
    return matchesFilter && matchesSearch;
  });

  // Analytics
  const totalRevenue = orders.reduce((sum, o) => sum + (o.paymentStatus === 'paid' ? o.price : 0), 0);
  const queuedCount = orders.filter((o) => o.status === 'queued').length;
  const readyCount = orders.filter((o) => o.status === 'ready').length;
  const completedCount = orders.filter((o) => o.status === 'delivered').length;

  return (
    <div className="bg-zinc-900/80 border border-zinc-800 rounded-xl p-4 sm:p-6 flex flex-col gap-6 text-zinc-200">
      {/* Top Banner & Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-zinc-800/80 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400">
              <Store className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-zinc-100 flex items-center gap-2">
                <span>Print Shop & Token Tracking Engine</span>
                <span className="text-[11px] font-mono font-semibold px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  PHASE 5 LIVE
                </span>
              </h1>
              <p className="text-xs text-zinc-400 mt-0.5">
                Counter token queue, barcode/QR margin stamps, thermal slips, and studio photo printer spooling.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <button
            onClick={() => setIsNewOrderOpen(true)}
            className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 py-2 text-xs font-semibold text-zinc-950 bg-amber-400 hover:bg-amber-300 rounded-lg transition-colors shadow-sm"
          >
            <Plus className="w-4 h-4" />
            <span>New Customer Token</span>
          </button>
        </div>
      </div>

      {/* Analytics KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-3.5 bg-zinc-950 rounded-xl border border-zinc-800/80 flex flex-col justify-between">
          <span className="text-[11px] text-zinc-400 font-medium flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-amber-400" />
            In Queue
          </span>
          <div className="text-2xl font-bold text-amber-400 mt-1">{queuedCount}</div>
          <span className="text-[10px] text-zinc-500 mt-1">Pending lab processing</span>
        </div>

        <div className="p-3.5 bg-zinc-950 rounded-xl border border-zinc-800/80 flex flex-col justify-between">
          <span className="text-[11px] text-zinc-400 font-medium flex items-center gap-1.5">
            <Printer className="w-3.5 h-3.5 text-sky-400" />
            Ready for Pickup
          </span>
          <div className="text-2xl font-bold text-sky-400 mt-1">{readyCount}</div>
          <span className="text-[10px] text-zinc-500 mt-1">Printed & cut</span>
        </div>

        <div className="p-3.5 bg-zinc-950 rounded-xl border border-zinc-800/80 flex flex-col justify-between">
          <span className="text-[11px] text-zinc-400 font-medium flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            Delivered Today
          </span>
          <div className="text-2xl font-bold text-emerald-400 mt-1">{completedCount}</div>
          <span className="text-[10px] text-zinc-500 mt-1">Completed orders</span>
        </div>

        <div className="p-3.5 bg-zinc-950 rounded-xl border border-zinc-800/80 flex flex-col justify-between">
          <span className="text-[11px] text-zinc-400 font-medium flex items-center gap-1.5">
            <DollarSign className="w-3.5 h-3.5 text-purple-400" />
            Today's Lab Revenue
          </span>
          <div className="text-2xl font-bold text-purple-400 mt-1">
            {settings.currencySymbol}{totalRevenue}
          </div>
          <span className="text-[10px] text-zinc-500 mt-1">From {orders.length} total tokens</span>
        </div>
      </div>

      {/* Sub Navigation */}
      <div className="flex items-center gap-2 border-b border-zinc-800 pb-2">
        <button
          onClick={() => setActiveTab('queue')}
          className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-medium transition-colors ${
            activeTab === 'queue'
              ? 'bg-zinc-800 text-amber-400 font-semibold shadow-sm'
              : 'text-zinc-400 hover:text-zinc-200'
          }`}
        >
          <BarcodeIcon className="w-4 h-4" />
          <span>Active Token Queue ({orders.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('printers')}
          className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-medium transition-colors ${
            activeTab === 'printers'
              ? 'bg-zinc-800 text-amber-400 font-semibold shadow-sm'
              : 'text-zinc-400 hover:text-zinc-200'
          }`}
        >
          <Printer className="w-4 h-4" />
          <span>Printer Profiles & Spooler</span>
        </button>

        <button
          onClick={() => setActiveTab('settings')}
          className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-medium transition-colors ${
            activeTab === 'settings'
              ? 'bg-zinc-800 text-amber-400 font-semibold shadow-sm'
              : 'text-zinc-400 hover:text-zinc-200'
          }`}
        >
          <Sliders className="w-4 h-4" />
          <span>Studio & Barcode Settings</span>
        </button>
      </div>

      {/* TAB 1: ORDER QUEUE */}
      {activeTab === 'queue' && (
        <div className="space-y-4">
          {/* Filter Bar */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="relative w-full sm:w-72">
              <Search className="w-4 h-4 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search token # or customer..."
                className="w-full bg-zinc-950 border border-zinc-800 rounded-lg pl-9 pr-3 py-1.5 text-xs text-zinc-200 placeholder:text-zinc-500 focus:outline-none focus:border-amber-500"
              />
            </div>

            <div className="flex items-center gap-1.5 w-full sm:w-auto overflow-x-auto text-xs">
              {(['all', 'queued', 'processing', 'ready', 'delivered'] as const).map((st) => (
                <button
                  key={st}
                  onClick={() => setFilterStatus(st)}
                  className={`px-3 py-1 rounded-md capitalize transition-colors ${
                    filterStatus === st
                      ? 'bg-zinc-800 text-amber-400 font-semibold'
                      : 'text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  {st}
                </button>
              ))}
            </div>
          </div>

          {/* Orders List / Table */}
          {filteredOrders.length === 0 ? (
            <div className="text-center py-12 bg-zinc-950/60 rounded-xl border border-dashed border-zinc-800">
              <Store className="w-10 h-10 text-zinc-600 mx-auto mb-2 opacity-50" />
              <p className="text-sm font-semibold text-zinc-400">No active job tokens found</p>
              <p className="text-xs text-zinc-500 mt-1">Click "New Customer Token" to add the first client.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3">
              {filteredOrders.map((order) => (
                <div
                  key={order.id}
                  className="bg-zinc-950 border border-zinc-800/80 hover:border-zinc-700/80 rounded-xl p-4 transition-colors flex flex-col md:flex-row items-start md:items-center justify-between gap-4"
                >
                  {/* Token & Customer Info */}
                  <div className="flex items-start gap-3.5">
                    <div className="px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-center min-w-[90px]">
                      <span className="text-[10px] text-zinc-500 uppercase font-mono block">Token</span>
                      <span className="font-mono font-bold text-amber-400 text-sm">{order.tokenNumber}</span>
                    </div>

                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-sm text-zinc-100">{order.customerName}</span>
                        {order.phone && (
                          <span className="text-[11px] text-zinc-400 font-mono flex items-center gap-1">
                            <Phone className="w-3 h-3 text-zinc-500" />
                            {order.phone}
                          </span>
                        )}
                      </div>

                      <div className="text-xs text-zinc-400 flex flex-wrap items-center gap-2">
                        <span className="text-zinc-300 font-medium">{order.serviceType}</span>
                        <span>·</span>
                        <span>{order.copies} Photos ({order.paperSize})</span>
                        <span>·</span>
                        <span className="font-mono text-emerald-400 font-bold">
                          {settings.currencySymbol}{order.price}
                        </span>
                      </div>

                      {order.notes && (
                        <p className="text-[11px] text-zinc-500 italic">“{order.notes}”</p>
                      )}
                    </div>
                  </div>

                  {/* Actions & Status Controls */}
                  <div className="flex flex-wrap items-center gap-2 w-full md:w-auto justify-end border-t md:border-t-0 pt-3 md:pt-0 border-zinc-900">
                    {/* Payment badge */}
                    <button
                      onClick={() => handlePaymentToggle(order.id, order.paymentStatus)}
                      className={`text-[11px] font-mono px-2.5 py-1 rounded-md font-semibold border transition-colors ${
                        order.paymentStatus === 'paid'
                          ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                          : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                      }`}
                      title="Click to toggle Paid/Pending"
                    >
                      {order.paymentStatus.toUpperCase()}
                    </button>

                    {/* Status Dropdown */}
                    <select
                      value={order.status}
                      onChange={(e) => handleStatusChange(order.id, e.target.value as any)}
                      className="bg-zinc-900 border border-zinc-800 rounded-md px-2 py-1 text-xs text-zinc-200 focus:outline-none focus:border-amber-500 capitalize"
                    >
                      <option value="queued">Queued</option>
                      <option value="processing">Processing</option>
                      <option value="ready">Ready to Print</option>
                      <option value="delivered">Delivered</option>
                    </select>

                    {/* Print Slip Button */}
                    <button
                      onClick={() => {
                        setSelectedReceiptOrder(order);
                        setIsReceiptOpen(true);
                      }}
                      className="flex items-center gap-1 px-2.5 py-1 text-xs text-zinc-300 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 rounded-md transition-colors"
                      title="Print Customer Barcode Receipt"
                    >
                      <BarcodeIcon className="w-3.5 h-3.5 text-amber-400" />
                      <span>Slip</span>
                    </button>

                    {/* 1-Click Load into Sheet Studio */}
                    <button
                      onClick={() => onLoadOrderToStudio(order)}
                      className="flex items-center gap-1.5 px-3 py-1 text-xs font-semibold text-zinc-950 bg-amber-400 hover:bg-amber-300 rounded-md transition-colors shadow-sm"
                      title="Load this token and photo settings directly into the Studio Sheet Generator"
                    >
                      <span>Open in Studio</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>

                    {/* Delete */}
                    <button
                      onClick={() => handleDeleteOrder(order.id)}
                      className="p-1 text-zinc-500 hover:text-rose-400 rounded transition-colors"
                      title="Delete Order"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: PRINTER HARDWARE PROFILES */}
      {activeTab === 'printers' && (
        <div className="space-y-4">
          <div className="bg-zinc-950 p-4 rounded-xl border border-zinc-800">
            <h3 className="text-sm font-semibold text-zinc-100 flex items-center gap-2">
              <Printer className="w-4 h-4 text-sky-400" />
              Verified Studio Photo Printers & ICC Color Guides
            </h3>
            <p className="text-xs text-zinc-400 mt-1">
              Calibrated paper settings and DPI benchmarks for commercial passport photo labs in India.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            {DEFAULT_PRINTER_PROFILES.map((profile) => (
              <div
                key={profile.id}
                className="bg-zinc-950 p-4 rounded-xl border border-zinc-800 flex flex-col justify-between gap-3"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-sm text-zinc-100">{profile.name}</span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-sky-500/10 text-sky-400 border border-sky-500/20 uppercase font-bold">
                      {profile.type} · {profile.dpi} DPI
                    </span>
                  </div>

                  <div className="mt-2 space-y-1 text-xs">
                    <div className="text-zinc-300">
                      <span className="text-zinc-500">Recommended Paper:</span> {profile.recommendedPaper}
                    </div>
                    {profile.iccProfileName && (
                      <div className="text-zinc-400 font-mono text-[11px]">
                        <span className="text-zinc-500 font-sans">Color Profile:</span> {profile.iccProfileName}
                      </div>
                    )}
                    <p className="text-zinc-400 mt-2 text-[11px] leading-relaxed">{profile.notes}</p>
                  </div>
                </div>

                <div className="pt-2 border-t border-zinc-900 flex items-center justify-between text-[11px] text-zinc-500">
                  <span>Pass-thru Margin: 3.0mm</span>
                  <span className="text-emerald-400 font-medium">Verified Compatibility</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 3: STUDIO & BARCODE SETTINGS */}
      {activeTab === 'settings' && (
        <form onSubmit={handleSaveSettings} className="space-y-4 max-w-xl">
          <div className="bg-zinc-950 p-5 rounded-xl border border-zinc-800 space-y-4">
            <h3 className="text-sm font-semibold text-zinc-100 flex items-center gap-2">
              <Sliders className="w-4 h-4 text-amber-400" />
              Studio Details & Barcode Header Stamp
            </h3>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-zinc-400 mb-1">Studio / Photo Lab Name</label>
                <input
                  type="text"
                  value={settings.studioName}
                  onChange={(e) => setSettings({ ...settings, studioName: e.target.value })}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-zinc-100 focus:outline-none focus:border-amber-500"
                  required
                />
              </div>

              <div>
                <label className="block text-zinc-400 mb-1">Studio Contact Phone</label>
                <input
                  type="text"
                  value={settings.studioPhone}
                  onChange={(e) => setSettings({ ...settings, studioPhone: e.target.value })}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-zinc-100 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-zinc-400 mb-1">Studio Address / Location</label>
                <input
                  type="text"
                  value={settings.studioAddress}
                  onChange={(e) => setSettings({ ...settings, studioAddress: e.target.value })}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-zinc-100 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-zinc-400 mb-1">Currency Symbol</label>
                  <input
                    type="text"
                    value={settings.currencySymbol}
                    onChange={(e) => setSettings({ ...settings, currencySymbol: e.target.value })}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-zinc-100 focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-zinc-400 mb-1">Default Photo Paper</label>
                  <select
                    value={settings.defaultPaper}
                    onChange={(e) => setSettings({ ...settings, defaultPaper: e.target.value as any })}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-zinc-100 focus:outline-none focus:border-amber-500"
                  >
                    <option value="260gsm-glossy">260 GSM Ultra Glossy</option>
                    <option value="matte-photo">230 GSM Matte</option>
                    <option value="lustre">260 GSM Lustre / Silk</option>
                    <option value="plain-card">Heavy Cardstock</option>
                  </select>
                </div>
              </div>

              <div className="pt-2">
                <label className="flex items-center gap-2 cursor-pointer text-zinc-300">
                  <input
                    type="checkbox"
                    checked={settings.autoBarcodeStamp}
                    onChange={(e) => setSettings({ ...settings, autoBarcodeStamp: e.target.checked })}
                    className="rounded border-zinc-700 text-amber-500 focus:ring-0 w-4 h-4 bg-zinc-900"
                  />
                  <span>Automatically stamp Code-128 Barcode & Order Token on PDF/Sheet margins</span>
                </label>
              </div>
            </div>

            <div className="pt-3 border-t border-zinc-800 flex items-center justify-between">
              {isSettingsSaved ? (
                <span className="text-xs text-emerald-400 flex items-center gap-1 font-medium">
                  <Check className="w-4 h-4" />
                  Settings saved successfully!
                </span>
              ) : <div />}

              <button
                type="submit"
                className="px-4 py-2 bg-amber-400 hover:bg-amber-300 text-zinc-950 text-xs font-semibold rounded-lg transition-colors shadow-sm"
              >
                Save Settings
              </button>
            </div>
          </div>
        </form>
      )}

      {/* NEW ORDER MODAL */}
      {isNewOrderOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl shadow-2xl max-w-md w-full p-5 text-zinc-100">
            <h2 className="text-base font-bold text-zinc-100 flex items-center gap-2 mb-4">
              <Plus className="w-4 h-4 text-amber-400" />
              Create New Customer Job Token
            </h2>

            <form onSubmit={handleCreateOrder} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-zinc-400 mb-1 font-medium">Customer Full Name *</label>
                <input
                  type="text"
                  value={newCustomerName}
                  onChange={(e) => setNewCustomerName(e.target.value)}
                  placeholder="e.g. Ramesh Kumar"
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-zinc-100 focus:outline-none focus:border-amber-500"
                  required
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-zinc-400 mb-1 font-medium">Mobile Phone (Optional)</label>
                <input
                  type="text"
                  value={newPhone}
                  onChange={(e) => setNewPhone(e.target.value)}
                  placeholder="e.g. +91 98765 43210"
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-zinc-100 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-zinc-400 mb-1 font-medium">Photo Specification</label>
                <select
                  value={newPresetId}
                  onChange={(e) => setNewPresetId(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-zinc-100 focus:outline-none focus:border-amber-500"
                >
                  {PHOTO_PRESETS.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.widthMm}×{p.heightMm}mm)
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-zinc-400 mb-1 font-medium">Number of Copies</label>
                  <select
                    value={newCopies}
                    onChange={(e) => setNewCopies(Number(e.target.value))}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-zinc-100 focus:outline-none focus:border-amber-500"
                  >
                    <option value={4}>4 Copies</option>
                    <option value={8}>8 Copies (Studio Standard)</option>
                    <option value={16}>16 Copies</option>
                    <option value={24}>24 Copies</option>
                    <option value={32}>32 Copies (A4 Full Sheet)</option>
                    <option value={40}>40 Copies</option>
                  </select>
                </div>

                <div>
                  <label className="block text-zinc-400 mb-1 font-medium">Sheet Size</label>
                  <select
                    value={newPaperSize}
                    onChange={(e) => setNewPaperSize(e.target.value as any)}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-zinc-100 focus:outline-none focus:border-amber-500"
                  >
                    <option value="A4">A4 (210×297mm)</option>
                    <option value="4x6">4×6 Inch Photo</option>
                    <option value="5x7">5×7 Inch Photo</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-zinc-400 mb-1 font-medium">Price ({settings.currencySymbol})</label>
                  <input
                    type="number"
                    value={newPrice}
                    onChange={(e) => setNewPrice(Number(e.target.value))}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-zinc-100 focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-zinc-400 mb-1 font-medium">Payment Status</label>
                  <select
                    value={newPaymentStatus}
                    onChange={(e) => setNewPaymentStatus(e.target.value as any)}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-zinc-100 focus:outline-none focus:border-amber-500"
                  >
                    <option value="paid">Paid</option>
                    <option value="pending">Pending at Counter</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-zinc-400 mb-1 font-medium">Customer Notes / Urgency</label>
                <input
                  type="text"
                  value={newNotes}
                  onChange={(e) => setNewNotes(e.target.value)}
                  placeholder="e.g. White background, urgent delivery in 20 mins"
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-zinc-100 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="pt-3 border-t border-zinc-800 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsNewOrderOpen(false)}
                  className="px-3.5 py-2 text-zinc-300 bg-zinc-800 hover:bg-zinc-700 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-amber-400 hover:bg-amber-300 text-zinc-950 font-semibold rounded-lg transition-colors shadow-sm"
                >
                  Create & Print Token Slip
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Customer Receipt & Barcode Slip Modal */}
      <CustomerReceiptModal
        isOpen={isReceiptOpen}
        onClose={() => setIsReceiptOpen(false)}
        order={selectedReceiptOrder}
      />
    </div>
  );
};
