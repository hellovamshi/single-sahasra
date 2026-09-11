'use client';

import React, { useState, useEffect } from 'react';
import { RotateCcw, Image as ImageIcon, Sliders } from 'lucide-react';
import { HingeDirection } from '../motion/types';

interface ControlsOverlayProps {
  onReset: () => void;
  onChangePhoto: () => void;
  isMotionActive: boolean;
  instructionText?: string;
  reducedMotion?: boolean;
  onManualFoldChange?: (hinge: HingeDirection, amount: number) => void;
}

export const ControlsOverlay: React.FC<ControlsOverlayProps> = ({
  onReset,
  onChangePhoto,
  isMotionActive,
  instructionText,
  reducedMotion = false,
  onManualFoldChange,
}) => {
  const [showHint, setShowHint] = useState(true);
  const [manualAmount, setManualAmount] = useState(0);
  const [manualHinge, setManualHinge] = useState<HingeDirection>('LEFT');

  // Auto-hide the hint after 4 seconds
  useEffect(() => {
    const timer = setTimeout(() => {
      setShowHint(false);
    }, 4500);
    return () => clearTimeout(timer);
  }, []);

  const handleManualSlider = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value); // -1.0 to 1.0
    const hinge: HingeDirection = val >= 0 ? 'LEFT' : 'RIGHT';
    const amount = Math.abs(val);
    setManualHinge(hinge);
    setManualAmount(amount);
    if (onManualFoldChange) {
      onManualFoldChange(hinge, amount);
    }
  };

  return (
    <div className="absolute inset-0 pointer-events-none flex flex-col justify-between p-6 select-none z-30">
      {/* Top instruction pill */}
      <div className="flex justify-center pt-2">
        {showHint && instructionText && (
          <div
            role="status"
            aria-live="polite"
            className="pointer-events-auto px-4 py-2 rounded-full bg-neutral-900/70 border border-neutral-800/80 text-xs tracking-wider text-neutral-300 backdrop-blur-md transition-opacity duration-1000 animate-fade-in shadow-lg"
          >
            {instructionText}
          </div>
        )}
      </div>

      {/* Center/Accessible controls for Reduced Motion */}
      {reducedMotion && (
        <div className="flex justify-center my-auto">
          <div className="pointer-events-auto w-72 bg-neutral-950/80 border border-neutral-800 backdrop-blur-md rounded-2xl p-4 shadow-2xl flex flex-col gap-3">
            <div className="flex items-center justify-between text-xs text-neutral-400">
              <span className="flex items-center gap-1.5">
                <Sliders className="w-3.5 h-3.5" />
                Manual Fold
              </span>
              <span>{Math.round(manualAmount * 100)}% ({manualHinge})</span>
            </div>
            <input
              type="range"
              min="-1"
              max="1"
              step="0.01"
              value={manualHinge === 'LEFT' ? manualAmount : -manualAmount}
              onChange={handleManualSlider}
              aria-label="Adjust fold amount and hinge direction"
              className="w-full accent-white cursor-pointer h-1.5 bg-neutral-800 rounded-lg appearance-none"
            />
            <div className="flex justify-between text-[10px] text-neutral-500">
              <span>Right Hinge</span>
              <span>Flat</span>
              <span>Left Hinge</span>
            </div>
          </div>
        </div>
      )}

      {/* Bottom control pill */}
      <div className="flex justify-center pb-safe mb-2">
        <nav
          aria-label="Viewer actions"
          className="pointer-events-auto inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-neutral-950/75 border border-neutral-800/80 backdrop-blur-xl shadow-2xl transition-transform active:scale-[0.99]"
        >
          <button
            onClick={onReset}
            className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-medium text-neutral-300 hover:text-white hover:bg-neutral-800/50 transition-colors focus:outline-none focus:ring-2 focus:ring-white/40"
            title="Reset fold to flat position"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset</span>
          </button>

          <div className="w-px h-3.5 bg-neutral-800" />

          <button
            onClick={onChangePhoto}
            className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-medium text-neutral-300 hover:text-white hover:bg-neutral-800/50 transition-colors focus:outline-none focus:ring-2 focus:ring-white/40"
            title="Choose a different photo"
          >
            <ImageIcon className="w-3.5 h-3.5" />
            <span>Change photo</span>
          </button>
        </nav>
      </div>
    </div>
  );
};
