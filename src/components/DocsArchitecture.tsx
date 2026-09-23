import React, { useState } from 'react';
import {
  BookOpen,
  Layers,
  Database,
  Terminal,
  Cpu,
  GitBranch,
  Calendar,
  CheckCircle2,
  Copy,
  Check
} from 'lucide-react';

export const DocsArchitecture: React.FC = () => {
  const [activeSubTab, setActiveSubTab] = useState<
    'arch' | 'db' | 'api' | 'workflow' | 'install' | 'roadmap'
  >('arch');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const copyCode = (code: string, key: string) => {
    navigator.clipboard.writeText(code);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  return (
    <div className="bg-neutral-900/80 border border-neutral-800 rounded-xl p-5 flex flex-col gap-6 text-neutral-200">
      <div>
        <h2 className="text-base font-semibold text-neutral-100 flex items-center gap-2">
          <BookOpen className="w-4 h-4 text-amber-400" />
          Technical Documentation & Architecture
        </h2>
        <p className="text-xs text-neutral-400 mt-0.5">
          System specifications, Prisma SQLite database schema, REST API documentation, and engineering roadmap.
        </p>
      </div>

      {/* Sub tabs */}
      <div className="flex flex-wrap items-center gap-1.5 p-1 bg-neutral-950 rounded-lg border border-neutral-800 text-xs">
        <button
          onClick={() => setActiveSubTab('arch')}
          className={`px-3 py-1.5 rounded-md font-medium transition-colors ${
            activeSubTab === 'arch' ? 'bg-neutral-800 text-amber-400 shadow-sm' : 'text-neutral-400 hover:text-white'
          }`}
        >
          1. System Architecture
        </button>
        <button
          onClick={() => setActiveSubTab('db')}
          className={`px-3 py-1.5 rounded-md font-medium transition-colors ${
            activeSubTab === 'db' ? 'bg-neutral-800 text-amber-400 shadow-sm' : 'text-neutral-400 hover:text-white'
          }`}
        >
          2. Database Schema (Prisma)
        </button>
        <button
          onClick={() => setActiveSubTab('api')}
          className={`px-3 py-1.5 rounded-md font-medium transition-colors ${
            activeSubTab === 'api' ? 'bg-neutral-800 text-amber-400 shadow-sm' : 'text-neutral-400 hover:text-white'
          }`}
        >
          3. API Specifications
        </button>
        <button
          onClick={() => setActiveSubTab('workflow')}
          className={`px-3 py-1.5 rounded-md font-medium transition-colors ${
            activeSubTab === 'workflow' ? 'bg-neutral-800 text-amber-400 shadow-sm' : 'text-neutral-400 hover:text-white'
          }`}
        >
          4. User Workflow Diagrams
        </button>
        <button
          onClick={() => setActiveSubTab('install')}
          className={`px-3 py-1.5 rounded-md font-medium transition-colors ${
            activeSubTab === 'install' ? 'bg-neutral-800 text-amber-400 shadow-sm' : 'text-neutral-400 hover:text-white'
          }`}
        >
          5. Local Installation Guide
        </button>
        <button
          onClick={() => setActiveSubTab('roadmap')}
          className={`px-3 py-1.5 rounded-md font-medium transition-colors ${
            activeSubTab === 'roadmap' ? 'bg-neutral-800 text-amber-400 shadow-sm' : 'text-neutral-400 hover:text-white'
          }`}
        >
          6. Roadmap & Estimation
        </button>
      </div>

      {/* Subtab 1: Architecture */}
      {activeSubTab === 'arch' && (
        <div className="space-y-6 text-xs">
          <div>
            <h3 className="text-sm font-semibold text-neutral-100 mb-2">High-Level Software Architecture</h3>
            <p className="text-neutral-400 leading-relaxed mb-4">
              The application is engineered as an offline-first, client-rendered web application with zero external cloud dependencies for image processing. It leverages hardware-accelerated Canvas rendering and raw PDF binary synthesis for lossless 300/600 DPI output.
            </p>

            <div className="bg-neutral-950 p-4 rounded-lg border border-neutral-800 font-mono text-[11px] leading-relaxed text-neutral-300">
              {`+-------------------------------------------------------------------------------+
|                             CLIENT WORKSPACE (Vite/React)                     |
+-------------------------------------------------------------------------------+
| [Upload Engine]    --> [Face Landmark & Geometry Analysis (70-80% Face Fit)]  |
|         |                                  |                                  |
|         v                                  v                                  |
| [Crop & Transform Canvas] --> [Chroma Background Replacement Engine]          |
|         |                                                                     |
|         v                                                                     |
| [Grid Arranger (A4/4x6/5x7)] --> [Multi-DPI Canvas Rendering (300/600 DPI)]   |
|         |                                  |                                  |
|         v                                  v                                  |
| [pdf-lib Vector Synthesizer]     [PNG / JPEG High-Res Rasterizer]             |
|         |                                  |                                  |
|         +-------------------+--------------+                                  |
|                             v                                                 |
|                 [Browser File Stream Download]                                |
+-------------------------------------------------------------------------------+
| PERSISTENCE: SQLite (via Prisma) / IndexedDB Local Storage                    |
+-------------------------------------------------------------------------------+`}
            </div>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-neutral-100 mb-2">Folder Structure Overview</h3>
            <div className="bg-neutral-950 p-4 rounded-lg border border-neutral-800 font-mono text-[11px] text-neutral-300">
              {`passport-sheet-generator/
├── prisma/
│   └── schema.prisma         # Prisma schema with SQLite datasource
├── src/
│   ├── components/
│   │   ├── Header.tsx         # Top Bar Contract compliant header
│   │   ├── UploadSection.tsx  # Drag & Drop, file ingest, DPI check
│   │   ├── EditorSection.tsx  # Zoom, Pan, Rotate, Face Guide, Chroma Bg
│   │   ├── LayoutSection.tsx  # A4, 4x6, Copies, Margins, Cutting Marks
│   │   ├── PreviewSection.tsx # Real-time Canvas Sheet Preview
│   │   ├── ExportSection.tsx  # 300/600 DPI PDF, PNG, JPG Generator
│   │   ├── TemplateManager.tsx# Saved custom layout profiles
│   │   ├── HistorySection.tsx # Export audit log
│   │   └── DocsArchitecture.tsx # System specifications & technical guide
│   ├── constants/
│   │   └── presets.ts         # Indian Passport, Visa, PAN card specs
│   ├── services/
│   │   ├── faceDetection.ts   # Client-side facial skin chrominance & centering
│   │   ├── imageProcessing.ts # High-res Canvas rasterizer & DPI math
│   │   ├── pdfService.ts      # pdf-lib vector PDF synthesizer
│   │   └── storageService.ts  # Local persistent database manager
│   ├── types/
│   │   └── passport.ts        # TypeScript data contracts & models
│   ├── utils/
│   │   └── samplePhoto.ts     # Procedural sample portrait generator
│   ├── App.tsx                # Main state controller
│   └── main.tsx               # DOM bootstrap
├── package.json
└── vite.config.ts`}
            </div>
          </div>
        </div>
      )}

      {/* Subtab 2: Database Schema */}
      {activeSubTab === 'db' && (
        <div className="space-y-4 text-xs">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-neutral-100">Prisma Schema (SQLite)</h3>
            <button
              onClick={() =>
                copyCode(
                  `model User {
  id        String     @id @default(uuid())
  name      String
  email     String?    @unique
  role      String     @default("operator")
  createdAt DateTime   @default(now())
  templates Template[]
  history   ExportHistory[]
}

model Template {
  id         String   @id @default(uuid())
  name       String
  width      Float
  height     Float
  paperSize  String   @default("A4")
  orientation String  @default("portrait")
  copies     Int      @default(32)
  spacing    Float    @default(2.5)
  margin     Float    @default(8.0)
  showCutMarks Boolean @default(true)
  showBorder   Boolean @default(true)
  dpi          Int     @default(300)
}

model ExportHistory {
  id          String   @id @default(uuid())
  fileName    String
  exportType  String
  copiesCount Int
  paperSize   String
  dpi         Int
  createdAt   DateTime @default(now())
}

model Settings {
  id              String   @id @default(uuid())
  defaultDPI      Int      @default(300)
  defaultCopies   Int      @default(32)
  defaultPaperSize String  @default("A4")
  defaultTemplate String   @default("Indian Passport")
}`,
                  'prisma'
                )
              }
              className="inline-flex items-center gap-1 text-xs text-amber-400 hover:text-amber-300"
            >
              {copiedKey === 'prisma' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedKey === 'prisma' ? 'Copied!' : 'Copy Schema'}</span>
            </button>
          </div>

          <div className="bg-neutral-950 p-4 rounded-lg border border-neutral-800 font-mono text-[11px] text-amber-200/90 leading-relaxed overflow-x-auto">
            {`datasource db {
  provider = "sqlite"
  url      = "file:./dev.db"
}

generator client {
  provider = "prisma-client-js"
}

model User {
  id        String          @id @default(uuid())
  name      String
  email     String?         @unique
  role      String          @default("operator")
  createdAt DateTime        @default(now())
  updatedAt DateTime        @updatedAt
  templates Template[]
  history   ExportHistory[]
  settings  Settings?
}

model Template {
  id           String   @id @default(uuid())
  name         String
  userId       String?
  user         User?    @relation(fields: [userId], references: [id])
  width        Float    // e.g. 35.0 mm
  height       Float    // e.g. 45.0 mm
  paperSize    String   @default("A4")
  orientation  String   @default("portrait")
  copies       Int      @default(32)
  spacing      Float    @default(2.5)
  margin       Float    @default(8.0)
  showCutMarks Boolean  @default(true)
  showBorder   Boolean  @default(true)
  borderWidth  Float    @default(0.2)
  borderColor  String   @default("#CBD5E1")
  dpi          Int      @default(300)
  isDefault    Boolean  @default(false)
  createdAt    DateTime @default(now())
}

model ExportHistory {
  id          String   @id @default(uuid())
  userId      String?
  fileName    String
  exportType  String   // "pdf" | "png" | "jpg"
  copiesCount Int
  paperSize   String
  dpi         Int
  fileSizeKb  Float?
  createdAt   DateTime @default(now())
}

model Settings {
  id               String   @id @default(uuid())
  userId           String?  @unique
  defaultDPI       Int      @default(300)
  defaultCopies    Int      @default(32)
  defaultPaperSize String   @default("A4")
  defaultTemplate  String   @default("Indian Passport (35x45mm)")
  autoFaceDetect   Boolean  @default(true)
  studioName       String   @default("Studio Print Pro")
  updatedAt        DateTime @updatedAt
}`}
          </div>
        </div>
      )}

      {/* Subtab 3: API Specifications */}
      {activeSubTab === 'api' && (
        <div className="space-y-4 text-xs">
          <h3 className="text-sm font-semibold text-neutral-100">REST API Specifications</h3>
          <div className="space-y-3">
            <div className="p-3 bg-neutral-950 border border-neutral-800 rounded-lg">
              <div className="flex items-center gap-2 font-mono">
                <span className="px-1.5 py-0.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded font-semibold text-[10px]">
                  POST
                </span>
                <span className="text-neutral-200">/api/upload</span>
              </div>
              <p className="text-neutral-400 mt-1">
                Uploads candidate photograph, performs dimensions analysis, and calculates baseline DPI for passport standards.
              </p>
            </div>

            <div className="p-3 bg-neutral-950 border border-neutral-800 rounded-lg">
              <div className="flex items-center gap-2 font-mono">
                <span className="px-1.5 py-0.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded font-semibold text-[10px]">
                  POST
                </span>
                <span className="text-neutral-200">/api/crop</span>
              </div>
              <p className="text-neutral-400 mt-1">
                Applies zoom, offset, rotation, and facial centering algorithms. Returns cropped single photo buffer.
              </p>
            </div>

            <div className="p-3 bg-neutral-950 border border-neutral-800 rounded-lg">
              <div className="flex items-center gap-2 font-mono">
                <span className="px-1.5 py-0.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded font-semibold text-[10px]">
                  POST
                </span>
                <span className="text-neutral-200">/api/export-pdf</span>
              </div>
              <p className="text-neutral-400 mt-1">
                Synthesizes print-ready PDF with exact millimeter layout and vector cutting corner ticks.
              </p>
            </div>

            <div className="p-3 bg-neutral-950 border border-neutral-800 rounded-lg">
              <div className="flex items-center gap-2 font-mono">
                <span className="px-1.5 py-0.5 bg-sky-500/10 text-sky-400 border border-sky-500/20 rounded font-semibold text-[10px]">
                  GET / POST
                </span>
                <span className="text-neutral-200">/api/templates</span>
              </div>
              <p className="text-neutral-400 mt-1">
                Retrieves or creates layout presets for studio print workflows.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Subtab 4: Workflow Diagrams */}
      {activeSubTab === 'workflow' && (
        <div className="space-y-4 text-xs">
          <h3 className="text-sm font-semibold text-neutral-100">End-to-End User Workflow</h3>
          <div className="bg-neutral-950 p-4 rounded-lg border border-neutral-800 font-mono text-[11px] text-neutral-300 leading-relaxed overflow-x-auto">
            {`[1. Ingest Photo]
      │
      ▼
[2. Resolution Audit] ─── (DPI < 150) ──> [Display Warning Badge]
      │
      ▼
[3. Face Centering]  ───> [Detect Head Boundaries & Center at 75% Height]
      │
      ▼
[4. Editor Adjustments] (Zoom / Pan / Rotation / Background: White / Blue)
      │
      ▼
[5. Layout Config]    (Select A4 Sheet / Copies: 4, 8, 16, 24, 32, 40, 48)
      │
      ▼
[6. Finishing Marks]  (Toggle Corner Ticks, Spacing 2.5mm, Margins 8mm)
      │
      ▼
[7. Output Generation]
      ├─► [Print-Ready Uncompressed PDF (300/600 DPI)]
      ├─► [High-Res Sheet PNG / JPG]
      └─► [Single Cropped Passport Photo (413×531 px for Online Portals)]`}
          </div>
        </div>
      )}

      {/* Subtab 5: Installation Guide */}
      {activeSubTab === 'install' && (
        <div className="space-y-4 text-xs">
          <h3 className="text-sm font-semibold text-neutral-100">Local Installation & Setup</h3>
          <p className="text-neutral-400">
            Follow these commands to run Passport Sheet Generator on any local computer or studio print kiosk:
          </p>

          <div className="bg-neutral-950 p-4 rounded-lg border border-neutral-800 font-mono text-[11px] text-neutral-300 space-y-2">
            <div>
              <span className="text-neutral-500"># 1. Clone or download repository</span>
              <div className="text-amber-300">git clone https://github.com/your-org/passport-sheet-generator.git</div>
              <div className="text-amber-300">cd passport-sheet-generator</div>
            </div>
            <div className="pt-2">
              <span className="text-neutral-500"># 2. Install dependencies</span>
              <div className="text-amber-300">npm install</div>
            </div>
            <div className="pt-2">
              <span className="text-neutral-500"># 3. Setup Prisma SQLite database</span>
              <div className="text-amber-300">npx prisma migrate dev --name init</div>
            </div>
            <div className="pt-2">
              <span className="text-neutral-500"># 4. Start local development server</span>
              <div className="text-amber-300">npm run dev</div>
            </div>
            <div className="pt-2">
              <span className="text-neutral-500"># 5. Production build for deployment</span>
              <div className="text-amber-300">npm run build && npm run preview</div>
            </div>
          </div>
        </div>
      )}

      {/* Subtab 6: Roadmap & Effort Estimation */}
      {activeSubTab === 'roadmap' && (
        <div className="space-y-4 text-xs">
          <h3 className="text-sm font-semibold text-neutral-100">Engineering Roadmap & Effort Estimation</h3>
          <div className="space-y-3">
            <div className="p-3.5 bg-neutral-950 border border-emerald-500/30 rounded-lg">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-emerald-400">Phase 1: Core Photo & PDF Sheet Engine</span>
                <span className="text-[11px] font-mono text-emerald-300">COMPLETED · 12 Hours</span>
              </div>
              <p className="text-neutral-400 mt-1">
                Single photo upload, crop editor, zoom/pan/rotate, A4 grid calculations, and 300/600 DPI vector PDF generation with cutting marks.
              </p>
            </div>

            <div className="p-3.5 bg-neutral-950 border border-emerald-500/30 rounded-lg">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-emerald-400">Phase 2: Face Detection & Quality Validation</span>
                <span className="text-[11px] font-mono text-emerald-300">COMPLETED · 10 Hours</span>
              </div>
              <p className="text-neutral-400 mt-1">
                Automated facial boundary detection, 70-80% height auto-fit, eye level alignment, and effective print DPI warning system.
              </p>
            </div>

            <div className="p-3.5 bg-neutral-950 border border-emerald-500/30 rounded-lg">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-emerald-400">Phase 3: Background Tools & Persistence</span>
                <span className="text-[11px] font-mono text-emerald-300">COMPLETED · 8 Hours</span>
              </div>
              <p className="text-neutral-400 mt-1">
                Studio white/blue/grey background replacement, saved print templates, and export history audit log with SQLite Prisma models.
              </p>
            </div>

            <div className="p-3.5 bg-neutral-950 border border-neutral-800 rounded-lg opacity-85">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-neutral-200">Phase 4: Multi-Photo Batch & LAN Sharing</span>
                <span className="text-[11px] font-mono text-neutral-400">Planned · 16 Hours</span>
              </div>
              <p className="text-neutral-400 mt-1">
                Upload 10+ student photos simultaneously and auto-tile multiple candidates onto a single A4 batch master sheet.
              </p>
            </div>

            <div className="p-3.5 bg-neutral-950 border border-emerald-500/30 rounded-lg">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-emerald-400">Phase 5: Print Shop Edition & Barcode Tracking</span>
                <span className="text-[11px] font-mono text-emerald-300">COMPLETED · 20 Hours</span>
              </div>
              <p className="text-neutral-400 mt-1">
                Customer token queue, Code-128 barcode / QR order stamp on sheet margins, thermal customer receipts, and photo printer profiles.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
