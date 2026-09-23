import React, { useState } from 'react';
import {
  Server,
  Cloud,
  CheckCircle2,
  AlertCircle,
  XCircle,
  RefreshCw,
  X,
  Zap,
  Sparkles,
  Shield,
  HelpCircle,
  Copy,
  Check,
  ExternalLink,
  Cpu
} from 'lucide-react';
import { ServerStatusResponse } from '../types/serverStatus';

interface ServerConnectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  status: ServerStatusResponse | null;
  isLoading: boolean;
  onRefresh: () => void;
}

export const ServerConnectionModal: React.FC<ServerConnectionModalProps> = ({
  isOpen,
  onClose,
  status,
  isLoading,
  onRefresh,
}) => {
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleCopy = (text: string, keyName: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(keyName);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const isCloudinaryLive = Boolean(status?.cloudinary?.connected);
  const isGeminiLive = Boolean(status?.gemini?.configured);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className="bg-zinc-900 border border-zinc-700/80 rounded-2xl w-full max-w-xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-zinc-800 flex items-center justify-between bg-zinc-950/70">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <Server className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-zinc-100 flex items-center gap-2">
                Server & AI Connection Status
              </h3>
              <p className="text-xs text-zinc-400">
                Live diagnostics for Cloudinary API, Gemini Vision, and background removal
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-4">
          {/* Active Engine Summary Banner */}
          <div
            className={`p-3.5 rounded-xl border flex items-center justify-between ${
              isCloudinaryLive
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                : isGeminiLive
                ? 'bg-sky-500/10 border-sky-500/30 text-sky-300'
                : 'bg-amber-500/10 border-amber-500/30 text-amber-300'
            }`}
          >
            <div className="flex items-center gap-3">
              <div className="relative">
                <span
                  className={`w-3 h-3 rounded-full block ${
                    isCloudinaryLive ? 'bg-emerald-400' : isGeminiLive ? 'bg-sky-400' : 'bg-amber-400'
                  }`}
                />
                <span
                  className={`w-3 h-3 rounded-full block animate-ping absolute inset-0 opacity-75 ${
                    isCloudinaryLive ? 'bg-emerald-400' : isGeminiLive ? 'bg-sky-400' : 'bg-amber-400'
                  }`}
                />
              </div>
              <div>
                <div className="text-xs font-semibold uppercase tracking-wider">
                  Active Background Engine
                </div>
                <div className="text-sm font-bold text-white mt-0.5">
                  {isCloudinaryLive
                    ? 'Cloudinary AI Background Removal (Primary)'
                    : isGeminiLive
                    ? 'Google Gemini Vision AI (Fallback 1)'
                    : 'Client-Side High-Precision Engine (Always Ready)'}
                </div>
              </div>
            </div>

            <button
              onClick={onRefresh}
              disabled={isLoading}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700 rounded-lg transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-amber-400' : ''}`} />
              <span>{isLoading ? 'Pinging...' : 'Test Connection'}</span>
            </button>
          </div>

          {/* Service Cards */}
          <div className="space-y-3">
            {/* 1. Cloudinary Card */}
            <div className="p-4 rounded-xl bg-zinc-950/80 border border-zinc-800 space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Cloud className="w-4 h-4 text-sky-400" />
                  <span className="text-sm font-semibold text-zinc-100">Cloudinary API</span>
                  {status?.cloudinary?.cloudName && (
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-zinc-800 text-zinc-300 border border-zinc-700">
                      {status.cloudinary.cloudName}
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-1.5 text-xs font-medium">
                  {isCloudinaryLive ? (
                    <span className="flex items-center gap-1 text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20 font-mono">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>LIVE ({status?.cloudinary?.latencyMs}ms)</span>
                    </span>
                  ) : status?.cloudinary?.configured ? (
                    <span className="flex items-center gap-1 text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded border border-rose-500/20 font-mono">
                      <XCircle className="w-3.5 h-3.5" />
                      <span>AUTH FAILED</span>
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20 font-mono">
                      <AlertCircle className="w-3.5 h-3.5" />
                      <span>NOT CONFIGURED</span>
                    </span>
                  )}
                </div>
              </div>

              <p className="text-xs text-zinc-300 font-mono bg-zinc-900/90 p-2 rounded border border-zinc-850">
                {status?.cloudinary?.message || (isLoading ? 'Testing connection to Cloudinary API...' : 'No status response')}
              </p>

              {status?.cloudinary?.error && (
                <div className="text-[11px] text-rose-400 bg-rose-950/30 p-2 rounded border border-rose-900/50">
                  <strong>Error details:</strong> {status.cloudinary.error}
                </div>
              )}
            </div>

            {/* 2. Gemini AI Card */}
            <div className="p-4 rounded-xl bg-zinc-950/80 border border-zinc-800 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-amber-400" />
                  <span className="text-sm font-semibold text-zinc-100">Google Gemini 2.5 Flash Vision</span>
                </div>

                <div className="flex items-center gap-1.5 text-xs font-medium">
                  {isGeminiLive ? (
                    <span className="flex items-center gap-1 text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20 font-mono">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>READY</span>
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 text-zinc-400 bg-zinc-800 px-2 py-0.5 rounded border border-zinc-700 font-mono">
                      <span>KEY MISSING</span>
                    </span>
                  )}
                </div>
              </div>
              <p className="text-xs text-zinc-400">
                Automatic neural portrait segmentation & silhouette tracing backup.
              </p>
            </div>

            {/* 3. Client High-Precision Matting Engine */}
            <div className="p-4 rounded-xl bg-zinc-950/80 border border-zinc-800 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Cpu className="w-4 h-4 text-purple-400" />
                  <span className="text-sm font-semibold text-zinc-100">Client-Side Portrait Matting</span>
                </div>
                <span className="flex items-center gap-1 text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20 text-xs font-mono">
                  <Shield className="w-3.5 h-3.5" />
                  <span>100% OPERATIONAL</span>
                </span>
              </div>
              <p className="text-xs text-zinc-400">
                Zero-lag, 100% skin and face protection. Always available even when offline or without API keys.
              </p>
            </div>
          </div>

          {/* Vercel Configuration Guide Box */}
          <div className="p-4 rounded-xl bg-zinc-950 border border-zinc-800 space-y-3">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-zinc-200">
              <HelpCircle className="w-4 h-4 text-amber-400" />
              <span>Configuring Cloudinary on Vercel (3 Steps)</span>
            </div>

            <ol className="text-xs text-zinc-300 space-y-2 list-decimal list-inside">
              <li>
                In your Vercel Project, go to <strong>Settings</strong> → <strong>Environment Variables</strong>.
              </li>
              <li>
                Add the following keys (click button to copy name):
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 mt-2">
                  {[
                    { label: 'CLOUDINARY_CLOUD_NAME', desc: 'Your Cloud Name' },
                    { label: 'CLOUDINARY_API_KEY', desc: 'Your API Key' },
                    { label: 'CLOUDINARY_API_SECRET', desc: 'Your API Secret' },
                    { label: 'CLOUDINARY_URL', desc: 'Or full URI' },
                  ].map((item) => (
                    <button
                      key={item.label}
                      type="button"
                      onClick={() => handleCopy(item.label, item.label)}
                      className="flex items-center justify-between p-2 rounded-lg bg-zinc-900 border border-zinc-800 hover:border-zinc-700 text-left transition-colors"
                    >
                      <div>
                        <div className="font-mono text-[11px] text-amber-400 font-semibold">{item.label}</div>
                        <div className="text-[10px] text-zinc-500">{item.desc}</div>
                      </div>
                      {copiedKey === item.label ? (
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                      ) : (
                        <Copy className="w-3.5 h-3.5 text-zinc-500" />
                      )}
                    </button>
                  ))}
                </div>
              </li>
              <li>
                <strong>Critical:</strong> Go to <strong>Deployments</strong> tab in Vercel, click <strong>•••</strong> on the latest build, and click <strong>Redeploy</strong> so Vercel loads your new keys!
              </li>
            </ol>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3 border-t border-zinc-800 bg-zinc-950/70 flex items-center justify-between text-xs text-zinc-400">
          <span className="font-mono text-[11px]">
            {status?.timestamp ? `Last checked: ${new Date(status.timestamp).toLocaleTimeString()}` : 'Checking...'}
          </span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-medium transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
