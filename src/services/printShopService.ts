/**
 * Print Shop Order Queue & Token Management Service
 * Phase 5: Print Shop Edition & Barcode Tracking
 */

import { PrintShopOrder, PrinterProfile } from '../types/passport';
import { BarcodeService } from './barcodeService';

const ORDERS_STORAGE_KEY = 'passport_printshop_orders_v1';
const SHOP_SETTINGS_KEY = 'passport_printshop_settings_v1';

export interface ShopSettings {
  studioName: string;
  studioPhone: string;
  studioAddress: string;
  currencySymbol: string;
  autoBarcodeStamp: boolean;
  defaultPaper: '260gsm-glossy' | 'matte-photo' | 'lustre' | 'plain-card';
}

export const DEFAULT_PRINTER_PROFILES: PrinterProfile[] = [
  {
    id: 'epson-l805',
    name: 'Epson EcoTank L805 / L1800 (6-Color)',
    type: 'inkjet',
    recommendedPaper: 'Epson Ultra Glossy 255gsm',
    dpi: 600,
    notes: 'Best for ultra high-definition photo print with smooth skin tones.',
    iccProfileName: 'Epson_Standard_Glossy.icc',
  },
  {
    id: 'canon-g570',
    name: 'Canon PIXMA G570 / G670 (6-Color Red/Grey)',
    type: 'inkjet',
    recommendedPaper: 'Canon Photo Paper Plus Glossy II',
    dpi: 600,
    notes: 'Superior passport color reproduction with dedicated ChromaLife inks.',
    iccProfileName: 'Canon_PP_208.icc',
  },
  {
    id: 'dnp-rx1',
    name: 'DNP DS-RX1HS / DS620 Dye-Sublimation',
    type: 'dyesub',
    recommendedPaper: 'DNP 4x6 / 5x7 Dye-Sub Roll',
    dpi: 300,
    notes: 'Instant dry, 12-second commercial studio passport prints.',
    iccProfileName: 'DNP_HighDensity.icc',
  },
  {
    id: 'fuji-frontier',
    name: 'Fuji Frontier / Noritsu Digital Minilab',
    type: 'minilab',
    recommendedPaper: 'Fujicolor Crystal Archive Type II',
    dpi: 300,
    notes: 'Chemical silver halide wet process for archival 100-year passports.',
    iccProfileName: 'Fuji_Lustre_SRGB.icc',
  },
  {
    id: 'generic-laser',
    name: 'HP / Brother Color Laser / Office Inkjet',
    type: 'laser',
    recommendedPaper: 'Heavy Cardstock 220–250gsm',
    dpi: 300,
    notes: 'Standard office multi-cut sheets.',
    iccProfileName: 'sRGB_IEC61966-2.1.icc',
  },
];

export class PrintShopService {
  /**
   * Load all orders from storage
   */
  static getOrders(): PrintShopOrder[] {
    try {
      const raw = localStorage.getItem(ORDERS_STORAGE_KEY);
      if (!raw) {
        // Return initial sample orders for seamless demo
        const initial = this.getInitialSampleOrders();
        this.saveOrders(initial);
        return initial;
      }
      return JSON.parse(raw);
    } catch (e) {
      console.error('Failed to parse print shop orders:', e);
      return [];
    }
  }

  static saveOrders(orders: PrintShopOrder[]): void {
    try {
      localStorage.setItem(ORDERS_STORAGE_KEY, JSON.stringify(orders));
    } catch (e) {
      console.error('Failed to save print shop orders:', e);
    }
  }

  /**
   * Create a new order with token
   */
  static createOrder(
    data: Omit<PrintShopOrder, 'id' | 'tokenNumber' | 'createdAt'>
  ): PrintShopOrder {
    const orders = this.getOrders();
    const newOrder: PrintShopOrder = {
      ...data,
      id: 'ord_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
      tokenNumber: BarcodeService.generateTokenNumber(),
      createdAt: new Date().toISOString(),
    };

    orders.unshift(newOrder);
    this.saveOrders(orders);
    return newOrder;
  }

  /**
   * Update order status
   */
  static updateOrderStatus(
    orderId: string,
    status: PrintShopOrder['status']
  ): PrintShopOrder | null {
    const orders = this.getOrders();
    const index = orders.findIndex((o) => o.id === orderId);
    if (index === -1) return null;

    orders[index].status = status;
    this.saveOrders(orders);
    return orders[index];
  }

  /**
   * Update order payment
   */
  static updatePaymentStatus(
    orderId: string,
    paymentStatus: PrintShopOrder['paymentStatus']
  ): PrintShopOrder | null {
    const orders = this.getOrders();
    const index = orders.findIndex((o) => o.id === orderId);
    if (index === -1) return null;

    orders[index].paymentStatus = paymentStatus;
    this.saveOrders(orders);
    return orders[index];
  }

  /**
   * Delete an order
   */
  static deleteOrder(orderId: string): void {
    const orders = this.getOrders().filter((o) => o.id !== orderId);
    this.saveOrders(orders);
  }

  /**
   * Get shop settings
   */
  static getSettings(): ShopSettings {
    try {
      const raw = localStorage.getItem(SHOP_SETTINGS_KEY);
      if (raw) return JSON.parse(raw);
    } catch (e) {
      console.error('Failed to read shop settings:', e);
    }
    return {
      studioName: 'Akash Digital Color Lab & Studio',
      studioPhone: '+91 98765 43210',
      studioAddress: 'Shop 4, Main Market, Civil Lines',
      currencySymbol: '₹',
      autoBarcodeStamp: true,
      defaultPaper: '260gsm-glossy',
    };
  }

  static saveSettings(settings: ShopSettings): void {
    localStorage.setItem(SHOP_SETTINGS_KEY, JSON.stringify(settings));
  }

  /**
   * Seed realistic sample orders for Indian Studio demo
   */
  private static getInitialSampleOrders(): PrintShopOrder[] {
    return [
      {
        id: 'ord_sample_1',
        tokenNumber: 'TK-1082',
        customerName: 'Rahul Sharma',
        phone: '+91 98123 45678',
        serviceType: 'Indian Passport (35×45mm · White BG)',
        presetId: 'india_passport',
        copies: 32,
        paperType: '260gsm-glossy',
        paperSize: 'A4',
        price: 120,
        paymentStatus: 'paid',
        status: 'ready',
        notes: 'Urgent passport application - 32 copies needed on A4 sheet',
        createdAt: new Date(Date.now() - 35 * 60 * 1000).toISOString(),
        pickupTime: 'Today 5:00 PM',
      },
      {
        id: 'ord_sample_2',
        tokenNumber: 'TK-1083',
        customerName: 'Priya Patel',
        phone: '+91 97234 56789',
        serviceType: 'US Visa (51×51mm / 2×2 Inch)',
        presetId: 'us_visa',
        copies: 8,
        paperType: '260gsm-glossy',
        paperSize: '4x6',
        price: 150,
        paymentStatus: 'paid',
        status: 'processing',
        notes: 'US Consulate appointment next week, strict white background',
        createdAt: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
        pickupTime: 'Today 6:30 PM',
      },
      {
        id: 'ord_sample_3',
        tokenNumber: 'TK-1084',
        customerName: 'Amit Verma',
        phone: '+91 94111 22334',
        serviceType: 'Schengen Visa (35×45mm · Light Grey BG)',
        presetId: 'schengen_visa',
        copies: 16,
        paperType: 'matte-photo',
        paperSize: 'A4',
        price: 100,
        paymentStatus: 'pending',
        status: 'queued',
        notes: 'Matte paper requested for German Embassy',
        createdAt: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
        pickupTime: 'Tomorrow 11:00 AM',
      },
    ];
  }
}
