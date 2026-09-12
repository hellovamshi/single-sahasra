'use client';

import React from 'react';

interface BrandCrossfadeProps {
  className?: string;
}

export const BrandCrossfade: React.FC<BrandCrossfadeProps> = ({ className = '' }) => {
  return (
    <div className={`brand-crossfade ${className}`}>
      <a
        className="brand-link"
        href="https://www.instagram.com/sahasra.tech"
        target="_blank"
        rel="noopener noreferrer"
        title="Follow @sahasra.tech on Instagram"
      >
        sahasra tech
      </a>
    </div>
  );
};
