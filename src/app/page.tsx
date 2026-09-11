'use client';

import React, { useState, useEffect } from 'react';
import { LandingView } from '../components/LandingView';
import { FoldCanvas } from '../components/FoldCanvas';
import { processImageFile, ProcessedImage } from '../utils/imageProcessing';
import { createSamplePhotoBlob } from '../utils/sampleImage';
import { saveActiveImage, loadActiveImage } from '../storage/imageStorage';

export default function HomePage() {
  const [activeImage, setActiveImage] = useState<ProcessedImage | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  // Attempt to restore cached image on mount if available
  useEffect(() => {
    async function restoreCached() {
      try {
        const cached = await loadActiveImage();
        if (cached) {
          const processed = await processImageFile(cached.blob, cached.name);
          setActiveImage(processed);
        }
      } catch (err) {
        console.warn('Failed to restore cached image:', err);
      }
    }

    restoreCached();
  }, []);

  const handleImageSelected = async (file: File | Blob, fileName: string) => {
    setIsLoading(true);
    try {
      const processed = await processImageFile(file, fileName);
      setActiveImage(processed);
      await saveActiveImage(file, fileName, processed.width, processed.height);
    } catch (err) {
      console.error('Failed to process selected image:', err);
      alert('Could not process this image file. Please try another.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDemoSelected = async () => {
    setIsLoading(true);
    try {
      const sampleBlob = await createSamplePhotoBlob();
      const processed = await processImageFile(sampleBlob, 'sahasra-sample.jpg');
      setActiveImage(processed);
      await saveActiveImage(sampleBlob, 'sahasra-sample.jpg', processed.width, processed.height);
    } catch (err) {
      console.error('Failed to load sample image:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleChangePhoto = () => {
    setActiveImage(null);
  };

  return (
    <div className="w-full h-full min-h-screen bg-[#000000] text-white">
      {activeImage ? (
        <FoldCanvas image={activeImage} onChangePhoto={handleChangePhoto} />
      ) : (
        <LandingView
          onImageSelected={handleImageSelected}
          onDemoSelected={handleDemoSelected}
          isLoading={isLoading}
        />
      )}
    </div>
  );
}
