/**
 * Unified Input Controller using exponential follow smoothing
 * and inverse screen-space fold physics.
 */

import { FoldInputState, HingeDirection, PermissionState } from './types';
import { DeviceOrientationManager } from './orientation';
import { PointerInputManager } from './pointerInput';
import { clamp } from '../utils/math';

const FOLLOW = 16.0; // Exponential smoothing rate matching iPhone Solo

export class InputController {
  private orientationManager: DeviceOrientationManager;
  private pointerManager: PointerInputManager;

  // Degrees: -180 to +180
  private targetDegrees: number = 0;
  private displayDegrees: number = 0;

  private hasActiveMotion: boolean = false;
  private motionListeners: Set<(active: boolean) => void> = new Set();
  private isPointerInteracting: boolean = false;

  constructor() {
    this.orientationManager = new DeviceOrientationManager();
    this.pointerManager = new PointerInputManager();

    this.orientationManager.subscribe((data) => {
      if (data.available) {
        if (!this.hasActiveMotion) {
          this.hasActiveMotion = true;
          this.motionListeners.forEach((fn) => fn(true));
        }

        if (!this.isPointerInteracting) {
          this.targetDegrees = data.targetDegrees;
        }
      }
    });

    this.pointerManager.subscribe((state) => {
      this.isPointerInteracting = state.isInteracting;

      if (state.isInteracting || !this.hasActiveMotion) {
        // Map pointer centerDiff (-0.5 to +0.5) to -180 to +180
        const degrees = state.hingeDirection === 'LEFT'
          ? state.foldAmount * 180
          : -state.foldAmount * 180;
        this.targetDegrees = degrees;
      }
    });
  }

  public attachCanvas(canvas: HTMLElement): void {
    this.pointerManager.attach(canvas);
  }

  public detach(): void {
    this.pointerManager.detach();
    this.orientationManager.destroy();
    this.motionListeners.clear();
  }

  public getPermissionState(): PermissionState {
    return this.orientationManager.getPermissionState();
  }

  public onMotionActiveChange(callback: (active: boolean) => void): () => void {
    this.motionListeners.add(callback);
    callback(this.hasActiveMotion);
    return () => this.motionListeners.delete(callback);
  }

  public isMotionActive(): boolean {
    return this.hasActiveMotion;
  }

  public async requestMotionPermission(): Promise<boolean> {
    const granted = await this.orientationManager.requestPermission();
    if (granted) {
      this.hasActiveMotion = true;
      this.motionListeners.forEach((fn) => fn(true));
    }
    return granted;
  }

  public reset(): void {
    this.targetDegrees = 0;
    this.displayDegrees = 0;
    this.orientationManager.resetBaseline();
  }

  /**
   * Exponential decay frame update matching iPhone Solo:
   * display += (target - display) * (1 - Math.exp(-dt * FOLLOW))
   */
  public update(deltaTime: number): FoldInputState {
    const factor = 1.0 - Math.exp(-deltaTime * FOLLOW);
    this.displayDegrees += (this.targetDegrees - this.displayDegrees) * factor;

    if (Math.abs(this.targetDegrees - this.displayDegrees) < 0.001) {
      this.displayDegrees = this.targetDegrees;
    }

    const turn = clamp(Math.abs(this.displayDegrees) / 180, 0, 1);
    const hingeDirection: HingeDirection = this.displayDegrees >= 0 ? 'LEFT' : 'RIGHT';

    return {
      foldAmount: turn,
      hingeDirection,
      tiltAngle: this.displayDegrees,
      isInteracting: turn > 0.001,
      source: this.hasActiveMotion ? 'motion' : 'pointer',
    };
  }

  public getCurrentState(): FoldInputState {
    const turn = clamp(Math.abs(this.displayDegrees) / 180, 0, 1);
    const hingeDirection: HingeDirection = this.displayDegrees >= 0 ? 'LEFT' : 'RIGHT';

    return {
      foldAmount: turn,
      hingeDirection,
      tiltAngle: this.displayDegrees,
      isInteracting: turn > 0.001,
      source: this.hasActiveMotion ? 'motion' : 'pointer',
    };
  }
}
