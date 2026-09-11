'use client';

import React, { useEffect } from 'react';
import { BrandCrossfade } from './BrandCrossfade';
import { trackEvent } from '../analytics/tracker';

interface SocialPopupProps {
  isOpen: boolean;
  onDismiss: () => void;
}

export const SocialPopup: React.FC<SocialPopupProps> = ({ isOpen, onDismiss }) => {
  useEffect(() => {
    if (isOpen) {
      trackEvent('social_popup_shown');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center p-3 bg-black/60 backdrop-blur-md animate-fade-in pointer-events-auto">
      <div className="sheet glass w-full max-w-md mb-4 border border-white/10 shadow-2xl">
        <p className="sheet__eyebrow text-emerald-400 font-semibold tracking-wider text-xs">Community</p>
        <h2 className="text-2xl font-bold text-white mb-2">Connect with Sahasra</h2>
        <p className="text-sm text-white/70 mb-5">
          Join our official channels for new features, tech updates, and exclusive releases.
        </p>

        <div className="flex flex-col gap-3 mb-6">
          {/* Join WhatsApp Channel */}
          <a
            href="https://whatsapp.com/channel/0029Vb7g8UH3AzNPp9Wfkb1S"
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => trackEvent('whatsapp_popup_click')}
            className="flex items-center gap-3.5 p-3.5 rounded-2xl bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/35 transition-all duration-200 active:scale-98 group text-white"
          >
            <div className="w-11 h-11 rounded-xl bg-[#25D366] flex items-center justify-center text-white shrink-0 shadow-lg shadow-emerald-500/30 group-hover:scale-105 transition-transform">
              <svg viewBox="0 0 24 24" className="w-6 h-6 fill-current" aria-hidden="true">
                <path d="M12.04 2c-5.46 0-9.91 4.45-9.91 9.91 0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38c1.45.79 3.08 1.21 4.74 1.21 5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.01A9.816 9.816 0 0 0 12.04 2m.01 1.67c2.2 0 4.26.86 5.82 2.42a8.225 8.225 0 0 1 2.41 5.83c0 4.54-3.7 8.24-8.24 8.24-1.48 0-2.93-.4-4.2-1.15l-.3-.18-3.12.82.83-3.04-.2-.31a8.196 8.196 0 0 1-1.26-4.38c0-4.54 3.7-8.24 8.24-8.24m4.52 11.66c-.25-.12-1.47-.72-1.7-.81-.23-.08-.39-.12-.56.12-.17.25-.64.81-.79.97-.14.17-.29.19-.54.07-.25-.12-1.05-.39-1.99-1.23-.74-.66-1.23-1.47-1.38-1.72-.14-.25-.02-.38.11-.5.11-.11.25-.29.37-.43.12-.14.17-.25.25-.41.08-.17.04-.31-.02-.43s-.56-1.34-.76-1.84c-.2-.48-.41-.42-.56-.43h-.48c-.17 0-.43.06-.66.31-.22.25-.86.84-.86 2.06 0 1.21.89 2.39 1.01 2.56.12.17 1.75 2.67 4.23 3.74.59.26 1.05.41 1.41.53.59.19 1.13.16 1.56.1.48-.07 1.47-.6 1.67-1.18.21-.58.21-1.07.15-1.18-.07-.1-.23-.17-.48-.29" />
              </svg>
            </div>
            <div className="flex flex-col text-left">
              <span className="font-semibold text-base leading-tight">Join WhatsApp Channel</span>
              <span className="text-xs text-emerald-300/80 mt-0.5">Instant alerts & community</span>
            </div>
            <svg className="w-5 h-5 ml-auto text-white/40 group-hover:text-white group-hover:translate-x-0.5 transition-all" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
            </svg>
          </a>

          {/* Follow Instagram */}
          <a
            href="https://www.instagram.com/sahasra.tech"
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => trackEvent('instagram_click')}
            className="flex items-center gap-3.5 p-3.5 rounded-2xl bg-gradient-to-r from-purple-500/15 via-pink-500/15 to-orange-500/15 hover:from-purple-500/25 hover:via-pink-500/25 hover:to-orange-500/25 border border-pink-500/35 transition-all duration-200 active:scale-98 group text-white"
          >
            <div className="w-11 h-11 rounded-xl bg-gradient-to-tr from-[#fd5949] via-[#d6249f] to-[#285AEB] flex items-center justify-center text-white shrink-0 shadow-lg shadow-pink-500/25 group-hover:scale-105 transition-transform">
              <svg viewBox="0 0 24 24" className="w-6 h-6 fill-current" aria-hidden="true">
                <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
              </svg>
            </div>
            <div className="flex flex-col text-left">
              <span className="font-semibold text-base leading-tight">Follow Instagram</span>
              <span className="text-xs text-pink-300/80 mt-0.5">@sahasra.tech</span>
            </div>
            <svg className="w-5 h-5 ml-auto text-white/40 group-hover:text-white group-hover:translate-x-0.5 transition-all" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
            </svg>
          </a>
        </div>

        <div className="sheet__row flex items-center justify-between pt-1">
          <button
            className="sheet__cta py-2.5 px-6"
            type="button"
            onClick={() => {
              trackEvent('social_popup_dismissed');
              onDismiss();
            }}
          >
            Continue
          </button>
          <BrandCrossfade />
        </div>
      </div>
    </div>
  );
};
