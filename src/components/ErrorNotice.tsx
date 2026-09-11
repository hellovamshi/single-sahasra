'use client';

import React from 'react';
import { AlertCircle, RotateCcw } from 'lucide-react';

interface ErrorNoticeProps {
  title: string;
  message: string;
  onRetry?: () => void;
  retryLabel?: string;
}

export const ErrorNotice: React.FC<ErrorNoticeProps> = ({
  title,
  message,
  onRetry,
  retryLabel = 'Try again',
}) => {
  return (
    <div
      role="alert"
      className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/90 backdrop-blur-md text-white"
    >
      <div className="max-w-md w-full bg-neutral-950 border border-neutral-800/80 rounded-2xl p-7 text-center shadow-2xl flex flex-col items-center">
        <div className="w-12 h-12 rounded-full bg-red-950/40 border border-red-900/50 flex items-center justify-center mb-4 text-red-400">
          <AlertCircle className="w-6 h-6" />
        </div>
        <h2 className="text-xl font-medium tracking-tight mb-2 text-neutral-100">{title}</h2>
        <p className="text-sm text-neutral-400 font-light leading-relaxed mb-6">{message}</p>
        {onRetry && (
          <button
            onClick={onRetry}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-white text-black text-sm font-medium hover:bg-neutral-200 transition-colors focus:outline-none focus:ring-2 focus:ring-white/40"
          >
            <RotateCcw className="w-4 h-4" />
            <span>{retryLabel}</span>
          </button>
        )}
      </div>
    </div>
  );
};
