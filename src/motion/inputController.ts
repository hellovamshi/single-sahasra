/**
 * Unified Input Controller that blends DeviceOrientation, Pointer, Touch,
 * and Keyboard inputs into a butter-smooth, jitter-free folding state.
 */

import { FoldInputState, HingeDirection, PermissionState } from './types';
import { DeviceOrientationManager } from './orientation';
import { PointerInputManager } from './pointerInput';
import { clamp, lerp } from '../utils/math';

export class InputController {
  private orientationManager: DeviceOrientationManager;
  private pointerManager: PointerInputManager;

  // Smoothed output state
  private currentFoldAmount: number = 0;
  private currentHingeDirection: HingeDirection = 'LEFT';
  private currentTiltAngle: number = 0;

  // Raw targets from sensors / pointer
  private targetFoldAmount: number = 0;
  private targetHingeDirection: HingeDirection = 'LEFT';
  private targetTiltAngle: number = 0;

  // Mode tracking
  private activeInputSource: 'motion' | 'pointer' | 'touch' | 'keyboard' = 'pointer';
  private hasActiveMotion: boolean = false;
  private motionTimeoutId: number | null = null;

  // Smoothing factor (lerp per frame)
  private readonly smoothingFactor: number = 0.12;

  constructor() {
    this.orientationManager = new DeviceOrientationManager();
    this.pointerManager = new PointerInputManager();

    // Subscribe to orientation updates
    this.orientationManager.subscribe((data) => {
      if (data.available) {
        this.hasActiveMotion = true;
        this.activeInputSource = 'motion';
        this.targetFoldAmount = data.foldAmount;
        this.targetHingeDirection = data.hingeDirection;
        this.targetTiltAngle = data.rollAngle;

        // Clear pointer priority timeout
        if (this.motionTimeoutId) {
          clearTimeout(this.motionTimeoutId);
        }
      }
    });

    // Subscribe to pointer updates
    this.pointerManager.subscribe((state) => {
      // If user is actively touching or moving pointer, prioritize pointer
      if (state.isInteracting || !this.hasActiveMotion) {
        this.activeInputSource = state.source;
        this.targetFoldAmount = state.foldAmount;
        this.targetHingeDirection = state.hingeDirection;
        this.targetTiltAngle = state.tiltAngle;
      }
    });
  }

  public attachCanvas(canvas: HTMLElement): void {
    this.pointerManager.attach(canvas);
  }

  public detach(): void {
    this.pointerManager.detach();
    this.orientationManager.destroy();
  }

  public getPermissionState(): PermissionState {
    return this.orientationManager.getPermissionState();
  }

  public async requestMotionPermission(): Promise<boolean> {
    return this.orientationManager.requestPermission();
  }

  public reset(): void {
    this.targetFoldAmount = 0;
    this.currentFoldAmount = 0;
    this.targetTiltAngle = 0;
    this.currentTiltAngle = 0;
    this.orientationManager.resetBaseline();
  }

  /**
   * Called on every requestAnimationFrame loop.
   * Performs continuous dampening, prevents hinge-flip jumping, and clamps extremes.
   */
  public update(deltaTime: number): FoldInputState {
    // Prevent sudden visual flip when crossing center:
    // If target hinge differs from current hinge, first interpolate towards 0
    if (
      this.targetHingeDirection !== this.currentHingeDirection &&
      this.currentFoldAmount > 0.03
    ) {
      // Smoothly descend to flat before flipping hinge side
      this.currentFoldAmount = lerp(this.currentFoldAmount, 0, this.smoothingFactor * 1.5);
    } else {
      // Once flat enough, safely flip direction and resume interpolating to target
      this.currentHingeDirection = this.targetHingeDirection;
      this.currentFoldAmount = lerp(
        this.currentFoldAmount,
        this.targetFoldAmount,
        this.smoothingFactor
      );
    }

    this.currentTiltAngle = lerp(
      this.currentTiltAngle,
      this.targetTiltAngle,
      this.smoothingFactor
    );

    return {
      foldAmount: clamp(this.currentFoldAmount, 0, 1),
      hingeDirection: this.currentHingeDirection,
      tiltAngle: this.currentTiltAngle,
      isInteracting: this.currentFoldAmount > 0.01,
      source: this.activeInputSource,
    };
  }

  public getCurrentState(): FoldInputState {
    return {
      foldAmount: clamp(this.currentFoldAmount, 0, 1),
      hingeDirection: this.currentHingeDirection,
      tiltAngle: this.currentTiltAngle,
      isInteracting: this.currentFoldAmount > 0.01,
      source: this.activeInputSource,
    };
  }
}
