'use client';

import React, { useRef, useState } from 'react';
import { Upload, Sparkles, AlertCircle } from 'lucide-react';
import { PrivacyBadge } from './PrivacyBadge';

interface LandingViewProps {
  onImageSelected: (file: File | Blob, fileName: string) => void;
  onDemoSelected: () => void;
  isLoading?: boolean;
}

export const LandingView: React.FC<LandingViewProps> = ({
  onImageSelected,
  onDemoSelected,
  isLoading = false,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const file = files[0];
    const validTypes = ['image/jpeg', 'image/png', 'image/webp'];

    if (!validTypes.includes(file.type)) {
      setErrorMessage('Please select a JPEG, PNG, or WebP photo.');
      return;
    }

    setErrorMessage(null);
    onImageSelected(file, file.name);
  };

  const triggerFileInput = () => {
    setErrorMessage(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
      fileInputRef.current.click();
    }
  };

  return (
    <main className="relative min-h-screen w-full bg-[#000000] text-neutral-100 flex flex-col justify-between items-center px-6 py-12 select-none overflow-hidden">
      {/* Hidden native file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        onChange={handleFileChange}
        className="hidden"
        aria-label="Upload photo"
      />

      {/* Top Brand Tag */}
      <header className="pt-4 animate-fade-in">
        <span className="text-[11px] font-mono tracking-[0.3em] uppercase text-neutral-400">
          Sahasra Tech
        </span>
      </header>

      {/* Hero Center Presentation */}
      <section className="flex flex-col items-center text-center max-w-sm w-full mx-auto my-auto py-8">
        <h1 className="text-5xl md:text-6xl font-light tracking-[0.18em] uppercase text-white mb-4">
          SINGLE
        </h1>

        <p className="text-sm md:text-base text-neutral-400 font-light tracking-wide max-w-[240px] leading-relaxed mb-10">
          Turn your photo into a fold.
        </p>

        {/* Primary Action Button */}
        <div className="flex flex-col items-center gap-3 w-full">
          <button
            onClick={triggerFileInput}
            disabled={isLoading}
            className="w-full py-4 px-6 rounded-full bg-white text-black text-sm font-medium tracking-wide hover:bg-neutral-200 active:scale-[0.98] transition-all duration-200 shadow-xl flex items-center justify-center gap-2.5 focus:outline-none focus:ring-2 focus:ring-white/40 disabled:opacity-50"
          >
            <Upload className="w-4 h-4" />
            <span>{isLoading ? 'Processing photo...' : 'Choose a photo'}</span>
          </button>

          {/* Quick Demo Preview Button */}
          <button
            onClick={onDemoSelected}
            disabled={isLoading}
            className="py-2.5 px-4 text-xs tracking-wider text-neutral-400 hover:text-neutral-200 transition-colors flex items-center gap-1.5 focus:outline-none focus:ring-1 focus:ring-neutral-700 rounded-full"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>or try sample photo</span>
          </button>
        </div>

        {/* Error notification if wrong format */}
        {errorMessage && (
          <div
            role="alert"
            className="mt-6 flex items-center gap-2 text-xs text-red-400 bg-red-950/30 border border-red-900/40 px-3.5 py-2 rounded-xl"
          >
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}
      </section>

      {/* Bottom Privacy Assurance */}
      <footer className="pb-4">
        <PrivacyBadge />
      </footer>
    </main>
  );
};
