import { AppSettings, ExportHistoryRecord, SavedTemplate } from '../types/passport';
import { DEFAULT_TEMPLATES } from '../constants/presets';

const STORAGE_KEYS = {
  TEMPLATES: 'passport_gen_templates',
  HISTORY: 'passport_gen_history',
  SETTINGS: 'passport_gen_settings',
};

const DEFAULT_SETTINGS: AppSettings = {
  defaultDPI: 300,
  defaultCopies: 32,
  defaultPaperSize: 'A4',
  defaultTemplateId: 'tmpl-32-a4',
  autoFaceDetect: true,
  showGuides: true,
  studioName: 'Studio Print Pro',
};

export const StorageService = {
  // Templates
  getTemplates(): SavedTemplate[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.TEMPLATES);
      if (!data) {
        localStorage.setItem(STORAGE_KEYS.TEMPLATES, JSON.stringify(DEFAULT_TEMPLATES));
        return DEFAULT_TEMPLATES;
      }
      return JSON.parse(data);
    } catch {
      return DEFAULT_TEMPLATES;
    }
  },

  saveTemplate(template: Omit<SavedTemplate, 'id' | 'createdAt'>): SavedTemplate {
    const templates = this.getTemplates();
    const newTemplate: SavedTemplate = {
      ...template,
      id: `tmpl-${Date.now()}`,
      createdAt: new Date().toISOString(),
    };
    templates.push(newTemplate);
    localStorage.setItem(STORAGE_KEYS.TEMPLATES, JSON.stringify(templates));
    return newTemplate;
  },

  deleteTemplate(id: string): void {
    const templates = this.getTemplates().filter((t) => t.id !== id);
    localStorage.setItem(STORAGE_KEYS.TEMPLATES, JSON.stringify(templates));
  },

  // Export History
  getHistory(): ExportHistoryRecord[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.HISTORY);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  },

  recordExport(record: Omit<ExportHistoryRecord, 'id' | 'createdAt'>): ExportHistoryRecord {
    const history = this.getHistory();
    const newRecord: ExportHistoryRecord = {
      ...record,
      id: `exp-${Date.now()}`,
      createdAt: new Date().toISOString(),
    };
    // Keep last 50 exports
    history.unshift(newRecord);
    if (history.length > 50) history.pop();
    localStorage.setItem(STORAGE_KEYS.HISTORY, JSON.stringify(history));
    return newRecord;
  },

  clearHistory(): void {
    localStorage.removeItem(STORAGE_KEYS.HISTORY);
  },

  // Settings
  getSettings(): AppSettings {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.SETTINGS);
      return data ? { ...DEFAULT_SETTINGS, ...JSON.parse(data) } : DEFAULT_SETTINGS;
    } catch {
      return DEFAULT_SETTINGS;
    }
  },

  updateSettings(settings: Partial<AppSettings>): AppSettings {
    const current = this.getSettings();
    const updated = { ...current, ...settings };
    localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(updated));
    return updated;
  },
};
