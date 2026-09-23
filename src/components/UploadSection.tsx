import React, { useRef, useState } from 'react';
import { UploadCloud, Image as ImageIcon, Sparkles, AlertTriangle, CheckCircle2, AlertOctagon } from 'lucide-react';
import { QualityValidation } from '../types/passport';
import { generateSamplePassportPhoto } from '../utils/samplePhoto';

interface UploadSectionProps {
  onImageLoaded: (img: HTMLImageElement, fileName: string, fileSizeKb: number) => void;
  quality: QualityValidation | null;
  fileName: string | null;
  fileSizeKb: number | null;
}

export const UploadSection: React.FC<UploadSectionProps> = ({
  onImageLoaded,
  quality,
  fileName,
  fileSizeKb,
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const processFile = (file: File) => {
    if (!file.type.match(/image\/(jpeg|jpg|png)/i)) {
      alert('Please upload a JPG, JPEG, or PNG photograph.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        onImageLoaded(img, file.name, Math.round(file.size / 1024));
      };
      img.src = e.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0]);
    }
  };

  const handleLoadSample = () => {
    const sampleDataUrl = generateSamplePassportPhoto();
    const img = new Image();
    img.onload = () => {
      onImageLoaded(img, 'sample-indian-passport-photo.jpg', 184);
    };
    img.src = sampleDataUrl;
  };

  return (
    <div className="bg-neutral-900/80 border border-neutral-800 rounded-xl p-4 lg:p-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
        <div>
          <h2 className="text-sm font-semibold text-neutral-200">1. Upload Photograph</h2>
          <p className="text-xs text-neutral-400 mt-0.5">
            Accepts JPG, JPEG, or PNG. High-resolution camera originals recommended.
          </p>
        </div>

        <button
          type="button"
          onClick={handleLoadSample}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-amber-400 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/20 rounded-md transition-colors whitespace-nowrap self-start sm:self-auto"
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>Load Sample Photo</span>
        </button>
      </div>

      {/* Drop Zone */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`relative border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-all ${
          isDragging
            ? 'border-amber-400 bg-amber-500/5'
            : 'border-neutral-700/70 hover:border-neutral-600 bg-neutral-950/40 hover:bg-neutral-950/70'
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/jpg"
          className="hidden"
          onChange={handleFileChange}
        />

        <div className="flex flex-col items-center justify-center gap-2">
          <div className="w-10 h-10 rounded-full bg-neutral-800/80 flex items-center justify-center text-neutral-400">
            <UploadCloud className="w-5 h-5" />
          </div>
          <div className="text-xs text-neutral-300">
            <span className="font-semibold text-amber-400">Click to browse</span> or drag and drop your photo here
          </div>
          <div className="text-[11px] text-neutral-500">
            JPG, JPEG, PNG up to 25MB · Runs 100% locally on your machine
          </div>
        </div>
      </div>

      {/* Image Info & Resolution Validation Card */}
      {fileName && quality && (
        <div className="mt-3 pt-3 border-t border-neutral-800 flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 text-neutral-400 min-w-0">
            <ImageIcon className="w-4 h-4 text-neutral-500 shrink-0" />
            <span className="font-medium text-neutral-200 truncate">{fileName}</span>
            <span>·</span>
            <span className="font-mono text-neutral-400 shrink-0">
              {quality.originalPixels.width} × {quality.originalPixels.height} px
            </span>
            {fileSizeKb && (
              <>
                <span>·</span>
                <span className="font-mono text-neutral-400 shrink-0">{fileSizeKb} KB</span>
              </>
            )}
          </div>

          {/* Print Resolution Indicator */}
          <div className="flex items-center gap-2 shrink-0">
            {quality.qualityLevel === 'excellent' && (
              <div className="flex items-center gap-1.5 text-emerald-400">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span className="font-medium">Print Ready</span>
                <span className="font-mono text-neutral-400 tabular-nums">({quality.effectiveDpi} DPI)</span>
              </div>
            )}

            {quality.qualityLevel === 'good' && (
              <div className="flex items-center gap-1.5 text-emerald-400">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span className="font-medium">Studio Standard</span>
                <span className="font-mono text-neutral-400 tabular-nums">({quality.effectiveDpi} DPI)</span>
              </div>
            )}

            {quality.qualityLevel === 'warning' && (
              <div className="flex items-center gap-1.5 text-amber-400" title={quality.warningMessage}>
                <AlertTriangle className="w-3.5 h-3.5" />
                <span className="font-medium">Moderate Quality</span>
                <span className="font-mono text-neutral-400 tabular-nums">({quality.effectiveDpi} DPI)</span>
              </div>
            )}

            {quality.qualityLevel === 'critical' && (
              <div className="flex items-center gap-1.5 text-rose-400" title={quality.warningMessage}>
                <AlertOctagon className="w-3.5 h-3.5" />
                <span className="font-medium">Low Resolution</span>
                <span className="font-mono text-neutral-400 tabular-nums">({quality.effectiveDpi} DPI)</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Warning banner if critical or low resolution */}
      {quality && quality.warningMessage && (
        <div className="mt-2.5 p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
          <p>{quality.warningMessage}</p>
        </div>
      )}
    </div>
  );
};
