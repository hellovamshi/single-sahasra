'use client';

import React from 'react';
import { ShieldCheck } from 'lucide-react';

export const PrivacyBadge: React.FC<{ className?: string }> = ({ className = '' }) => {
  return (
    <div
      className={`inline-flex items-center gap-2 text-xs tracking-wide text-neutral-400 font-normal select-none ${className}`}
      aria-label="Privacy guarantee: Your photo stays on your device"
    >
      <ShieldCheck className="w-3.5 h-3.5 text-neutral-400" />
      <span>Your photo stays on your device.</span>
    </div>
  );
};
