/**
 * Types for device motion, orientation, and unified input controllers.
 */

export type HingeDirection = 'LEFT' | 'RIGHT';

export interface FoldInputState {
  /**
   * Fold amount normalized between 0.0 (completely flat) and 1.0 (maximum fold).
   */
  foldAmount: number;

  /**
   * Virtual hinge axis: 'LEFT' edge or 'RIGHT' edge.
   */
  hingeDirection: HingeDirection;

  /**
   * Raw or normalized tilt angle in degrees (for lighting/specular sheen).
   */
  tiltAngle: number;

  /**
   * Indicates whether the user is actively interacting (touching/moving).
   */
  isInteracting: boolean;

  /**
   * Source of input that drove the current frame.
   */
  source: 'motion' | 'pointer' | 'touch' | 'keyboard';
}

export type PermissionState = 'prompt' | 'granted' | 'denied' | 'unsupported';
