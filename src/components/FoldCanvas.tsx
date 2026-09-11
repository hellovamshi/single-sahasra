'use client';

import React, { useRef, useEffect, useState, useCallback } from 'react';
import { FoldRenderer } from '../webgl/renderer';
import { InputController } from '../motion/inputController';
import { ProcessedImage } from '../utils/imageProcessing';
import { ControlsOverlay } from './ControlsOverlay';
import { MotionPermissionModal } from './MotionPermissionModal';
import { ErrorNotice } from './ErrorNotice';
import { useReducedMotion } from '../hooks/useReducedMotion';
import { HingeDirection, PermissionState } from '../motion/types';

interface FoldCanvasProps {
  image: ProcessedImage;
  onChangePhoto: () => void;
}

export const FoldCanvas: React.FC<FoldCanvasProps> = ({ image, onChangePhoto }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rendererRef = useRef<FoldRenderer | null>(null);
  const inputControllerRef = useRef<InputController | null>(null);

  const reducedMotion = useReducedMotion();

  // Motion and UI states
  const [permissionState, setPermissionState] = useState<PermissionState>('granted');
  const [showPermissionModal, setShowPermissionModal] = useState(false);
  const [motionActive, setMotionActive] = useState(false);
  const [webglError, setWebglError] = useState<string | null>(null);
  const [instructionText, setInstructionText] = useState<string>('Roll your phone left or right');

  // Manual fold override for reduced motion or testing
  const manualFoldRef = useRef<{ hinge: HingeDirection; amount: number } | null>(null);

  // Request iOS motion permission
  const handleEnableMotion = useCallback(async () => {
    if (!inputControllerRef.current) return;
    try {
      const granted = await inputControllerRef.current.requestMotionPermission();
      if (granted) {
        setPermissionState('granted');
        setShowPermissionModal(false);
        setMotionActive(true);
        setInstructionText('Roll your phone left or right');
      } else {
        setPermissionState('denied');
        setShowPermissionModal(false);
        setInstructionText('Swipe horizontally to fold');
      }
    } catch (err) {
      console.warn('Error enabling motion:', err);
    }
  }, []);

  const handleDismissPermission = useCallback(() => {
    setShowPermissionModal(false);
    setInstructionText('Swipe horizontally to fold');
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // 1. Initialize Unified Input Controller
    const inputController = new InputController();
    inputControllerRef.current = inputController;
    inputController.attachCanvas(canvas);

    // Check device motion permission status
    const initialPerm = inputController.getPermissionState();
    setPermissionState(initialPerm);

    if (initialPerm === 'prompt') {
      setShowPermissionModal(true);
    }

    // Subscribe to active motion detection
    const unsubscribeMotion = inputController.onMotionActiveChange((active) => {
      setMotionActive(active);
      if (active) {
        setInstructionText('Roll your phone left or right');
      }
    });

    // Detect touch device
    const isTouchDevice =
      typeof window !== 'undefined' &&
      ('ontouchstart' in window || navigator.maxTouchPoints > 0);

    if (!isTouchDevice) {
      setInstructionText('Move pointer horizontally to fold');
    }

    // 2. Initialize WebGL 2 Renderer
    try {
      const renderer = new FoldRenderer(canvas, {
        onContextLost: () => {
          console.warn('WebGL context lost');
        },
        onContextRestored: () => {
          console.log('WebGL context restored');
          if (image) {
            renderer.setImage(image.source, image.width, image.height);
          }
        },
        onError: (err) => {
          setWebglError(err.message);
        },
      });

      rendererRef.current = renderer;

      // Upload initial texture
      renderer.setImage(image.source, image.width, image.height);

      // Start decoupled 60 FPS animation loop
      renderer.start(() => {
        if (manualFoldRef.current) {
          return {
            foldAmount: manualFoldRef.current.amount,
            hingeDirection: manualFoldRef.current.hinge,
            tiltAngle: manualFoldRef.current.amount * 45,
            isInteracting: manualFoldRef.current.amount > 0.01,
            source: 'pointer',
          };
        }

        const state = inputController.update(0.016);
        return state;
      });
    } catch (err) {
      setWebglError(err instanceof Error ? err.message : 'WebGL 2 initialization failed');
    }

    // 3. Handle window resizing & orientation change
    const handleResize = () => {
      if (rendererRef.current) {
        rendererRef.current.resize();
      }
    };

    window.addEventListener('resize', handleResize, { passive: true });
    window.addEventListener('orientationchange', handleResize, { passive: true });

    // Optional user gesture fallback: tapping canvas triggers permission if still prompt
    const handleCanvasTap = () => {
      if (inputController.getPermissionState() === 'prompt') {
        handleEnableMotion();
      }
    };
    canvas.addEventListener('click', handleCanvasTap, { once: true });

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', handleResize);
      canvas.removeEventListener('click', handleCanvasTap);
      unsubscribeMotion();

      if (rendererRef.current) {
        rendererRef.current.destroy();
        rendererRef.current = null;
      }

      if (inputControllerRef.current) {
        inputControllerRef.current.detach();
        inputControllerRef.current = null;
      }
    };
  }, [image, handleEnableMotion]);

  const handleReset = useCallback(() => {
    manualFoldRef.current = null;
    if (inputControllerRef.current) {
      inputControllerRef.current.reset();
    }
  }, []);

  const handleManualFoldChange = useCallback((hinge: HingeDirection, amount: number) => {
    manualFoldRef.current = { hinge, amount };
  }, []);

  return (
    <div className="relative w-full h-screen bg-[#000000] overflow-hidden select-none">
      {/* WebGL 2 Canvas */}
      <canvas
        ref={canvasRef}
        className="w-full h-full block touch-none cursor-ew-resize"
        tabIndex={0}
        aria-label="Interactive folding display. Drag or tilt to fold."
      />

      {/* iOS Motion Permission Prompt */}
      {showPermissionModal && (
        <MotionPermissionModal
          onEnable={handleEnableMotion}
          onDismiss={handleDismissPermission}
        />
      )}

      {/* Controls Overlay */}
      <ControlsOverlay
        onReset={handleReset}
        onChangePhoto={onChangePhoto}
        isMotionActive={motionActive}
        instructionText={instructionText}
        reducedMotion={reducedMotion}
        onManualFoldChange={handleManualFoldChange}
        onEnableMotion={handleEnableMotion}
        showEnableMotionButton={!motionActive && permissionState === 'prompt'}
      />

      {/* WebGL Error fallback */}
      {webglError && (
        <ErrorNotice
          title="WebGL 2 Unavailable"
          message={webglError}
          onRetry={() => window.location.reload()}
          retryLabel="Reload"
        />
      )}
    </div>
  );
};
