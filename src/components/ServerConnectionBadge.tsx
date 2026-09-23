import React from 'react';
import { Cloud, Zap, Sparkles, RefreshCw, AlertCircle } from 'lucide-react';
import { ServerStatusResponse } from '../types/serverStatus';

interface ServerConnectionBadgeProps {
  status: ServerStatusResponse | null;
  isLoading: boolean;
  onClick: () => void;
}

export const ServerConnectionBadge: React.FC<ServerConnectionBadgeProps> = ({
  status,
  isLoading,
  onClick,
}) => {
  const isCloudinaryLive = Boolean(status?.cloudinary?.connected);
  const isGeminiLive = Boolean(status?.gemini?.configured);

  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-mono border transition-all cursor-pointer select-none group ${
        isLoading
          ? 'bg-zinc-800/80 text-zinc-400 border-zinc-700/60'
          : isCloudinaryLive
          ? 'bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
          : isGeminiLive
          ? 'bg-sky-500/10 hover:bg-sky-500/20 text-sky-300 border-sky-500/30'
          : 'bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border-amber-500/30'
      }`}
      title="Click to view Live Server Connection & Cloudinary AI diagnostics"
    >
      {/* Animated Status Pulse */}
      <span className="relative flex h-2 w-2">
        {isLoading ? (
          <span className="animate-spin h-2 w-2 border border-zinc-400 border-t-transparent rounded-full" />
        ) : (
          <>
            <span
              className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                isCloudinaryLive ? 'bg-emerald-400' : isGeminiLive ? 'bg-sky-400' : 'bg-amber-400'
              }`}
            />
            <span
              className={`relative inline-flex rounded-full h-2 w-2 ${
                isCloudinaryLive ? 'bg-emerald-500' : isGeminiLive ? 'bg-sky-500' : 'bg-amber-500'
              }`}
            />
          </>
        )}
      </span>

      {/* Label */}
      <span className="font-semibold">
        {isLoading ? (
          'Checking...'
        ) : isCloudinaryLive ? (
          'Cloudinary: Live'
        ) : isGeminiLive ? (
          'Gemini AI: Live'
        ) : (
          'Client AI: Ready'
        )}
      </span>

      <span className="text-[10px] opacity-60 group-hover:opacity-100 transition-opacity underline ml-0.5">
        Info
      </span>
    </button>
  );
};
