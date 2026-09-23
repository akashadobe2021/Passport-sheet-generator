import { PaperDimensions, PaperSize, PhotoPreset, SavedTemplate } from '../types/passport';

export const PAPER_SIZES: Record<PaperSize, PaperDimensions> = {
  A4: {
    name: 'A4',
    label: 'A4 Standard Sheet',
    widthMm: 210,
    heightMm: 297,
    description: '210 × 297 mm (Most popular for studio & document printing)'
  },
  '4x6': {
    name: '4x6',
    label: '4×6 Photo Paper (Postcard)',
    widthMm: 101.6,
    heightMm: 152.4,
    description: '101.6 × 152.4 mm (Common minilab dye-sublimation print)'
  },
  '5x7': {
    name: '5x7',
    label: '5×7 Photo Paper (Cabinet)',
    widthMm: 127,
    heightMm: 177.8,
    description: '127 × 177.8 mm (Medium studio print)'
  },
  Letter: {
    name: 'Letter',
    label: 'US Letter Paper',
    widthMm: 215.9,
    heightMm: 279.4,
    description: '215.9 × 279.4 mm (Standard North American sheet)'
  }
};

export const PHOTO_PRESETS: PhotoPreset[] = [
  {
    id: 'in-passport',
    name: 'Indian Passport (Standard)',
    widthMm: 35,
    heightMm: 45,
    country: 'India',
    faceCoverageMin: 0.70,
    faceCoverageMax: 0.80,
    description: 'Official 35×45 mm size with 70–80% face coverage & white background',
    standardBg: 'Pure White'
  },
  {
    id: 'in-visa',
    name: 'Indian Visa / OCI / US Visa',
    widthMm: 50,
    heightMm: 50,
    country: 'India / USA',
    faceCoverageMin: 0.65,
    faceCoverageMax: 0.80,
    description: 'Square 2×2 inch (50×50 mm) for Indian e-Visa, OCI card & US Visa',
    standardBg: 'Pure White'
  },
  {
    id: 'in-pan',
    name: 'Indian PAN Card / NSDL',
    widthMm: 25,
    heightMm: 35,
    country: 'India',
    faceCoverageMin: 0.60,
    faceCoverageMax: 0.75,
    description: '25×35 mm specification for NSDL / UTIITSL PAN card applications',
    standardBg: 'Light or White'
  },
  {
    id: 'in-stamp',
    name: 'Stamp Size Photo',
    widthMm: 20,
    heightMm: 25,
    country: 'India',
    faceCoverageMin: 0.70,
    faceCoverageMax: 0.80,
    description: '20×25 mm compact stamp size for college ID cards & certificates',
    standardBg: 'White or Blue'
  },
  {
    id: 'in-dl',
    name: 'Indian Driving License (Sarathi)',
    widthMm: 35,
    heightMm: 45,
    country: 'India',
    faceCoverageMin: 0.70,
    faceCoverageMax: 0.80,
    description: '35×45 mm portrait photo for Parivahan Sarathi driving license',
    standardBg: 'White'
  },
  {
    id: 'custom',
    name: 'Custom Dimensions',
    widthMm: 35,
    heightMm: 45,
    country: 'Custom',
    faceCoverageMin: 0.70,
    faceCoverageMax: 0.80,
    description: 'Manually specify custom width and height in millimeters',
    standardBg: 'Custom'
  }
];

export const COPY_OPTIONS = [4, 8, 16, 24, 32, 36, 40, 48];

export const DEFAULT_TEMPLATES: SavedTemplate[] = [
  {
    id: 'tmpl-32-a4',
    name: 'Studio Standard 32-Up A4 (35×45mm)',
    widthMm: 35,
    heightMm: 45,
    paperSize: 'A4',
    orientation: 'portrait',
    copies: 32,
    gapMm: 2.5,
    marginMm: 8.0,
    showCutMarks: true,
    showBorder: true,
    dpi: 300,
    isDefault: true,
    createdAt: new Date().toISOString()
  },
  {
    id: 'tmpl-24-a4',
    name: 'Spacious 24-Up A4 (35×45mm)',
    widthMm: 35,
    heightMm: 45,
    paperSize: 'A4',
    orientation: 'portrait',
    copies: 24,
    gapMm: 4.0,
    marginMm: 12.0,
    showCutMarks: true,
    showBorder: true,
    dpi: 300,
    isDefault: false,
    createdAt: new Date().toISOString()
  },
  {
    id: 'tmpl-8-4x6',
    name: 'Minilab 8-Up 4×6 Photo Paper',
    widthMm: 35,
    heightMm: 45,
    paperSize: '4x6',
    orientation: 'landscape',
    copies: 8,
    gapMm: 2.0,
    marginMm: 5.0,
    showCutMarks: true,
    showBorder: true,
    dpi: 300,
    isDefault: false,
    createdAt: new Date().toISOString()
  },
  {
    id: 'tmpl-6-visa',
    name: 'Indian/US Visa 6-Up 4×6 (50×50mm)',
    widthMm: 50,
    heightMm: 50,
    paperSize: '4x6',
    orientation: 'landscape',
    copies: 6,
    gapMm: 3.0,
    marginMm: 6.0,
    showCutMarks: true,
    showBorder: true,
    dpi: 300,
    isDefault: false,
    createdAt: new Date().toISOString()
  }
];
