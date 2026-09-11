'use client';

import React from 'react';
import { Smartphone, Sparkles, X } from 'lucide-react';

interface MotionPermissionModalProps {
  onEnable: () => void;
  onDismiss: () => void;
}

export const MotionPermissionModal: React.FC<MotionPermissionModalProps> = ({
  onEnable,
  onDismiss,
}) => {
  return (
    <div className="fixed inset-x-4 top-6 z-40 flex justify-center pointer-events-none animate-fade-in">
      <div className="w-full max-w-sm bg-neutral-900/90 border border-neutral-700/60 backdrop-blur-xl rounded-2xl p-4 shadow-2xl pointer-events-auto flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center shrink-0 text-white">
          <Smartphone className="w-5 h-5" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-medium text-white tracking-tight">Enable Motion</h3>
          <p className="text-xs text-neutral-400 truncate">Roll your phone physically to fold</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={onEnable}
            className="px-3.5 py-1.5 rounded-full bg-white text-black text-xs font-semibold hover:bg-neutral-200 transition-colors shadow-sm focus:outline-none focus:ring-2 focus:ring-white/40"
          >
            Enable
          </button>
          <button
            onClick={onDismiss}
            aria-label="Dismiss motion prompt"
            className="p-1.5 rounded-full text-neutral-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
