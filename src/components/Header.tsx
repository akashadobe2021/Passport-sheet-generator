import React from 'react';
import {
  Camera,
  Layers,
  Crop,
  Store,
  Bookmark,
  History,
  BookOpen,
  Sparkles,
  CheckCircle2,
  AlertTriangle
} from 'lucide-react';
import { QualityValidation } from '../types/passport';

interface HeaderProps {
  activeView: 'studio' | 'crop-focus' | 'orders' | 'templates' | 'history' | 'docs';
  setActiveView: (view: 'studio' | 'crop-focus' | 'orders' | 'templates' | 'history' | 'docs') => void;
  hasImage: boolean;
  quality: QualityValidation | null;
  targetDpi: 300 | 600;
  setTargetDpi: (dpi: 300 | 600) => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeView,
  setActiveView,
  hasImage,
  quality,
  targetDpi,
  setTargetDpi,
}) => {
  return (
    <header className="sticky top-0 z-40 bg-zinc-900/95 backdrop-blur-md border-b border-zinc-800/80 px-4 lg:px-6 py-2.5 transition-colors no-print">
      <div className="max-w-[1600px] mx-auto flex items-center justify-between gap-4">
        {/* Zone 1: Wordmark */}
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 shadow-sm">
            <Camera className="w-4 h-4" />
          </div>
          <div className="flex flex-col">
            <a
              href="/"
              onClick={(e) => {
                e.preventDefault();
                setActiveView('studio');
              }}
              className="text-sm font-semibold tracking-tight text-zinc-100 hover:text-white transition-colors leading-none"
            >
              Passport Sheet Studio
            </a>
            <span className="text-[10px] text-amber-400/90 font-mono mt-0.5">
              Developer Akash Jangra
            </span>
          </div>
        </div>

        {/* Zone 2: Navigation modes */}
        <nav className="hidden md:flex items-center gap-1 bg-zinc-950/80 p-1 rounded-lg border border-zinc-800 text-xs font-medium">
          <button
            onClick={() => setActiveView('studio')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md transition-colors ${
              activeView === 'studio'
                ? 'bg-zinc-800 text-white shadow-sm'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Layers className="w-3.5 h-3.5 text-amber-400" />
            <span>Sheet Studio</span>
          </button>

          <button
            onClick={() => setActiveView('crop-focus')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md transition-colors ${
              activeView === 'crop-focus'
                ? 'bg-zinc-800 text-white shadow-sm'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Crop className="w-3.5 h-3.5 text-sky-400" />
            <span>Face & Crop Editor</span>
          </button>

          <button
            onClick={() => setActiveView('orders')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md transition-colors ${
              activeView === 'orders'
                ? 'bg-zinc-800 text-amber-400 shadow-sm font-semibold'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Store className="w-3.5 h-3.5 text-amber-400" />
            <span>Print Shop & Tokens</span>
          </button>

          <button
            onClick={() => setActiveView('templates')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md transition-colors ${
              activeView === 'templates'
                ? 'bg-zinc-800 text-white shadow-sm'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Bookmark className="w-3.5 h-3.5 text-emerald-400" />
            <span>Templates</span>
          </button>

          <button
            onClick={() => setActiveView('history')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md transition-colors ${
              activeView === 'history'
                ? 'bg-zinc-800 text-white shadow-sm'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <History className="w-3.5 h-3.5 text-purple-400" />
            <span>History</span>
          </button>

          <button
            onClick={() => setActiveView('docs')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md transition-colors ${
              activeView === 'docs'
                ? 'bg-zinc-800 text-white shadow-sm'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5 text-zinc-400" />
            <span>Docs</span>
          </button>
        </nav>

        {/* Zone 3: DPI toggle and Quality Indicator */}
        <div className="flex items-center gap-2">
          {/* Quality Chip */}
          {quality && (
            <div
              className={`hidden xl:flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-mono border ${
                quality.qualityLevel === 'excellent' || quality.qualityLevel === 'good'
                  ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                  : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
              }`}
              title={quality.warningMessage || 'Print resolution check'}
            >
              {quality.qualityLevel === 'good' || quality.qualityLevel === 'excellent' ? (
                <CheckCircle2 className="w-3 h-3" />
              ) : (
                <AlertTriangle className="w-3 h-3" />
              )}
              <span>{quality.effectiveDpi} DPI</span>
            </div>
          )}

          {/* DPI Switch */}
          <div className="flex items-center bg-zinc-950 p-0.5 rounded-md border border-zinc-800 text-[11px] font-mono">
            <button
              onClick={() => setTargetDpi(300)}
              className={`px-2 py-1 rounded transition-colors ${
                targetDpi === 300
                  ? 'bg-zinc-800 text-amber-400 font-semibold'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              300 DPI
            </button>
            <button
              onClick={() => setTargetDpi(600)}
              className={`px-2 py-1 rounded transition-colors ${
                targetDpi === 600
                  ? 'bg-zinc-800 text-amber-400 font-semibold'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              600 DPI
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};

