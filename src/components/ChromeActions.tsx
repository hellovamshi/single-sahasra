'use client';

import React, { useRef, useState, useEffect } from 'react';
import { trackVisit } from '../analytics/tracker';

interface ChromeActionsProps {
  isHidden: boolean;
  hasCustomImage: boolean;
  hintText: string | null;
  onImageSelected: (file: File) => void;
  onUseDefault: () => void;
  onFullscreenClick: () => void;
  fullscreenLabel: string;
  isLaptop?: boolean;
  onOpenPhoneModal?: () => void;
}

export const ChromeActions: React.FC<ChromeActionsProps> = ({
  isHidden,
  hasCustomImage,
  hintText,
  onImageSelected,
  onUseDefault,
  onFullscreenClick,
  fullscreenLabel,
  isLaptop,
  onOpenPhoneModal,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showMadeWithLove, setShowMadeWithLove] = useState<boolean>(false);
  const [showFollowButton, setShowFollowButton] = useState<boolean>(false);
  const [stats, setStats] = useState<{ views: number; visitors: number } | null>(null);

  useEffect(() => {
    // 1. Analytics visit tracking
    trackVisit().then((data) => {
      if (data) setStats(data);
    });

    // 2. Pop up Made with love after 2 seconds
    const timer1 = setTimeout(() => {
      setShowMadeWithLove(true);
    }, 2000);

    // 3. Pop up Join WhatsApp Channel button after 5 seconds
    const timer2 = setTimeout(() => {
      setShowFollowButton(true);
    }, 5000);

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
    };
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onImageSelected(file);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  return (
    <>
      {/* Corner Credit & Live Views Badge: Pops up after 2s */}
      <div className={`corner-credit-container ${showMadeWithLove && !isHidden ? 'is-visible' : ''}`}>
        <a
          className="corner-credit glass"
          href="https://whatsapp.com/channel/0029Vb7g8UH3AzNPp9Wfkb1S"
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Join Sahasra Tech WhatsApp Channel"
        >
          Made with ❤️ by Sahasra Tech
        </a>
        {stats && stats.views > 0 && (
          <span className="stats-pill glass" title={`${stats.visitors} unique visitors`}>
            👁️ {stats.views.toLocaleString()} views
          </span>
        )}
      </div>

      {/* Join WhatsApp Channel Button: Pops up after 5s */}
      <a
        className={`follow-pill whatsapp-pill glass ${showFollowButton && !isHidden ? 'is-visible' : ''}`}
        href="https://whatsapp.com/channel/0029Vb7g8UH3AzNPp9Wfkb1S"
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Join Sahasra Tech WhatsApp Channel"
      >
        <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <path d="M12.04 2c-5.46 0-9.91 4.45-9.91 9.91 0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38c1.45.79 3.08 1.21 4.74 1.21 5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.01A9.816 9.816 0 0 0 12.04 2m.01 1.67c2.2 0 4.26.86 5.82 2.42a8.225 8.225 0 0 1 2.41 5.83c0 4.54-3.7 8.24-8.24 8.24-1.48 0-2.93-.4-4.2-1.15l-.3-.18-3.12.82.83-3.04-.2-.31a8.196 8.196 0 0 1-1.26-4.38c0-4.54 3.7-8.24 8.24-8.24m4.52 11.66c-.25-.12-1.47-.72-1.7-.81-.23-.08-.39-.12-.56.12-.17.25-.64.81-.79.97-.14.17-.29.19-.54.07-.25-.12-1.05-.39-1.99-1.23-.74-.66-1.23-1.47-1.38-1.72-.14-.25-.02-.38.11-.5.11-.11.25-.29.37-.43.12-.14.17-.25.25-.41.08-.17.04-.31-.02-.43s-.56-1.34-.76-1.84c-.2-.48-.41-.42-.56-.43h-.48c-.17 0-.43.06-.66.31-.22.25-.86.84-.86 2.06 0 1.21.89 2.39 1.01 2.56.12.17 1.75 2.67 4.23 3.74.59.26 1.05.41 1.41.53.59.19 1.13.16 1.56.1.48-.07 1.47-.6 1.67-1.18.21-.58.21-1.07.15-1.18-.07-.1-.23-.17-.48-.29" />
        </svg>
        <span>Join WhatsApp Channel</span>
      </a>

      {/* Top Floating Controls */}
      <div className="chrome">
        <div className={`actions ${isHidden ? 'is-hidden' : ''}`}>
          <label className="pill glass">
            Choose image
            <input
              ref={fileInputRef}
              className="picker"
              type="file"
              accept="image/*"
              onChange={handleFileChange}
            />
          </label>

          {hasCustomImage && (
            <button
              className="pill glass"
              type="button"
              onClick={onUseDefault}
            >
              Use default
            </button>
          )}

          <button
            className="pill glass"
            type="button"
            onClick={onFullscreenClick}
          >
            {fullscreenLabel}
          </button>

          {isLaptop && onOpenPhoneModal && (
            <button
              className="pill glass"
              type="button"
              onClick={onOpenPhoneModal}
            >
              📱 Open on phone
            </button>
          )}
        </div>

        {/* Floating Hint */}
        {hintText && (
          <p className="hint glass" role="status">
            {hintText}
          </p>
        )}
      </div>
    </>
  );
};
