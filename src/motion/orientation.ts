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
      (typeof DeviceMotionEvent !== 'undefined' &&
        typeof (DeviceMotionEvent as unknown as { requestPermission?: () => Promise<string> })
          .requestPermission === 'function') ||
      (typeof DeviceOrientationEvent !== 'undefined' &&
        typeof (DeviceOrientationEvent as unknown as { requestPermission?: () => Promise<string> })
          .requestPermission === 'function');

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

    let granted = false;

    // 1. Request DeviceOrientationEvent permission (iOS 13+)
    const orientationClass = DeviceOrientationEvent as unknown as {
      requestPermission?: () => Promise<string>;
    };
    if (typeof orientationClass?.requestPermission === 'function') {
      try {
        const res = await orientationClass.requestPermission();
        if (res === 'granted') granted = true;
      } catch (e) {
        console.warn('DeviceOrientationEvent permission error:', e);
      }
    }

    // 2. Request DeviceMotionEvent permission (iOS 13+)
    const motionClass = DeviceMotionEvent as unknown as {
      requestPermission?: () => Promise<string>;
    };
    if (typeof motionClass?.requestPermission === 'function') {
      try {
        const res = await motionClass.requestPermission();
        if (res === 'granted') granted = true;
      } catch (e) {
        console.warn('DeviceMotionEvent permission error:', e);
      }
    }

    // 3. For Android/desktop or non-permission browsers
    const hasPermissionApi =
      typeof orientationClass?.requestPermission === 'function' ||
      typeof motionClass?.requestPermission === 'function';

    if (!hasPermissionApi && ('DeviceMotionEvent' in window || 'DeviceOrientationEvent' in window)) {
      granted = true;
    }

    if (granted) {
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

    // 1. DeviceOrientation (hardware sensor fusion - iOS & Android)
    window.addEventListener('deviceorientation', this.handleOrientation, { passive: true });

    // 2. DeviceOrientationAbsolute (Android Chrome specifically fires this)
    if ('ondeviceorientationabsolute' in window) {
      window.addEventListener('deviceorientationabsolute', this.handleOrientation as EventListener, { passive: true });
    }

    // 3. DeviceMotion (gravity accelerometer fallback across all devices)
    window.addEventListener('devicemotion', this.handleMotion, { passive: true });
  }

  public stop(): void {
    if (!this.isListening || typeof window === 'undefined') return;
    window.removeEventListener('deviceorientation', this.handleOrientation);
    if ('ondeviceorientationabsolute' in window) {
      window.removeEventListener('deviceorientationabsolute', this.handleOrientation as EventListener);
    }
    window.removeEventListener('devicemotion', this.handleMotion);
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

  private applyRoll(roll: number): void {
    if (!Number.isFinite(roll)) return;
    this.hasReceivedData = true;

    if (this.unwrapped === null) {
      this.unwrapped = roll;
    } else {
      this.unwrapped += this.wrap(roll - (this.previous ?? this.wrap(this.unwrapped)));
    }
    this.previous = roll;

    // Map physical roll to fold degrees (-90..+90 physical -> -180..+180 display)
    this.targetDegrees = Math.max(-180, Math.min(180, -2 * this.unwrapped));
    this.emitData();
  }

  private handleOrientation = (e: DeviceOrientationEvent): void => {
    if (e.gamma === null || e.gamma === undefined || !Number.isFinite(e.gamma)) return;

    let roll = e.gamma;
    const orientationAngle =
      (window.screen?.orientation?.angle ??
        (typeof window.orientation === 'number' ? window.orientation : 0)) ||
      0;

    if (orientationAngle === 90) {
      roll = -(e.beta ?? 0);
    } else if (orientationAngle === -90 || orientationAngle === 270) {
      roll = e.beta ?? 0;
    } else if (orientationAngle === 180) {
      roll = -e.gamma;
    }

    this.applyRoll(roll);
  };

  private handleMotion = (e: DeviceMotionEvent): void => {
    // If deviceorientation is already providing high precision fused roll, skip
    if (this.hasReceivedData && this.previous !== null) return;

    const total = e.accelerationIncludingGravity;
    if (!total || total.x === null || total.x === undefined) return;
    const linear = e.acceleration;

    const x = total.x - (linear?.x ?? 0);
    const y = (total.y ?? 0) - (linear?.y ?? 0);
    const z = (total.z ?? 0) - (linear?.z ?? 0);

    const sagittal = Math.hypot(y, z);
    if (sagittal < 0.2 && Math.abs(x) < 0.2) return;

    // Normalizes lateral roll across all pitch angles and OS implementations (Android +z vs iOS -z)
    const roll = (Math.atan2(x, Math.max(sagittal, 0.8)) * 180) / Math.PI;
    this.applyRoll(roll);
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
