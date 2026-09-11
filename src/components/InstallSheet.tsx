'use client';

import React from 'react';
import { BrandCrossfade } from './BrandCrossfade';

interface InstallSheetProps {
  isOpen: boolean;
  onDismiss: () => void;
  isAndroid: boolean;
  onInstallNow?: () => void;
  canInstallDirectly?: boolean;
}

export const InstallSheet: React.FC<InstallSheetProps> = ({
  isOpen,
  onDismiss,
  isAndroid,
  onInstallNow,
  canInstallDirectly,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center p-3 bg-black/50 backdrop-blur-sm animate-fade-in pointer-events-auto">
      <div className="sheet glass w-full max-w-lg mb-4">
        <p className="sheet__eyebrow">{isAndroid ? 'Solo for Android' : 'Solo for iPhone'}</p>
        <h2>{isAndroid ? 'Install Solo App' : 'Add to Home Screen'}</h2>
        <p>
          {isAndroid
            ? 'Install Solo to your Home Screen for a seamless edge-to-edge experience without browser bars.'
            : 'Solo is made to run as an app. From your Home Screen it opens edge to edge, without Safari’s bars.'}
        </p>

        {isAndroid ? (
          canInstallDirectly ? (
            <div className="mb-4">
              <button
                className="sheet__cta w-full justify-center text-base py-3 font-semibold shadow-lg"
                type="button"
                onClick={onInstallNow}
                autoFocus
              >
                Install Now
              </button>
            </div>
          ) : (
            <ol className="tiles">
              <li>Tap Chrome menu (⋮) at top-right.</li>
              <li>Tap "Install app" or "Add to Home screen".</li>
              <li>Open Solo from your Home Screen.</li>
            </ol>
          )
        ) : (
          <ol className="tiles">
            <li>Tap Share (□↑) in Safari.</li>
            <li>Choose Add to Home Screen.</li>
            <li>Tap Add, then open Solo from the icon.</li>
          </ol>
        )}

        <div className="sheet__row">
          <button
            className="sheet__cta"
            type="button"
            onClick={onDismiss}
          >
            {isAndroid && canInstallDirectly ? 'Maybe Later' : 'Got it'}
          </button>
          <BrandCrossfade />
        </div>
      </div>
    </div>
  );
};
