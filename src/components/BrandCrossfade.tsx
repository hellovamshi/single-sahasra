'use client';

import React from 'react';

interface BrandCrossfadeProps {
  className?: string;
}

export const BrandCrossfade: React.FC<BrandCrossfadeProps> = ({ className = '' }) => {
  return (
    <div className={`brand-crossfade ${className}`}>
      <a
        className="brand-link text-ainox"
        href="https://ainox.in"
        target="_blank"
        rel="noopener noreferrer"
        title="Created by ainox.in"
      >
        made by ainox.in
      </a>
      <a
        className="brand-link text-sahasra"
        href="https://www.instagram.com/sahasra.tech"
        target="_blank"
        rel="noopener noreferrer"
        title="Follow @sahasra.tech"
      >
        sahasra tech
      </a>
    </div>
  );
};
