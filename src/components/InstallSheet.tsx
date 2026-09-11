'use client';

import React from 'react';

interface InstallSheetProps {
  isOpen: boolean;
  onDismiss: () => void;
}

export const InstallSheet: React.FC<InstallSheetProps> = ({ isOpen, onDismiss }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center p-3 bg-black/40 backdrop-blur-sm animate-fade-in pointer-events-auto">
      <div className="sheet glass w-full max-w-lg mb-4">
        <p className="sheet__eyebrow">Solo · Step 2 of 2</p>
        <h2>Keep it on your Home Screen</h2>
        <p>
          Solo is made to run as an app.
          From the Home Screen it opens edge to edge,
          without Safari’s bars, and remembers your photo.
        </p>
        <ol className="tiles">
          <li>Tap Share in Safari.</li>
          <li>Choose Add to Home Screen.</li>
          <li>Tap Add, then open Solo from the icon.</li>
        </ol>
        <div className="sheet__row">
          <button
            className="sheet__cta"
            type="button"
            onClick={onDismiss}
          >
            Got it
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
