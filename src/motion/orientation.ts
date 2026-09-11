/**
 * Gravitational roll sensor manager matching iPhone Solo physics.
 */

import { HingeDirection, PermissionState } from './types';

export interface OrientationData {
  turn: number; // 0.0 to 1.0
  hinge: HingeDirection; // 'LEFT' or 'RIGHT'
  available: boolean;
  targetDegrees: number;
}

export class DeviceOrientationManager {
  private targetDegrees: number = 0;
  private unwrapped: number | null = null;
  private previous: number | null = null;
  private hasReceivedData: boolean = false;
  private isListening: boolean = false;
  private permissionState: PermissionState = 'prompt';
  private listeners: Set<(data: OrientationData) => void> = new Set();

  constructor() {
    if (typeof window !== 'undefined') {
      this.checkInitialSupport();
      this.handleVisibilityChange = this.handleVisibilityChange.bind(this);
      document.addEventListener('visibilitychange', this.handleVisibilityChange);

      if (this.permissionState === 'granted') {
        this.start();
      }
    }
  }

  public checkInitialSupport(): PermissionState {
    if (typeof window === 'undefined') return 'unsupported';

    const hasMotionPermission =
      typeof DeviceMotionEvent !== 'undefined' &&
      typeof (DeviceMotionEvent as unknown as { requestPermission?: () => Promise<string> })
        .requestPermission === 'function';

    if (hasMotionPermission) {
      this.permissionState = 'prompt';
      return 'prompt';
    }

    if ('DeviceMotionEvent' in window || 'DeviceOrientationEvent' in window) {
      this.permissionState = 'granted';
      return 'granted';
    }

    this.permissionState = 'unsupported';
    return 'unsupported';
  }

  public getPermissionState(): PermissionState {
    return this.permissionState;
  }

  public async requestPermission(): Promise<boolean> {
    if (typeof window === 'undefined') return false;

    const motionClass = DeviceMotionEvent as unknown as {
      requestPermission?: () => Promise<string>;
    };

    if (typeof motionClass.requestPermission === 'function') {
      try {
        const res = await motionClass.requestPermission();
        if (res === 'granted') {
          this.permissionState = 'granted';
          this.start();
          return true;
        }
      } catch (e) {
        console.warn('DeviceMotionEvent permission error:', e);
      }
    } else if ('DeviceMotionEvent' in window) {
      this.permissionState = 'granted';
      this.start();
      return true;
    }

    this.permissionState = 'denied';
    return false;
  }

  public start(): void {
    if (this.isListening || typeof window === 'undefined') return;
    this.isListening = true;

    window.addEventListener('devicemotion', this.handleMotion, true);
    window.addEventListener('deviceorientation', this.handleOrientation, true);
  }

  public stop(): void {
    if (!this.isListening || typeof window === 'undefined') return;
    window.removeEventListener('devicemotion', this.handleMotion, true);
    window.removeEventListener('deviceorientation', this.handleOrientation, true);
    this.isListening = false;
  }

  public resetBaseline(): void {
    this.unwrapped = null;
    this.previous = null;
    this.targetDegrees = 0;
  }

  public subscribe(callback: (data: OrientationData) => void): () => void {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  private wrap(value: number): number {
    return (((value + 180) % 360 + 360) % 360) - 180;
  }

  private handleMotion = (e: DeviceMotionEvent): void => {
    const total = e.accelerationIncludingGravity;
    const linear = e.acceleration;
    if (!total || total.x === null || total.z === null) return;

    const x = total.x - (linear?.x ?? 0);
    const z = total.z - (linear?.z ?? 0);
    if (!Number.isFinite(x) || !Number.isFinite(z) || Math.hypot(x, z) < 0.5) return;

    this.hasReceivedData = true;

    // Physical gravity roll angle in degrees
    const roll = (Math.atan2(x, -z) * 180) / Math.PI;

    if (this.unwrapped === null) {
      this.unwrapped = roll;
    } else {
      this.unwrapped += this.wrap(roll - (this.previous ?? this.wrap(this.unwrapped)));
    }
    this.previous = roll;

    // Map -90..+90 physical tilt to -180..+180 turn span
    this.targetDegrees = Math.max(-180, Math.min(180, -2 * this.unwrapped));
    this.emitData();
  };

  private handleOrientation = (e: DeviceOrientationEvent): void => {
    // If devicemotion is already providing data, skip
    if (this.hasReceivedData) return;
    if (e.gamma === null || e.gamma === undefined || isNaN(e.gamma)) return;

    // Fallback gamma roll
    this.targetDegrees = Math.max(-180, Math.min(180, -2 * e.gamma));
    this.emitData();
  };

  private emitData(): void {
    const turn = Math.min(Math.abs(this.targetDegrees) / 180, 1.0);
    const hinge: HingeDirection = this.targetDegrees >= 0 ? 'LEFT' : 'RIGHT';

    const data: OrientationData = {
      turn,
      hinge,
      available: true,
      targetDegrees: this.targetDegrees,
    };

    this.listeners.forEach((fn) => fn(data));
  }

  private handleVisibilityChange(): void {
    this.previous = null;
    if (document.hidden) {
      this.stop();
    } else if (this.permissionState === 'granted') {
      this.start();
    }
  }

  public destroy(): void {
    this.stop();
    this.listeners.clear();
    if (typeof window !== 'undefined') {
      document.removeEventListener('visibilitychange', this.handleVisibilityChange);
    }
  }
}
