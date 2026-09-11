'use client';

import React from 'react';

interface MotionSheetProps {
  isOpen: boolean;
  onAllow: () => void;
}

export const MotionSheet: React.FC<MotionSheetProps> = ({ isOpen, onAllow }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center p-3 bg-black/40 backdrop-blur-sm animate-fade-in pointer-events-auto">
      <div className="sheet glass w-full max-w-lg mb-4">
        <p className="sheet__eyebrow">Solo · Step 1 of 2</p>
        <h2>Roll to fold</h2>
        <p>
          Solo folds the picture as you roll your iPhone.
          It reads the motion sensors and nothing leaves your device.
        </p>
        <div className="sheet__row">
          <button
            className="sheet__cta"
            type="button"
            onClick={onAllow}
            autoFocus
          >
            Allow motion
          </button>
          <a
            className="sheet__credit"
            href="https://www.instagram.com/sahasra.tech"
            target="_blank"
            rel="noopener noreferrer"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
              <rect x="3" y="3" width="18" height="18" rx="5.5" />
              <circle cx="12" cy="12" r="4" />
              <circle cx="17.4" cy="6.6" r="1" fill="currentColor" stroke="none" />
            </svg>
            <span>Made by Sahasra Tech</span>
          </a>
        </div>
      </div>
    </div>
  );
};
