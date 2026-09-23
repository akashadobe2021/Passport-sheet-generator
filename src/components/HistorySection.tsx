import React, { useState, useEffect } from 'react';
import { History, FileText, Image as ImageIcon, Trash2, Calendar, HardDrive, Printer } from 'lucide-react';
import { ExportHistoryRecord } from '../types/passport';
import { StorageService } from '../services/storageService';

export const HistorySection: React.FC = () => {
  const [history, setHistory] = useState<ExportHistoryRecord[]>([]);

  useEffect(() => {
    setHistory(StorageService.getHistory());
  }, []);

  const handleClearHistory = () => {
    if (confirm('Clear all local export history?')) {
      StorageService.clearHistory();
      setHistory([]);
    }
  };

  const totalSheets = history.length;
  const totalPhotosPrinted = history.reduce((acc, h) => acc + h.copiesCount, 0);

  return (
    <div className="bg-neutral-900/80 border border-neutral-800 rounded-xl p-5 flex flex-col gap-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-neutral-100 flex items-center gap-2">
            <History className="w-4 h-4 text-amber-400" />
            Export & Generation History
          </h2>
          <p className="text-xs text-neutral-400 mt-0.5">
            Audit log of all photo sheets and documents generated in this session.
          </p>
        </div>

        {history.length > 0 && (
          <button
            type="button"
            onClick={handleClearHistory}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 rounded-md transition-colors self-start sm:self-auto border border-rose-500/20"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Clear History</span>
          </button>
        )}
      </div>

      {/* Analytics counter stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <div className="bg-neutral-950/60 border border-neutral-800 p-3.5 rounded-lg">
          <div className="text-xs text-neutral-400">Total Sheets Generated</div>
          <div className="text-xl font-bold font-mono text-neutral-100 mt-1 tabular-nums">
            {totalSheets}
          </div>
        </div>

        <div className="bg-neutral-950/60 border border-neutral-800 p-3.5 rounded-lg">
          <div className="text-xs text-neutral-400">Total Photos Printed</div>
          <div className="text-xl font-bold font-mono text-amber-400 mt-1 tabular-nums">
            {totalPhotosPrinted}
          </div>
        </div>

        <div className="bg-neutral-950/60 border border-neutral-800 p-3.5 rounded-lg col-span-2 sm:col-span-1">
          <div className="text-xs text-neutral-400">Storage Engine</div>
          <div className="text-xs font-mono text-neutral-300 mt-2">
            Local SQLite / IndexedDB
          </div>
        </div>
      </div>

      {/* Table list */}
      {history.length === 0 ? (
        <div className="p-8 text-center text-neutral-500 text-xs bg-neutral-950/40 rounded-lg border border-neutral-800">
          No exports recorded yet. Configure and export your first passport sheet!
        </div>
      ) : (
        <div className="overflow-x-auto border border-neutral-800 rounded-lg">
          <table className="w-full text-left text-xs">
            <thead className="bg-neutral-950/80 text-neutral-400 border-b border-neutral-800 font-medium">
              <tr>
                <th className="py-2.5 px-3">File Name</th>
                <th className="py-2.5 px-3">Format</th>
                <th className="py-2.5 px-3">Paper</th>
                <th className="py-2.5 px-3">Copies</th>
                <th className="py-2.5 px-3">Resolution</th>
                <th className="py-2.5 px-3">Size</th>
                <th className="py-2.5 px-3">Date & Time</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-850">
              {history.map((rec) => (
                <tr key={rec.id} className="hover:bg-neutral-850/50 transition-colors">
                  <td className="py-2.5 px-3 font-mono text-neutral-200">
                    <div className="flex items-center gap-2">
                      {rec.exportType === 'pdf' ? (
                        <FileText className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                      ) : (
                        <ImageIcon className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                      )}
                      <span className="truncate max-w-[200px]">{rec.fileName}</span>
                    </div>
                  </td>
                  <td className="py-2.5 px-3 uppercase font-mono text-neutral-400">
                    {rec.exportType}
                  </td>
                  <td className="py-2.5 px-3 font-mono text-neutral-300">
                    {rec.paperSize}
                  </td>
                  <td className="py-2.5 px-3 font-mono text-amber-400 tabular-nums font-semibold">
                    {rec.copiesCount}
                  </td>
                  <td className="py-2.5 px-3 font-mono text-neutral-400 tabular-nums">
                    {rec.dpi} DPI
                  </td>
                  <td className="py-2.5 px-3 font-mono text-neutral-500 tabular-nums">
                    {rec.fileSizeKb ? `${rec.fileSizeKb} KB` : '—'}
                  </td>
                  <td className="py-2.5 px-3 text-neutral-500 whitespace-nowrap">
                    {new Date(rec.createdAt).toLocaleDateString()} {new Date(rec.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
