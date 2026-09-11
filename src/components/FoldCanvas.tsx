'use client';

import React, { useRef, useEffect, useState, useCallback } from 'react';
import { FoldRenderer } from '../webgl/renderer';
import { InputController } from '../motion/inputController';
import { MotionSheet } from './MotionSheet';
import { InstallSheet } from './InstallSheet';
import { ChromeActions } from './ChromeActions';
import { saveActiveImage, loadActiveImage, clearActiveImage } from '../storage/imageStorage';

const DEFAULT_IMAGE_PATH = '/backgrounds/default.jpg';
const FALLBACK_IMAGE_PATH = '/backgrounds/default.png';
const INSTALL_SHOWN_KEY = 'sahasra_install_shown';

export const FoldCanvas: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rendererRef = useRef<FoldRenderer | null>(null);
  const inputControllerRef = useRef<InputController | null>(null);
  const pointerDownPos = useRef<{ x: number; y: number } | null>(null);

  const [hasCustomImage, setHasCustomImage] = useState<boolean>(false);
  const [isChromeHidden, setIsChromeHidden] = useState<boolean>(false);
  const [showMotionSheet, setShowMotionSheet] = useState<boolean>(false);
  const [showInstallSheet, setShowInstallSheet] = useState<boolean>(false);
  const [hintText, setHintText] = useState<string | null>(null);
  const [fullscreenLabel, setFullscreenLabel] = useState<string>('Fullscreen');

  // Load and apply an image to the renderer
  const applyImageSource = useCallback((source: HTMLImageElement) => {
    if (rendererRef.current) {
      rendererRef.current.setImage(source, source.naturalWidth || source.width, source.naturalHeight || source.height);
    }
  }, []);

  const loadImageFromUrl = useCallback((url: string): Promise<HTMLImageElement> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = url;
    });
  }, []);

  // Initialize Canvas & WebGL Stage
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Detect standalone app mode
    const isApp =
      Boolean((navigator as unknown as { standalone?: boolean }).standalone) ||
      ['fullscreen', 'standalone', 'minimal-ui'].some((m) =>
        window.matchMedia(`(display-mode: ${m})`).matches
      );

    if (isApp) {
      document.documentElement.classList.add('is-app');
    }

    // Fullscreen support detection
    if (!document.fullscreenEnabled) {
      setFullscreenLabel('Add to Home Screen');
    }

    // 1. Initialize Input Controller
    const inputController = new InputController();
    inputControllerRef.current = inputController;
    inputController.attachCanvas(canvas);

    // 2. Initialize WebGL 2 Renderer
    const renderer = new FoldRenderer(canvas, {
      onError: (err) => console.error('WebGL error:', err),
    });
    rendererRef.current = renderer;

    // 3. Load initial image (from IndexedDB or default.png)
    (async () => {
      try {
        const cached = await loadActiveImage();
        if (cached && cached.blob) {
          const objectUrl = URL.createObjectURL(cached.blob);
          const img = await loadImageFromUrl(objectUrl);
          applyImageSource(img);
          setHasCustomImage(true);
        } else {
          try {
            const img = await loadImageFromUrl(DEFAULT_IMAGE_PATH);
            applyImageSource(img);
          } catch {
            const img = await loadImageFromUrl(FALLBACK_IMAGE_PATH);
            applyImageSource(img);
          }
        }
      } catch (err) {
        console.warn('Loading default fallback:', err);
        try {
          const img = await loadImageFromUrl(DEFAULT_IMAGE_PATH);
          applyImageSource(img);
        } catch {
          try {
            const img = await loadImageFromUrl(FALLBACK_IMAGE_PATH);
            applyImageSource(img);
          } catch {
            // Keep canvas clean
          }
        }
      }
    })();

    // 4. Start 60 FPS Render Loop
    renderer.start(() => {
      return inputController.update(0.016);
    });

    // 5. Sensor and onboarding checks for mobile
    const permState = inputController.getPermissionState();
    const isTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;

    if (isTouch) {
      if (permState === 'prompt') {
        setShowMotionSheet(true);
      } else {
        // Android or granted: show hint
        setHintText('Face the screen toward the sky, then roll the phone left or right.');
        setTimeout(() => setHintText(null), 6000);
      }
    }

    // Resize handler
    const handleResize = () => {
      if (rendererRef.current) rendererRef.current.resize();
    };

    window.addEventListener('resize', handleResize, { passive: true });
    window.addEventListener('orientationchange', handleResize, { passive: true });

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', handleResize);
      if (rendererRef.current) rendererRef.current.destroy();
      if (inputControllerRef.current) inputControllerRef.current.detach();
    };
  }, [applyImageSource, loadImageFromUrl]);

  // Motion permission handler
  const handleAllowMotion = async () => {
    if (!inputControllerRef.current) return;
    const granted = await inputControllerRef.current.requestMotionPermission();
    setShowMotionSheet(false);

    if (granted) {
      setHintText('Face the screen toward the sky, then roll the phone left or right.');
      setTimeout(() => setHintText(null), 6000);

      // Onboarding Step 2: Home Screen guide (if not already shown and not in app mode)
      const isApp =
        Boolean((navigator as unknown as { standalone?: boolean }).standalone) ||
        window.matchMedia('(display-mode: standalone)').matches;

      const alreadyShown = localStorage.getItem(INSTALL_SHOWN_KEY);
      if (!isApp && !alreadyShown) {
        setTimeout(() => {
          localStorage.setItem(INSTALL_SHOWN_KEY, '1');
          setShowInstallSheet(true);
        }, 1200);
      }
    }
  };

  // File chosen
  const handleImageSelected = async (file: File) => {
    try {
      const img = await loadImageFromUrl(URL.createObjectURL(file));
      applyImageSource(img);
      setHasCustomImage(true);
      await saveActiveImage(file, file.name, img.width, img.height);
      // Auto-hide pills on selection
      setIsChromeHidden(true);
    } catch (err) {
      console.error('Failed to load selected photo:', err);
    }
  };

  // Revert to default
  const handleUseDefault = async () => {
    try {
      await clearActiveImage();
      try {
        const img = await loadImageFromUrl(DEFAULT_IMAGE_PATH);
        applyImageSource(img);
      } catch {
        const img = await loadImageFromUrl(FALLBACK_IMAGE_PATH);
        applyImageSource(img);
      }
      setHasCustomImage(false);
    } catch (err) {
      console.error('Failed to restore default photo:', err);
    }
  };

  // Fullscreen button
  const handleFullscreenClick = async () => {
    if (document.fullscreenElement) {
      await document.exitFullscreen();
      setFullscreenLabel('Fullscreen');
    } else if (document.fullscreenEnabled) {
      await document.documentElement.requestFullscreen();
      setFullscreenLabel('Exit fullscreen');
    } else {
      setShowInstallSheet(true);
    }
  };

  return (
    <main className="relative w-full h-full min-h-screen bg-black overflow-hidden select-none">
      {/* Fullscreen WebGL Canvas */}
      <canvas
        ref={canvasRef}
        className="stage cursor-pointer"
        onPointerDown={(e) => {
          pointerDownPos.current = { x: e.clientX, y: e.clientY };
        }}
        onPointerUp={(e) => {
          if (pointerDownPos.current) {
            const dist = Math.hypot(e.clientX - pointerDownPos.current.x, e.clientY - pointerDownPos.current.y);
            if (dist < 10) {
              setIsChromeHidden((prev) => !prev);
            }
          }
        }}
        aria-label="Interactive folding display. Tap to toggle controls, roll phone to fold."
      />

      {/* Chrome Action Pills, Corner Credit & Hint */}
      <ChromeActions
        isHidden={isChromeHidden}
        hasCustomImage={hasCustomImage}
        hintText={hintText}
        onImageSelected={handleImageSelected}
        onUseDefault={handleUseDefault}
        onFullscreenClick={handleFullscreenClick}
        fullscreenLabel={fullscreenLabel}
      />

      {/* Step 1: Motion Permission Dialog */}
      <MotionSheet
        isOpen={showMotionSheet}
        onAllow={handleAllowMotion}
      />

      {/* Step 2: Add to Home Screen Dialog */}
      <InstallSheet
        isOpen={showInstallSheet}
        onDismiss={() => setShowInstallSheet(false)}
      />
    </main>
  );
};
