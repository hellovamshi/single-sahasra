/**
 * Unified pointer, touch, and keyboard interaction handler for desktop & touch fallbacks.
 */

import { FoldInputState, HingeDirection } from './types';
import { clamp } from '../utils/math';

export class PointerInputManager {
  private element: HTMLElement | null = null;
  private isPointerDown: boolean = false;
  private startX: number = 0;
  private currentX: number = 0;
  private listeners: Set<(state: FoldInputState) => void> = new Set();
  private isEnabled: boolean = true;

  public attach(element: HTMLElement): void {
    this.element = element;

    // Pointer events (handles both mouse and touch unified)
    element.addEventListener('pointerdown', this.onPointerDown, { passive: false });
    window.addEventListener('pointermove', this.onPointerMove, { passive: false });
    window.addEventListener('pointerup', this.onPointerUp, { passive: true });
    window.addEventListener('pointercancel', this.onPointerUp, { passive: true });

    // Keyboard support for accessibility
    window.addEventListener('keydown', this.onKeyDown);
  }

  public detach(): void {
    if (this.element) {
      this.element.removeEventListener('pointerdown', this.onPointerDown);
    }
    window.removeEventListener('pointermove', this.onPointerMove);
    window.removeEventListener('pointerup', this.onPointerUp);
    window.removeEventListener('pointercancel', this.onPointerUp);
    window.removeEventListener('keydown', this.onKeyDown);
    this.listeners.clear();
  }

  public subscribe(callback: (state: FoldInputState) => void): () => void {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  public setEnabled(enabled: boolean): void {
    this.isEnabled = enabled;
  }

  private onPointerDown = (e: PointerEvent): void => {
    if (!this.isEnabled) return;
    this.isPointerDown = true;
    this.startX = e.clientX;
    this.currentX = e.clientX;
    try {
      (e.target as HTMLElement)?.setPointerCapture?.(e.pointerId);
    } catch {
      // Ignored
    }
    this.processPointerPosition(e.clientX, true, e.pointerType === 'touch' ? 'touch' : 'pointer');
  };

  private onPointerMove = (e: PointerEvent): void => {
    if (!this.isEnabled) return;
    this.currentX = e.clientX;
    const isTouch = e.pointerType === 'touch';
    // For touch devices, only interact when finger is down (drag)
    if (isTouch && !this.isPointerDown) return;

    this.processPointerPosition(
      e.clientX,
      this.isPointerDown,
      isTouch ? 'touch' : 'pointer'
    );
  };

  private onPointerUp = (e: PointerEvent): void => {
    this.isPointerDown = false;
    try {
      (e.target as HTMLElement)?.releasePointerCapture?.(e.pointerId);
    } catch {
      // Ignored
    }
    // When released, smoothly spring back to unfolded (0.0)
    const state: FoldInputState = {
      foldAmount: 0,
      hingeDirection: 'LEFT',
      tiltAngle: 0,
      isInteracting: false,
      source: e.pointerType === 'touch' ? 'touch' : 'pointer',
    };
    this.listeners.forEach((listener) => listener(state));
  };

  private processPointerPosition(
    clientX: number,
    isInteracting: boolean,
    source: 'pointer' | 'touch'
  ): void {
    const width = window.innerWidth || 1;
    const normX = clientX / width; // 0.0 (left) to 1.0 (right)
    const centerDiff = normX - 0.5; // -0.5 to +0.5

    let foldAmount = 0;
    let hingeDirection: HingeDirection = 'LEFT';

    if (Math.abs(centerDiff) > 0.04) {
      // Deadzone 8% around center
      foldAmount = clamp((Math.abs(centerDiff) - 0.04) / 0.44, 0, 1);
      hingeDirection = centerDiff > 0 ? 'LEFT' : 'RIGHT';
    }

    const state: FoldInputState = {
      foldAmount,
      hingeDirection,
      tiltAngle: centerDiff * 90,
      isInteracting,
      source,
    };

    this.listeners.forEach((listener) => {
      listener(state);
    });
  }

  private onKeyDown = (e: KeyboardEvent): void => {
    if (!this.isEnabled) return;

    if (e.key === 'ArrowRight') {
      e.preventDefault();
      this.notifyKeyboardState('LEFT', 0.8, 35);
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      this.notifyKeyboardState('RIGHT', 0.8, -35);
    } else if (e.key === 'Escape' || e.key === ' ') {
      e.preventDefault();
      this.notifyKeyboardState('LEFT', 0.0, 0);
    }
  };

  private notifyKeyboardState(
    hingeDirection: HingeDirection,
    foldAmount: number,
    tiltAngle: number
  ): void {
    const state: FoldInputState = {
      foldAmount,
      hingeDirection,
      tiltAngle,
      isInteracting: true,
      source: 'keyboard',
    };
    this.listeners.forEach((listener) => {
      listener(state);
    });
  }
}
