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

  // User engagement flags: 15-20s delay + user roll detection
  const hasRolledRef = useRef<boolean>(false);
  const minTimePassedRef = useRef<boolean>(false);
  const socialShownRef = useRef<boolean>(false);

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

    // Helper to trigger social popup once both conditions are met:
    // 1. Timing: 15-20s (18s) elapsed
    // 2. User has rolled or folded the phone
    const checkAndTriggerSocial = () => {
      if (socialShownRef.current) return;
      if (!minTimePassedRef.current || !hasRolledRef.current) return;

      const alreadyShown = typeof window !== 'undefined' ? sessionStorage.getItem('sahasra_social_shown') : null;
      if (alreadyShown) return;

      socialShownRef.current = true;
      sessionStorage.setItem('sahasra_social_shown', '1');

      // Give 1 second breather after the roll before smoothly opening sheet
      setTimeout(() => {
        setShowSocialPopup(true);
      }, 1000);
    };

    // 4. Start 60 FPS Render Loop with Roll Detection
    renderer.start(() => {
      const state = inputController.update(0.016);

      // Detect when user rolls or folds the phone (tilt > 20 deg or foldAmount > 0.12)
      if (!hasRolledRef.current && state.foldAmount > 0.12) {
        hasRolledRef.current = true;
        checkAndTriggerSocial();
      }

      return state;
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

    // 6. Motion Permission & App Install Sequencing
    const permState = inputController.getPermissionState();

    if (isMobile && permState === 'prompt') {
      // iPhone / Safari requires user gesture for motion permission
      // Step 1: Prompt for motion permission immediately
      setTimeout(() => {
        setShowMotionSheet(true);
      }, 500);
    } else {
      // Android / granted / desktop
      if (permState === 'granted') {
        inputController.requestMotionPermission().catch(() => {});
      }
      if (!isApp) {
        setTimeout(() => {
          setShowInstallSheet(true);
        }, 700);
      } else if (isMobile) {
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
      if (!isApp && inputController.getPermissionState() !== 'prompt') {
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

    // 8. Auto-popup timing: 15-20 seconds (18s) - triggers only after user has rolled
    const socialTimer = setTimeout(() => {
      minTimePassedRef.current = true;
      checkAndTriggerSocial();
    }, 18000);

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

    // Step 2: Now that motion is handled, prompt for install if not already in standalone mode
    const isApp =
      typeof window !== 'undefined' &&
      (Boolean((navigator as unknown as { standalone?: boolean }).standalone) ||
        ['fullscreen', 'standalone', 'minimal-ui'].some((m) =>
          window.matchMedia?.(`(display-mode: ${m})`)?.matches
        ));

    if (!isApp) {
      setTimeout(() => {
        setShowInstallSheet(true);
      }, 800);
    }
  };

  const handleDismissMotionSheet = () => {
    setShowMotionSheet(false);
    const isApp =
      typeof window !== 'undefined' &&
      (Boolean((navigator as unknown as { standalone?: boolean }).standalone) ||
        ['fullscreen', 'standalone', 'minimal-ui'].some((m) =>
          window.matchMedia?.(`(display-mode: ${m})`)?.matches
        ));

    if (!isApp) {
      setTimeout(() => {
        setShowInstallSheet(true);
      }, 500);
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
              if (inputControllerRef.current?.getPermissionState() === 'prompt') {
                setShowMotionSheet(true);
              } else {
                setIsChromeHidden((prev) => !prev);
              }
            }
          }
        }}
        aria-label="Interactive folding display. Tap to toggle controls, roll phone to fold."
      />

      {/* WhatsApp Coin & sahasra tech credit & Hint */}
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
        onDismiss={handleDismissMotionSheet}
      />

      {/* Community / Social Popup (10 Seconds) */}
      <SocialPopup
        isOpen={showSocialPopup}
        onDismiss={() => setShowSocialPopup(false)}
      />
    </main>
  );
};
