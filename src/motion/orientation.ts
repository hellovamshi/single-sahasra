/**
 * Device orientation and motion sensor manager for mobile phones.
 * Accurately tracks device roll/tilt, manages iOS permissions,
 * and maintains calibration baselines.
 */

import { HingeDirection, PermissionState } from './types';
import { clamp } from '../utils/math';

export interface OrientationData {
  foldAmount: number;
  hingeDirection: HingeDirection;
  rollAngle: number;
  available: boolean;
  rawGamma?: number;
}

const MAX_TILT_ANGLE = 45.0; // Degrees tilt for maximum fold
const DEAD_ZONE = 2.0; // Ignore tiny micro-jitters near neutral

export class DeviceOrientationManager {
  private baselineGamma: number | null = null;
  private currentGamma: number = 0;
  private isListening: boolean = false;
  private hasReceivedData: boolean = false;
  private permissionState: PermissionState = 'prompt';
  private listeners: Set<(data: OrientationData) => void> = new Set();
  private lastEventType: string = '';

  constructor() {
    if (typeof window !== 'undefined') {
      this.checkInitialSupport();
      this.handleVisibilityChange = this.handleVisibilityChange.bind(this);
      document.addEventListener('visibilitychange', this.handleVisibilityChange);

      // If permission is already granted (Android, Desktop, non-permission iOS), start listening immediately!
      if (this.permissionState === 'granted') {
        this.start();
      }
    }
  }

  public checkInitialSupport(): PermissionState {
    if (typeof window === 'undefined') return 'unsupported';

    // iOS 13+ requires explicit user gesture permission request
    const hasOrientationPermission =
      typeof DeviceOrientationEvent !== 'undefined' &&
      typeof (DeviceOrientationEvent as unknown as { requestPermission?: () => Promise<string> })
        .requestPermission === 'function';

    const hasMotionPermission =
      typeof DeviceMotionEvent !== 'undefined' &&
      typeof (DeviceMotionEvent as unknown as { requestPermission?: () => Promise<string> })
        .requestPermission === 'function';

    if (hasOrientationPermission || hasMotionPermission) {
      this.permissionState = 'prompt';
      return 'prompt';
    }

    // Android and standard mobile browsers
    if ('DeviceOrientationEvent' in window || 'DeviceMotionEvent' in window) {
      this.permissionState = 'granted';
      return 'granted';
    }

    this.permissionState = 'unsupported';
    return 'unsupported';
  }

  public getPermissionState(): PermissionState {
    return this.permissionState;
  }

  public hasData(): boolean {
    return this.hasReceivedData;
  }

  public async requestPermission(): Promise<boolean> {
    if (typeof window === 'undefined') return false;

    let granted = false;

    // 1. Request DeviceOrientationEvent on iOS
    const orientationClass = DeviceOrientationEvent as unknown as {
      requestPermission?: () => Promise<string>;
    };

    if (typeof orientationClass.requestPermission === 'function') {
      try {
        const response = await orientationClass.requestPermission();
        if (response === 'granted') {
          granted = true;
        }
      } catch (err) {
        console.warn('DeviceOrientationEvent.requestPermission failed:', err);
      }
    }

    // 2. Request DeviceMotionEvent on iOS
    const motionClass = DeviceMotionEvent as unknown as {
      requestPermission?: () => Promise<string>;
    };

    if (typeof motionClass.requestPermission === 'function') {
      try {
        const response = await motionClass.requestPermission();
        if (response === 'granted') {
          granted = true;
        }
      } catch (err) {
        console.warn('DeviceMotionEvent.requestPermission failed:', err);
      }
    }

    // 3. Fallback for browsers without permission gate (Android Chrome)
    if (!orientationClass.requestPermission && !motionClass.requestPermission) {
      granted = 'DeviceOrientationEvent' in window || 'DeviceMotionEvent' in window;
    }

    if (granted) {
      this.permissionState = 'granted';
      this.start();
      return true;
    } else {
      this.permissionState = 'denied';
      return false;
    }
  }

  public start(): void {
    if (this.isListening || typeof window === 'undefined') return;

    this.isListening = true;

    // Listen to standard deviceorientation
    window.addEventListener('deviceorientation', this.handleOrientation, true);

    // Also listen to deviceorientationabsolute (used by some Android Chrome versions)
    window.addEventListener('deviceorientationabsolute', this.handleOrientation, true);

    // Also listen to devicemotion as a reliable accelerometer backup
    window.addEventListener('devicemotion', this.handleMotion, true);
  }

  public stop(): void {
    if (!this.isListening || typeof window === 'undefined') return;

    window.removeEventListener('deviceorientation', this.handleOrientation, true);
    window.removeEventListener('deviceorientationabsolute', this.handleOrientation, true);
    window.removeEventListener('devicemotion', this.handleMotion, true);
    this.isListening = false;
  }

  public resetBaseline(): void {
    if (this.hasReceivedData) {
      this.baselineGamma = this.currentGamma;
    } else {
      this.baselineGamma = 0;
    }
  }

  public subscribe(callback: (data: OrientationData) => void): () => void {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  private handleOrientation = (event: DeviceOrientationEvent): void => {
    if (event.gamma === null || event.gamma === undefined || isNaN(event.gamma)) return;

    this.hasReceivedData = true;
    this.lastEventType = 'orientation';
    this.currentGamma = event.gamma;

    // Initialize baseline on first reading
    if (this.baselineGamma === null) {
      this.baselineGamma = this.currentGamma;
    }

    const delta = this.currentGamma - this.baselineGamma;
    const absDelta = Math.abs(delta);

    let foldAmount = 0;
    let hingeDirection: HingeDirection = 'LEFT';

    if (absDelta > DEAD_ZONE) {
      foldAmount = clamp((absDelta - DEAD_ZONE) / (MAX_TILT_ANGLE - DEAD_ZONE), 0, 1);
      // Tilting right (gamma > baseline): fold from right around LEFT hinge
      // Tilting left (gamma < baseline): fold from left around RIGHT hinge
      hingeDirection = delta > 0 ? 'LEFT' : 'RIGHT';
    }

    const data: OrientationData = {
      foldAmount,
      hingeDirection,
      rollAngle: delta,
      available: true,
      rawGamma: this.currentGamma,
    };

    this.listeners.forEach((listener) => {
      listener(data);
    });
  };

  /**
   * DeviceMotion accelerometer backup if deviceorientation is not emitting
   */
  private handleMotion = (event: DeviceMotionEvent): void => {
    // If deviceorientation is already providing valid data, prefer it
    if (this.lastEventType === 'orientation') return;

    const acc = event.accelerationIncludingGravity;
    if (!acc || acc.x === null || acc.x === undefined || isNaN(acc.x)) return;

    this.hasReceivedData = true;

    // acc.x roughly corresponds to -sin(roll) * 9.8 or +sin(roll) * 9.8
    // Estimate roll angle in degrees (-90 to +90)
    const normalizedX = clamp(acc.x / 9.8, -1, 1);
    const estimatedAngle = -Math.asin(normalizedX) * (180 / Math.PI);

    this.currentGamma = estimatedAngle;

    if (this.baselineGamma === null) {
      this.baselineGamma = this.currentGamma;
    }

    const delta = this.currentGamma - this.baselineGamma;
    const absDelta = Math.abs(delta);

    let foldAmount = 0;
    let hingeDirection: HingeDirection = 'LEFT';

    if (absDelta > DEAD_ZONE) {
      foldAmount = clamp((absDelta - DEAD_ZONE) / (MAX_TILT_ANGLE - DEAD_ZONE), 0, 1);
      hingeDirection = delta > 0 ? 'LEFT' : 'RIGHT';
    }

    const data: OrientationData = {
      foldAmount,
      hingeDirection,
      rollAngle: delta,
      available: true,
      rawGamma: this.currentGamma,
    };

    this.listeners.forEach((listener) => {
      listener(data);
    });
  };

  private handleVisibilityChange(): void {
    if (document.hidden) {
      this.stop();
    } else {
      if (this.permissionState === 'granted') {
        this.start();
      }
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
