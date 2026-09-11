'use client';

import React, { useRef } from 'react';

interface ChromeActionsProps {
  isHidden: boolean;
  hasCustomImage: boolean;
  hintText: string | null;
  onImageSelected: (file: File) => void;
  onUseDefault: () => void;
  onFullscreenClick: () => void;
  fullscreenLabel: string;
}

export const ChromeActions: React.FC<ChromeActionsProps> = ({
  isHidden,
  hasCustomImage,
  hintText,
  onImageSelected,
  onUseDefault,
  onFullscreenClick,
  fullscreenLabel,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onImageSelected(file);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  return (
    <>
      {/* Corner Credit */}
      <a
        className="corner-credit"
        href="https://www.instagram.com/sahasra.tech"
        target="_blank"
        rel="noopener noreferrer"
      >
        Made with ❤️ by Sahasra Tech
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
