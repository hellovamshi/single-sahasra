'use client';

import React, { useRef, useState, useEffect } from 'react';

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

  useEffect(() => {
    // Pop up Made with love after 2 seconds
    const timer1 = setTimeout(() => {
      setShowMadeWithLove(true);
    }, 2000);

    // Pop up Follow Sahasra Tech button after 5 seconds
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
      {/* Corner Credit: Pops up after 2s */}
      <a
        className={`corner-credit glass ${showMadeWithLove && !isHidden ? 'is-visible' : ''}`}
        href="https://www.instagram.com/sahasra.tech"
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Made with love by Sahasra Tech"
      >
        Made with ❤️ by Sahasra Tech
      </a>

      {/* Follow Sahasra Tech Button: Pops up after 5s */}
      <a
        className={`follow-pill glass ${showFollowButton && !isHidden ? 'is-visible' : ''}`}
        href="https://www.instagram.com/sahasra.tech"
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Follow Sahasra Tech on Instagram"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
          <rect x="3" y="3" width="18" height="18" rx="5.5" />
          <circle cx="12" cy="12" r="4" />
          <circle cx="17.4" cy="6.6" r="1" fill="currentColor" stroke="none" />
        </svg>
        <span>Follow Sahasra Tech</span>
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
