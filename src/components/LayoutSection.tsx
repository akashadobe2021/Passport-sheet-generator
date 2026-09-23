import React from 'react';
import {
  Grid,
  FileSpreadsheet,
  Scissors,
  Square,
  Maximize,
  SlidersHorizontal,
  Layers,
  Heading
} from 'lucide-react';
import { LayoutConfig, PaperSize, PhotoPreset } from '../types/passport';
import { COPY_OPTIONS, PAPER_SIZES, PHOTO_PRESETS } from '../constants/presets';

interface LayoutSectionProps {
  layout: LayoutConfig;
  setLayout: React.Dispatch<React.SetStateAction<LayoutConfig>>;
  selectedPreset: PhotoPreset;
  setSelectedPreset: (preset: PhotoPreset) => void;
  customWidthMm: number;
  setCustomWidthMm: (w: number) => void;
  customHeightMm: number;
  setCustomHeightMm: (h: number) => void;
  maxPossibleCopies: number;
}

export const LayoutSection: React.FC<LayoutSectionProps> = ({
  layout,
  setLayout,
  selectedPreset,
  setSelectedPreset,
  customWidthMm,
  setCustomWidthMm,
  customHeightMm,
  setCustomHeightMm,
  maxPossibleCopies,
}) => {
  return (
    <div className="bg-neutral-900/80 border border-neutral-800 rounded-xl p-4 lg:p-5 flex flex-col gap-4">
      <div>
        <h2 className="text-sm font-semibold text-neutral-200">3. A4 Sheet & Layout Settings</h2>
        <p className="text-xs text-neutral-400 mt-0.5">
          Configure paper size, copy density, margin offsets, and cutting guides.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
        {/* Photo Dimension Preset */}
        <div className="space-y-1.5">
          <label className="text-neutral-300 font-medium flex items-center gap-1.5">
            <Square className="w-3.5 h-3.5 text-neutral-400" />
            Photo Dimensions
          </label>
          <select
            value={selectedPreset.id}
            onChange={(e) => {
              const p = PHOTO_PRESETS.find((x) => x.id === e.target.value);
              if (p) setSelectedPreset(p);
            }}
            className="w-full bg-neutral-950 border border-neutral-700/80 rounded-md px-3 py-2 text-neutral-200 text-xs focus:outline-none focus:border-amber-400"
          >
            {PHOTO_PRESETS.map((preset) => (
              <option key={preset.id} value={preset.id}>
                {preset.name} ({preset.widthMm}×{preset.heightMm} mm)
              </option>
            ))}
          </select>
          <div className="text-[11px] text-neutral-500">
            {selectedPreset.description}
          </div>

          {/* Custom dimension inputs if custom selected */}
          {selectedPreset.id === 'custom' && (
            <div className="grid grid-cols-2 gap-2 mt-2 pt-2 border-t border-neutral-800">
              <div>
                <label className="text-[11px] text-neutral-400">Width (mm)</label>
                <input
                  type="number"
                  min="15"
                  max="100"
                  value={customWidthMm}
                  onChange={(e) => setCustomWidthMm(Math.max(10, parseFloat(e.target.value) || 35))}
                  className="w-full bg-neutral-950 border border-neutral-700 rounded px-2.5 py-1 text-xs text-neutral-200"
                />
              </div>
              <div>
                <label className="text-[11px] text-neutral-400">Height (mm)</label>
                <input
                  type="number"
                  min="15"
                  max="120"
                  value={customHeightMm}
                  onChange={(e) => setCustomHeightMm(Math.max(10, parseFloat(e.target.value) || 45))}
                  className="w-full bg-neutral-950 border border-neutral-700 rounded px-2.5 py-1 text-xs text-neutral-200"
                />
              </div>
            </div>
          )}
        </div>

        {/* Paper Size & Sheet Type */}
        <div className="space-y-1.5">
          <label className="text-neutral-300 font-medium flex items-center gap-1.5">
            <FileSpreadsheet className="w-3.5 h-3.5 text-neutral-400" />
            Paper Size & Format
          </label>
          <div className="grid grid-cols-2 gap-1.5">
            {(Object.keys(PAPER_SIZES) as PaperSize[]).map((sizeKey) => {
              const p = PAPER_SIZES[sizeKey];
              const isSelected = layout.paperSize === sizeKey;
              return (
                <button
                  key={sizeKey}
                  type="button"
                  onClick={() => setLayout((prev) => ({ ...prev, paperSize: sizeKey }))}
                  className={`p-2 rounded-md text-left border transition-all ${
                    isSelected
                      ? 'bg-neutral-800 text-amber-400 border-amber-500/50 shadow-sm'
                      : 'bg-neutral-950/60 text-neutral-300 border-neutral-800 hover:text-white hover:border-neutral-700'
                  }`}
                >
                  <div className="font-semibold text-xs">{p.name}</div>
                  <div className="text-[10px] text-neutral-400 font-mono">
                    {p.widthMm} × {p.heightMm} mm
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Orientation & Copies Count */}
        <div className="space-y-1.5">
          <label className="text-neutral-300 font-medium flex items-center gap-1.5">
            <Layers className="w-3.5 h-3.5 text-neutral-400" />
            Page Orientation
          </label>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setLayout((p) => ({ ...p, orientation: 'portrait' }))}
              className={`py-2 px-3 rounded-md text-center border font-medium transition-colors ${
                layout.orientation === 'portrait'
                  ? 'bg-neutral-800 text-amber-400 border-amber-500/50'
                  : 'bg-neutral-950/60 text-neutral-400 border-neutral-800 hover:text-neutral-200'
              }`}
            >
              Portrait
            </button>
            <button
              type="button"
              onClick={() => setLayout((p) => ({ ...p, orientation: 'landscape' }))}
              className={`py-2 px-3 rounded-md text-center border font-medium transition-colors ${
                layout.orientation === 'landscape'
                  ? 'bg-neutral-800 text-amber-400 border-amber-500/50'
                  : 'bg-neutral-950/60 text-neutral-400 border-neutral-800 hover:text-neutral-200'
              }`}
            >
              Landscape
            </button>
          </div>
        </div>

        {/* Number of Photos / Copies */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-neutral-300 font-medium">
            <label className="flex items-center gap-1.5">
              <Grid className="w-3.5 h-3.5 text-neutral-400" />
              Number of Copies
            </label>
            <span className="text-[11px] font-mono text-neutral-400">
              Max fit: {maxPossibleCopies} photos
            </span>
          </div>

          <div className="flex flex-wrap gap-1.5">
            {COPY_OPTIONS.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setLayout((p) => ({ ...p, copies: c }))}
                className={`flex-1 min-w-[36px] py-1.5 px-2 rounded text-center border text-xs font-mono transition-colors ${
                  layout.copies === c
                    ? 'bg-neutral-800 text-amber-400 border-amber-500/60 font-semibold'
                    : 'bg-neutral-950/60 text-neutral-400 border-neutral-800 hover:text-neutral-200'
                }`}
              >
                {c}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Margins, Spacing & Print Finishing */}
      <div className="pt-3 border-t border-neutral-800 grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
        {/* Gap & Margins */}
        <div className="space-y-3">
          {/* Gap between photos */}
          <div className="space-y-1">
            <div className="flex justify-between text-neutral-300">
              <span className="flex items-center gap-1 text-neutral-300">
                <SlidersHorizontal className="w-3 h-3 text-neutral-400" />
                Gap Between Photos
              </span>
              <span className="font-mono text-neutral-400 tabular-nums">{layout.gapMm} mm</span>
            </div>
            <input
              type="range"
              min="0"
              max="10"
              step="0.5"
              value={layout.gapMm}
              onChange={(e) => setLayout((p) => ({ ...p, gapMm: parseFloat(e.target.value) }))}
              className="w-full accent-amber-400 cursor-pointer"
            />
          </div>

          {/* Page margin */}
          <div className="space-y-1">
            <div className="flex justify-between text-neutral-300">
              <span className="flex items-center gap-1 text-neutral-300">
                <Maximize className="w-3 h-3 text-neutral-400" />
                Outer Sheet Margins
              </span>
              <span className="font-mono text-neutral-400 tabular-nums">{layout.marginMm} mm</span>
            </div>
            <input
              type="range"
              min="2"
              max="25"
              step="1"
              value={layout.marginMm}
              onChange={(e) => setLayout((p) => ({ ...p, marginMm: parseFloat(e.target.value) }))}
              className="w-full accent-amber-400 cursor-pointer"
            />
          </div>
        </div>

        {/* Guides, Borders & Header */}
        <div className="space-y-2.5 bg-neutral-950/40 p-3 rounded-lg border border-neutral-800/80">
          {/* Cutting Guides */}
          <div className="flex items-center justify-between">
            <label className="flex items-center gap-2 cursor-pointer text-neutral-300">
              <input
                type="checkbox"
                checked={layout.showCutMarks}
                onChange={(e) => setLayout((p) => ({ ...p, showCutMarks: e.target.checked }))}
                className="rounded accent-amber-400"
              />
              <span className="flex items-center gap-1.5">
                <Scissors className="w-3.5 h-3.5 text-neutral-400" />
                Cutting Guidelines
              </span>
            </label>

            {layout.showCutMarks && (
              <select
                value={layout.cutMarkStyle}
                onChange={(e) => setLayout((p) => ({ ...p, cutMarkStyle: e.target.value as any }))}
                className="bg-neutral-900 border border-neutral-700 rounded px-2 py-0.5 text-[11px] text-neutral-300"
              >
                <option value="ticks">Corner Ticks</option>
                <option value="dashed">Dashed Lines</option>
                <option value="solid">Solid Box</option>
              </select>
            )}
          </div>

          {/* Border around photos */}
          <div className="flex items-center justify-between">
            <label className="flex items-center gap-2 cursor-pointer text-neutral-300">
              <input
                type="checkbox"
                checked={layout.showBorder}
                onChange={(e) => setLayout((p) => ({ ...p, showBorder: e.target.checked }))}
                className="rounded accent-amber-400"
              />
              <span className="flex items-center gap-1.5">
                <Square className="w-3.5 h-3.5 text-neutral-400" />
                Photo Cutting Border (0.2mm)
              </span>
            </label>

            {layout.showBorder && (
              <span className="text-[11px] text-neutral-500 font-mono">#CBD5E1</span>
            )}
          </div>

          {/* Sheet Header Metadata */}
          <div className="space-y-1.5 pt-1 border-t border-neutral-800">
            <label className="flex items-center gap-2 cursor-pointer text-neutral-300">
              <input
                type="checkbox"
                checked={layout.includeHeader}
                onChange={(e) => setLayout((p) => ({ ...p, includeHeader: e.target.checked }))}
                className="rounded accent-amber-400"
              />
              <span className="flex items-center gap-1.5">
                <Heading className="w-3.5 h-3.5 text-neutral-400" />
                Print Metadata Header
              </span>
            </label>

            {layout.includeHeader && (
              <input
                type="text"
                value={layout.headerText}
                onChange={(e) => setLayout((p) => ({ ...p, headerText: e.target.value }))}
                placeholder="e.g. Indian Passport 35x45mm · Ref #8824 · Studio Print"
                className="w-full bg-neutral-900 border border-neutral-700 rounded px-2 py-1 text-xs text-neutral-200"
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
