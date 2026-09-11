'use client';

import React from 'react';
import { BrandCrossfade } from './BrandCrossfade';

interface MotionSheetProps {
  isOpen: boolean;
  onAllow: () => void;
  onDismiss?: () => void;
}

export const MotionSheet: React.FC<MotionSheetProps> = ({ isOpen, onAllow, onDismiss }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center p-3 bg-black/50 backdrop-blur-sm animate-fade-in pointer-events-auto">
      <div className="sheet glass w-full max-w-lg mb-4">
        <p className="sheet__eyebrow">Solo · Step 1 of 2</p>
        <h2>Roll to fold</h2>
        <p>
          Solo folds the picture as you roll your iPhone.
          It reads the motion sensors and nothing leaves your device.
        </p>
        <div className="sheet__row flex items-center justify-between gap-3 pt-2">
          <div className="flex items-center gap-2">
            <button
              className="sheet__cta text-base py-3 px-6 font-semibold shadow-lg"
              type="button"
              onClick={onAllow}
              autoFocus
            >
              Allow motion
            </button>
            {onDismiss && (
              <button
                className="sheet__cta bg-white/10 hover:bg-white/20 text-white/70 hover:text-white"
                type="button"
                onClick={onDismiss}
              >
                Later
              </button>
            )}
          </div>
          <BrandCrossfade />
        </div>
      </div>
    </div>
  );
};
