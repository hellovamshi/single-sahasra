'use client';

import React from 'react';

interface DesktopQRModalProps {
  isOpen: boolean;
  onDismiss: () => void;
  url: string;
}

export const DesktopQRModal: React.FC<DesktopQRModalProps> = ({ isOpen, onDismiss, url }) => {
  if (!isOpen) return null;

  const qrCodeUrl = 'https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=' + encodeURIComponent(url) + '&bgcolor=0a0d14&color=ffffff&qzone=1';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-md animate-fade-in pointer-events-auto">
      <div className="sheet glass w-full max-w-sm text-center p-6 mb-0">
        <p className="sheet__eyebrow">Experience on Phone</p>
        <h2 className="text-2xl font-bold mb-2">Scan with your iPhone</h2>
        <p className="text-sm text-white/70 mb-4">
          Point your iPhone Camera at this QR code to open the live gravity fold experience.
        </p>

        <div className="flex justify-center mb-5">
          <div className="p-3 rounded-2xl bg-white/5 border border-white/15 shadow-2xl">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={qrCodeUrl}
              alt="Scan to open on iPhone"
              width={180}
              height={180}
              className="rounded-xl"
            />
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <button
            className="sheet__cta w-full justify-center"
            type="button"
            onClick={onDismiss}
            autoFocus
          >
            Continue on Laptop
          </button>
          <a
            className="sheet__credit justify-center text-xs text-white/60 hover:text-white"
            href="https://whatsapp.com/channel/0029Vb7g8UH3AzNPp9Wfkb1S"
            target="_blank"
            rel="noopener noreferrer"
          >
            Made by Sahasra Tech
          </a>
        </div>
      </div>
    </div>
  );
};
