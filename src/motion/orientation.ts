/**
 * Device orientation sensor manager for mobile phones.
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
}

const MAX_TILT_ANGLE = 50.0; // Degrees tilt for maximum fold
const DEAD_ZONE = 2.0; // Ignore tiny micro-jitters near neutral

export class DeviceOrientationManager {
  private baselineGamma: number | null = null;
  private currentGamma: number = 0;
  private isListening: boolean = false;
  private hasReceivedData: boolean = false;
  private permissionState: PermissionState = 'prompt';
  private listeners: Set<(data: OrientationData) => void> = new Set();

  constructor() {
    if (typeof window !== 'undefined') {
      this.checkInitialSupport();
      this.handleVisibilityChange = this.handleVisibilityChange.bind(this);
      document.addEventListener('visibilitychange', this.handleVisibilityChange);
    }
  }

  public checkInitialSupport(): PermissionState {
    if (typeof window === 'undefined') return 'unsupported';

    // iOS 13+ requires explicit user permission request
    if (
      typeof DeviceOrientationEvent !== 'undefined' &&
      typeof (DeviceOrientationEvent as unknown as { requestPermission?: () => Promise<string> })
        .requestPermission === 'function'
    ) {
      this.permissionState = 'prompt';
      return 'prompt';
    }

    // Android and browsers without permission gate
    if ('DeviceOrientationEvent' in window) {
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

    const deviceOrientation = DeviceOrientationEvent as unknown as {
      requestPermission?: () => Promise<string>;
    };

    if (typeof deviceOrientation.requestPermission === 'function') {
      try {
        const response = await deviceOrientation.requestPermission();
        if (response === 'granted') {
          this.permissionState = 'granted';
          this.start();
          return true;
        } else {
          this.permissionState = 'denied';
          return false;
        }
      } catch (err) {
        console.warn('DeviceOrientation permission request failed:', err);
        this.permissionState = 'denied';
        return false;
      }
    } else if ('DeviceOrientationEvent' in window) {
      this.permissionState = 'granted';
      this.start();
      return true;
    }

    this.permissionState = 'unsupported';
    return false;
  }

  public start(): void {
    if (this.isListening || typeof window === 'undefined') return;

    window.addEventListener('deviceorientation', this.handleOrientation, true);
    this.isListening = true;
  }

  public stop(): void {
    if (!this.isListening || typeof window === 'undefined') return;

    window.removeEventListener('deviceorientation', this.handleOrientation, true);
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
    if (event.gamma === null || isNaN(event.gamma)) return;

    this.hasReceivedData = true;
    this.currentGamma = event.gamma;

    // First reading initializes the baseline
    if (this.baselineGamma === null) {
      this.baselineGamma = this.currentGamma;
    }

    // Calculate delta relative to baseline
    const delta = this.currentGamma - this.baselineGamma;
    const absDelta = Math.abs(delta);

    let foldAmount = 0;
    let hingeDirection: HingeDirection = 'LEFT';

    if (absDelta > DEAD_ZONE) {
      foldAmount = clamp((absDelta - DEAD_ZONE) / (MAX_TILT_ANGLE - DEAD_ZONE), 0, 1);
      // If phone tilts right (gamma > baseline): hinge is LEFT, folds inward from right
      // If phone tilts left (gamma < baseline): hinge is RIGHT, folds inward from left
      hingeDirection = delta > 0 ? 'LEFT' : 'RIGHT';
    }

    const data: OrientationData = {
      foldAmount,
      hingeDirection,
      rollAngle: delta,
      available: true,
    };

    this.listeners.forEach((listener) => {
      listener(data);
    });
  };

  private handleVisibilityChange(): void {
    if (document.hidden) {
      // Temporarily pause listening when tab is hidden
      if (this.isListening) {
        window.removeEventListener('deviceorientation', this.handleOrientation, true);
      }
    } else {
      if (this.isListening) {
        window.addEventListener('deviceorientation', this.handleOrientation, true);
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
