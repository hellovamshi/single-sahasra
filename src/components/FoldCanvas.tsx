'use client';

import React, { useRef, useEffect, useState, useCallback } from 'react';
import { FoldRenderer } from '../webgl/renderer';
import { InputController } from '../motion/inputController';
import { MotionSheet } from './MotionSheet';
import { InstallSheet } from './InstallSheet';
import { ChromeActions } from './ChromeActions';
import { SocialPopup } from './SocialPopup';
import { loadActiveImage } from '../storage/imageStorage';

const DEFAULT_IMAGE_PATH = '/backgrounds/default.jpg';
const FALLBACK_IMAGE_PATH = '/backgrounds/default.png';

export const FoldCanvas: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rendererRef = useRef<FoldRenderer | null>(null);
  const inputControllerRef = useRef<InputController | null>(null);
  const pointerDownPos = useRef<{ x: number; y: number } | null>(null);

  const [isChromeHidden, setIsChromeHidden] = useState<boolean>(false);
  const [showMotionSheet, setShowMotionSheet] = useState<boolean>(false);
  const [showInstallSheet, setShowInstallSheet] = useState<boolean>(false);
  const [showSocialPopup, setShowSocialPopup] = useState<boolean>(false);
  const [isAndroid, setIsAndroid] = useState<boolean>(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [hintText, setHintText] = useState<string | null>(null);

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

    // 1. Initialize Input Controller
    const inputController = new InputController();
    inputControllerRef.current = inputController;
    inputController.attachCanvas(canvas);

    // 2. Initialize WebGL 2 Renderer
    const renderer = new FoldRenderer(canvas, {
      onError: (err) => console.error('WebGL error:', err),
    });
    rendererRef.current = renderer;

    // 3. Load initial image (from IndexedDB or default)
    (async () => {
      try {
        const cached = await loadActiveImage();
        if (cached && cached.blob) {
          const objectUrl = URL.createObjectURL(cached.blob);
          const img = await loadImageFromUrl(objectUrl);
          applyImageSource(img);
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

    // 5. Automatic Device Detection (Mobile vs Laptop/Desktop & Android vs iOS)
    const ua = navigator.userAgent || '';
    const isAndroidDevice = /Android/i.test(ua);
    const isIPhoneDevice = /iPhone|iPad|iPod/i.test(ua);
    const hasTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    const isFinePointer = window.matchMedia?.('(pointer: fine)').matches && navigator.maxTouchPoints === 0;
    const isMobile = isAndroidDevice || isIPhoneDevice || (hasTouch && !isFinePointer);

    setIsAndroid(isAndroidDevice);
    document.documentElement.classList.add(isMobile ? 'is-phone' : 'is-laptop');

    // 6. Direct Auto-Popup for Install (Android & iPhone)
    // If not already in standalone mode, prompt user to install
    if (!isApp) {
      setTimeout(() => {
        setShowInstallSheet(true);
      }, 700);
    } else {
      // If already installed, show gentle gesture hint
      if (isMobile) {
        setHintText('Face the screen toward the sky, then roll the phone left or right.');
        setTimeout(() => setHintText(null), 6000);
      }
    }

    if (!isMobile) {
      setHintText('Scroll trackpad, drag with mouse, or use ← → arrow keys to fold.');
      setTimeout(() => setHintText(null), 7000);
    }

    // 7. PWA beforeinstallprompt handler (Chrome on Android)
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      if (!isApp) {
        setShowInstallSheet(true);
      }
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // Resize handler
    const handleResize = () => {
      if (rendererRef.current) rendererRef.current.resize();
    };

    window.addEventListener('resize', handleResize, { passive: true });
    window.addEventListener('orientationchange', handleResize, { passive: true });

    // 8. Auto-popup for Community (WhatsApp/Instagram) after user has explored the app (35s)
    const socialTimer = setTimeout(() => {
      const alreadyShown = typeof window !== 'undefined' ? sessionStorage.getItem('sahasra_social_shown') : null;
      if (!alreadyShown) {
        sessionStorage.setItem('sahasra_social_shown', '1');
        setShowSocialPopup(true);
      }
    }, 35000);

    return () => {
      clearTimeout(socialTimer);
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', handleResize);
      if (rendererRef.current) rendererRef.current.destroy();
      if (inputControllerRef.current) inputControllerRef.current.detach();
    };
  }, [applyImageSource, loadImageFromUrl]);

  // Handle Android Direct Install Now click
  const handleInstallNow = async () => {
    if (deferredPrompt) {
      try {
        deferredPrompt.prompt();
        const choiceResult = await deferredPrompt.userChoice;
        if (choiceResult.outcome === 'accepted') {
          setShowInstallSheet(false);
        }
      } catch (err) {
        console.error('Install prompt error:', err);
      }
      setDeferredPrompt(null);
    }
  };

  // Motion permission handler (iOS)
  const handleAllowMotion = async () => {
    if (!inputControllerRef.current) return;
    const granted = await inputControllerRef.current.requestMotionPermission();
    setShowMotionSheet(false);

    if (granted) {
      setHintText('Face the screen toward the sky, then roll the phone left or right.');
      setTimeout(() => setHintText(null), 6000);
    }
  };

  // When install sheet is dismissed on iOS, check if motion permission needs prompting
  const handleDismissInstallSheet = () => {
    setShowInstallSheet(false);
    if (!isAndroid && inputControllerRef.current) {
      const permState = inputControllerRef.current.getPermissionState();
      if (permState === 'prompt') {
        setShowMotionSheet(true);
      }
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

      {/* WhatsApp Coin & ainox.in credit & Hint */}
      <ChromeActions
        isHidden={isChromeHidden}
        hintText={hintText}
      />

      {/* Direct Add to Home Screen / Install Now Sheet */}
      <InstallSheet
        isOpen={showInstallSheet}
        onDismiss={handleDismissInstallSheet}
        isAndroid={isAndroid}
        canInstallDirectly={Boolean(deferredPrompt)}
        onInstallNow={handleInstallNow}
      />

      {/* Motion Permission Dialog (iOS Only when prompted) */}
      <MotionSheet
        isOpen={showMotionSheet}
        onAllow={handleAllowMotion}
      />

      {/* Community / Social Popup (10 Seconds) */}
      <SocialPopup
        isOpen={showSocialPopup}
        onDismiss={() => setShowSocialPopup(false)}
      />
    </main>
  );
};
