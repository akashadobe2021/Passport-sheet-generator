import React from 'react';
import { ArrowLeft, Check } from 'lucide-react';
import { EditorSection } from './EditorSection';
import { CropState, PhotoPreset } from '../types/passport';
import { ServerStatusResponse } from '../types/serverStatus';

interface CropFocusViewProps {
  image: HTMLImageElement | null;
  crop: CropState;
  setCrop: React.Dispatch<React.SetStateAction<CropState>>;
  selectedPreset: PhotoPreset;
  customWidthMm: number;
  customHeightMm: number;
  showGuides: boolean;
  setShowGuides: (show: boolean) => void;
  onReturnToStudio: () => void;
  cutoutImg?: HTMLImageElement | null;
  setCutoutImg?: (img: HTMLImageElement | null) => void;
  serverStatus?: ServerStatusResponse | null;
  onOpenServerStatusModal?: () => void;
}

export const CropFocusView: React.FC<CropFocusViewProps> = ({
  image,
  crop,
  setCrop,
  selectedPreset,
  customWidthMm,
  customHeightMm,
  showGuides,
  setShowGuides,
  onReturnToStudio,
  cutoutImg,
  setCutoutImg,
  serverStatus,
  onOpenServerStatusModal,
}) => {
  return (
    <div className="space-y-4">
      {/* Top navigation back to sheet */}
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={onReturnToStudio}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-zinc-300 hover:text-white bg-zinc-900 border border-zinc-800 hover:border-zinc-700 px-3 py-1.5 rounded-lg transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5 text-amber-400" />
          <span>Back to Sheet Studio</span>
        </button>

        <button
          type="button"
          onClick={onReturnToStudio}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-zinc-950 bg-amber-400 hover:bg-amber-300 px-3.5 py-1.5 rounded-lg transition-colors shadow-sm"
        >
          <Check className="w-3.5 h-3.5" />
          <span>Done & Update Sheet</span>
        </button>
      </div>

      <EditorSection
        image={image}
        crop={crop}
        setCrop={setCrop}
        selectedPreset={selectedPreset}
        customWidthMm={customWidthMm}
        customHeightMm={customHeightMm}
        showGuides={showGuides}
        setShowGuides={setShowGuides}
        cutoutImg={cutoutImg}
        setCutoutImg={setCutoutImg}
        serverStatus={serverStatus}
        onOpenServerStatusModal={onOpenServerStatusModal}
      />
    </div>
  );
};

