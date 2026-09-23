import React, { useState, useEffect } from 'react';
import { Bookmark, Plus, Trash2, Check, Layout, Sparkles, Star } from 'lucide-react';
import { LayoutConfig, PhotoPreset, SavedTemplate } from '../types/passport';
import { StorageService } from '../services/storageService';

interface TemplateManagerProps {
  currentLayout: LayoutConfig;
  photoPreset: PhotoPreset;
  customWidthMm: number;
  customHeightMm: number;
  onApplyTemplate: (template: SavedTemplate) => void;
}

export const TemplateManager: React.FC<TemplateManagerProps> = ({
  currentLayout,
  photoPreset,
  customWidthMm,
  customHeightMm,
  onApplyTemplate,
}) => {
  const [templates, setTemplates] = useState<SavedTemplate[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const [newTemplateName, setNewTemplateName] = useState('');
  const [activeMessage, setActiveMessage] = useState<string | null>(null);

  useEffect(() => {
    loadTemplates();
  }, []);

  const loadTemplates = () => {
    setTemplates(StorageService.getTemplates());
  };

  const handleSaveCurrentAsTemplate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTemplateName.trim()) return;

    const widthMm = photoPreset.id === 'custom' ? customWidthMm : photoPreset.widthMm;
    const heightMm = photoPreset.id === 'custom' ? customHeightMm : photoPreset.heightMm;

    StorageService.saveTemplate({
      name: newTemplateName.trim(),
      widthMm,
      heightMm,
      paperSize: currentLayout.paperSize,
      orientation: currentLayout.orientation,
      copies: currentLayout.copies,
      gapMm: currentLayout.gapMm,
      marginMm: currentLayout.marginMm,
      showCutMarks: currentLayout.showCutMarks,
      showBorder: currentLayout.showBorder,
      dpi: 300,
    });

    setNewTemplateName('');
    setIsCreating(false);
    loadTemplates();
    showMessage('Template saved successfully!');
  };

  const handleDelete = (id: string, name: string) => {
    if (confirm(`Delete template "${name}"?`)) {
      StorageService.deleteTemplate(id);
      loadTemplates();
      showMessage('Template deleted.');
    }
  };

  const showMessage = (msg: string) => {
    setActiveMessage(msg);
    setTimeout(() => setActiveMessage(null), 3000);
  };

  return (
    <div className="bg-neutral-900/80 border border-neutral-800 rounded-xl p-5 flex flex-col gap-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-neutral-100 flex items-center gap-2">
            <Bookmark className="w-4 h-4 text-amber-400" />
            Print Layout Templates
          </h2>
          <p className="text-xs text-neutral-400 mt-0.5">
            Store recurring customer formats for your studio, document center, or agency.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setIsCreating(!isCreating)}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-amber-400 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/20 rounded-md transition-colors self-start sm:self-auto"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Save Current Layout as Template</span>
        </button>
      </div>

      {activeMessage && (
        <div className="p-3 bg-neutral-950 border border-amber-500/30 text-amber-300 text-xs rounded-lg flex items-center gap-2">
          <Sparkles className="w-3.5 h-3.5 text-amber-400" />
          <span>{activeMessage}</span>
        </div>
      )}

      {/* Save Template Inline Form */}
      {isCreating && (
        <form
          onSubmit={handleSaveCurrentAsTemplate}
          className="p-4 bg-neutral-950/70 border border-neutral-800 rounded-lg flex flex-col sm:flex-row gap-3 items-center"
        >
          <input
            type="text"
            placeholder="e.g. Rapid 16-Up A4 with Border (35x45)"
            value={newTemplateName}
            onChange={(e) => setNewTemplateName(e.target.value)}
            className="flex-1 w-full bg-neutral-900 border border-neutral-700 rounded px-3 py-1.5 text-xs text-neutral-200 focus:outline-none focus:border-amber-400"
            autoFocus
          />
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              type="submit"
              disabled={!newTemplateName.trim()}
              className="flex-1 sm:flex-none px-3.5 py-1.5 bg-amber-400 hover:bg-amber-300 text-neutral-950 font-semibold text-xs rounded transition-colors disabled:opacity-40"
            >
              Save Template
            </button>
            <button
              type="button"
              onClick={() => setIsCreating(false)}
              className="px-3 py-1.5 bg-neutral-800 text-neutral-400 hover:text-white text-xs rounded"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* Templates Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {templates.map((tmpl) => (
          <div
            key={tmpl.id}
            className="bg-neutral-950/60 border border-neutral-800 hover:border-neutral-700/80 rounded-lg p-4 flex flex-col justify-between gap-3 transition-colors"
          >
            <div>
              <div className="flex items-start justify-between gap-2">
                <span className="font-semibold text-xs text-neutral-200 leading-snug">
                  {tmpl.name}
                </span>
                {tmpl.isDefault && (
                  <span className="text-[10px] text-amber-400 flex items-center gap-0.5 shrink-0">
                    <Star className="w-3 h-3 fill-amber-400" /> Default
                  </span>
                )}
              </div>

              <div className="mt-2.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-neutral-400">
                <span className="font-mono text-neutral-300">{tmpl.paperSize}</span>
                <span>·</span>
                <span className="font-mono text-amber-400 tabular-nums">{tmpl.copies} Copies</span>
                <span>·</span>
                <span className="font-mono text-neutral-400">{tmpl.widthMm}×{tmpl.heightMm} mm</span>
                <span>·</span>
                <span className="capitalize text-neutral-500">{tmpl.orientation}</span>
              </div>

              <div className="mt-2 text-[11px] text-neutral-500">
                Margins: {tmpl.marginMm}mm · Spacing: {tmpl.gapMm}mm · {tmpl.showCutMarks ? 'Cut Marks On' : 'No Cut Marks'}
              </div>
            </div>

            <div className="flex items-center gap-2 pt-2 border-t border-neutral-850">
              <button
                type="button"
                onClick={() => {
                  onApplyTemplate(tmpl);
                  showMessage(`Applied template "${tmpl.name}"`);
                }}
                className="flex-1 py-1.5 px-2 bg-neutral-800 hover:bg-neutral-750 text-neutral-200 text-xs font-medium rounded transition-colors flex items-center justify-center gap-1.5"
              >
                <Check className="w-3.5 h-3.5 text-amber-400" />
                <span>Apply Layout</span>
              </button>

              {!tmpl.isDefault && (
                <button
                  type="button"
                  onClick={() => handleDelete(tmpl.id, tmpl.name)}
                  className="p-1.5 text-neutral-500 hover:text-rose-400 hover:bg-neutral-800 rounded transition-colors"
                  title="Delete Template"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
