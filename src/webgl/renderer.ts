/**
 * Production-ready WebGL 2 Fold Renderer.
 * High-performance, 60 FPS animation loop, seamless glass fold simulation,
 * progressive mip-blur, and memory leak prevention.
 */

import { VERTEX_SHADER_SOURCE, FOLD_FRAGMENT_SHADER_SOURCE } from './shaders';
import { createProgram, createSubdividedMesh, GridMeshBuffers } from './glUtils';
import { createTextureFromSource, deleteTexture, TextureInfo } from './textureUtils';
import { createPerspectiveMatrix, createIdentityMatrix } from '../utils/math';
import { FoldInputState } from '../motion/types';

export interface RendererConfig {
  onContextLost?: () => void;
  onContextRestored?: () => void;
  onError?: (err: Error) => void;
}

export class FoldRenderer {
  private canvas: HTMLCanvasElement;
  private gl: WebGL2RenderingContext | null = null;
  private config: RendererConfig;

  private program: WebGLProgram | null = null;
  private mesh: GridMeshBuffers | null = null;
  private activeTexture: TextureInfo | null = null;
  private pendingSource: { source: TexImageSource; width: number; height: number } | null = null;

  // Uniform locations
  private uProjMatrixLoc: WebGLUniformLocation | null = null;
  private uMvMatrixLoc: WebGLUniformLocation | null = null;
  private uFoldAmountLoc: WebGLUniformLocation | null = null;
  private uHingeLoc: WebGLUniformLocation | null = null;
  private uScreenSizeLoc: WebGLUniformLocation | null = null;
  private uUvScaleLoc: WebGLUniformLocation | null = null;
  private uUvOffsetLoc: WebGLUniformLocation | null = null;
  private uMaxLodLoc: WebGLUniformLocation | null = null;
  private uTiltAngleLoc: WebGLUniformLocation | null = null;
  private uResolutionLoc: WebGLUniformLocation | null = null;
  private uTextureLoc: WebGLUniformLocation | null = null;

  // Render loop
  private animationFrameId: number | null = null;
  private lastTimestamp: number = 0;
  private isRunning: boolean = false;
  private stateProvider: (() => FoldInputState) | null = null;

  // Matrices
  private projectionMatrix: Float32Array = createIdentityMatrix();
  private modelViewMatrix: Float32Array = createIdentityMatrix();

  // Camera settings
  private readonly cameraZ: number = 2.4;
  private readonly cameraFov: number = (45 * Math.PI) / 180; // 45 degrees FOV

  constructor(canvas: HTMLCanvasElement, config: RendererConfig = {}) {
    this.canvas = canvas;
    this.config = config;

    this.initContext();
  }

  private initContext(): void {
    try {
      const gl = this.canvas.getContext('webgl2', {
        alpha: false,
        antialias: true,
        powerPreference: 'high-performance',
        preserveDrawingBuffer: false,
        desynchronized: true,
      });

      if (!gl) {
        throw new Error('WebGL 2 is not supported on this device/browser.');
      }

      this.gl = gl;

      // Event listeners for context loss
      this.canvas.addEventListener('webglcontextlost', this.handleContextLost, false);
      this.canvas.addEventListener('webglcontextrestored', this.handleContextRestored, false);

      this.initPipeline();
    } catch (err) {
      if (this.config.onError) {
        this.config.onError(err instanceof Error ? err : new Error(String(err)));
      }
    }
  }

  private initPipeline(): void {
    const gl = this.gl;
    if (!gl) return;

    // Enable depth test, backface culling, and alpha blending for seamless glass feathering
    gl.enable(gl.DEPTH_TEST);
    gl.depthFunc(gl.LEQUAL);

    // Alpha blending enables soft glass dissolution into the dark void
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA); // Premultiplied alpha for silky blending

    gl.clearColor(0.0, 0.0, 0.0, 1.0);

    // Compile and link shaders
    this.program = createProgram(gl, VERTEX_SHADER_SOURCE, FOLD_FRAGMENT_SHADER_SOURCE);
    gl.useProgram(this.program);

    // Locate uniforms
    this.uProjMatrixLoc = gl.getUniformLocation(this.program, 'u_projectionMatrix');
    this.uMvMatrixLoc = gl.getUniformLocation(this.program, 'u_modelViewMatrix');
    this.uFoldAmountLoc = gl.getUniformLocation(this.program, 'u_foldAmount');
    this.uHingeLoc = gl.getUniformLocation(this.program, 'u_hinge');
    this.uScreenSizeLoc = gl.getUniformLocation(this.program, 'u_screenSize');
    this.uUvScaleLoc = gl.getUniformLocation(this.program, 'u_uvScale');
    this.uUvOffsetLoc = gl.getUniformLocation(this.program, 'u_uvOffset');
    this.uMaxLodLoc = gl.getUniformLocation(this.program, 'u_maxLod');
    this.uTiltAngleLoc = gl.getUniformLocation(this.program, 'u_tiltAngle');
    this.uResolutionLoc = gl.getUniformLocation(this.program, 'u_resolution');
    this.uTextureLoc = gl.getUniformLocation(this.program, 'u_texture');

    // Bind texture unit 0
    gl.uniform1i(this.uTextureLoc, 0);

    // Create subdivided mesh (256 horizontal columns for buttery curved glass fold)
    this.mesh = createSubdividedMesh(gl, 256, 4);

    // Setup ModelView matrix (Camera placed back on Z)
    this.modelViewMatrix = createIdentityMatrix();
    this.modelViewMatrix[14] = -this.cameraZ;

    // If there was a pending image texture, upload now
    if (this.pendingSource) {
      this.setImage(this.pendingSource.source, this.pendingSource.width, this.pendingSource.height);
    }
  }

  public setImage(source: TexImageSource, width: number, height: number): void {
    const gl = this.gl;
    if (!gl) {
      this.pendingSource = { source, width, height };
      return;
    }

    if (this.activeTexture) {
      deleteTexture(gl, this.activeTexture);
      this.activeTexture = null;
    }

    this.activeTexture = createTextureFromSource(gl, source, width, height);
    this.resize();
  }

  public resize(): void {
    const gl = this.gl;
    if (!gl) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2.0);
    const displayWidth = Math.floor(this.canvas.clientWidth * dpr);
    const displayHeight = Math.floor(this.canvas.clientHeight * dpr);

    if (this.canvas.width !== displayWidth || this.canvas.height !== displayHeight) {
      this.canvas.width = displayWidth;
      this.canvas.height = displayHeight;
    }

    gl.viewport(0, 0, this.canvas.width, this.canvas.height);

    const aspect = this.canvas.width / (this.canvas.height || 1);
    this.projectionMatrix = createPerspectiveMatrix(this.cameraFov, aspect, 0.1, 100.0);
  }

  public start(stateProvider: () => FoldInputState): void {
    this.stateProvider = stateProvider;
    if (this.isRunning) return;

    this.isRunning = true;
    this.lastTimestamp = performance.now();
    this.renderLoop(this.lastTimestamp);
  }

  public stop(): void {
    this.isRunning = false;
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  }

  private renderLoop = (timestamp: number): void => {
    if (!this.isRunning) return;

    const deltaTime = Math.min((timestamp - this.lastTimestamp) / 1000, 0.1);
    this.lastTimestamp = timestamp;

    this.renderFrame(deltaTime);

    this.animationFrameId = requestAnimationFrame(this.renderLoop);
  };

  private renderFrame(deltaTime: number): void {
    const gl = this.gl;
    if (!gl || !this.program || !this.mesh || !this.activeTexture) return;

    const inputState = this.stateProvider ? this.stateProvider() : {
      foldAmount: 0,
      hingeDirection: 'LEFT' as const,
      tiltAngle: 0,
      isInteracting: false,
      source: 'pointer' as const,
    };

    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.useProgram(this.program);

    // Visible camera frustum dimensions at plane Z = 0
    const halfVisibleHeight = this.cameraZ * Math.tan(this.cameraFov / 2);
    const halfVisibleWidth = halfVisibleHeight * (this.canvas.width / this.canvas.height);

    // Full-bleed aspect cover calculation:
    // Guarantees the mesh matches the physical phone screen edge-to-edge
    // with no cutting, margins, or letterboxing
    const screenAspect = this.canvas.width / this.canvas.height;
    const imgAspect = this.activeTexture.aspectRatio;

    let uvScaleX = 1.0;
    let uvScaleY = 1.0;

    if (screenAspect > imgAspect) {
      // Screen is wider than image (landscape/tablet)
      uvScaleY = imgAspect / screenAspect;
    } else {
      // Screen is taller than image (portrait phone)
      uvScaleX = screenAspect / imgAspect;
    }

    const uvOffsetX = (1.0 - uvScaleX) * 0.5;
    const uvOffsetY = (1.0 - uvScaleY) * 0.5;

    // Pass uniforms
    gl.uniformMatrix4fv(this.uProjMatrixLoc, false, this.projectionMatrix);
    gl.uniformMatrix4fv(this.uMvMatrixLoc, false, this.modelViewMatrix);
    gl.uniform1f(this.uFoldAmountLoc, inputState.foldAmount);
    gl.uniform1i(this.uHingeLoc, inputState.hingeDirection === 'LEFT' ? 0 : 1);
    gl.uniform2f(this.uScreenSizeLoc, halfVisibleWidth, halfVisibleHeight);
    gl.uniform2f(this.uUvScaleLoc, uvScaleX, uvScaleY);
    gl.uniform2f(this.uUvOffsetLoc, uvOffsetX, uvOffsetY);
    gl.uniform1f(this.uMaxLodLoc, this.activeTexture.maxLod);
    gl.uniform1f(this.uTiltAngleLoc, inputState.tiltAngle);
    gl.uniform2f(this.uResolutionLoc, this.canvas.width, this.canvas.height);

    // Bind texture
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.activeTexture.texture);

    // Draw mesh
    gl.bindVertexArray(this.mesh.vao);
    gl.drawElements(gl.TRIANGLES, this.mesh.indexCount, gl.UNSIGNED_SHORT, 0);
    gl.bindVertexArray(null);
  }

  private handleContextLost = (e: Event): void => {
    e.preventDefault();
    this.stop();
    if (this.config.onContextLost) {
      this.config.onContextLost();
    }
  };

  private handleContextRestored = (): void => {
    this.initPipeline();
    if (this.stateProvider) {
      this.start(this.stateProvider);
    }
    if (this.config.onContextRestored) {
      this.config.onContextRestored();
    }
  };

  public destroy(): void {
    this.stop();

    this.canvas.removeEventListener('webglcontextlost', this.handleContextLost);
    this.canvas.removeEventListener('webglcontextrestored', this.handleContextRestored);

    const gl = this.gl;
    if (gl) {
      if (this.activeTexture) {
        deleteTexture(gl, this.activeTexture);
        this.activeTexture = null;
      }
      if (this.mesh) {
        gl.deleteBuffer(this.mesh.vbo);
        gl.deleteBuffer(this.mesh.ibo);
        gl.deleteVertexArray(this.mesh.vao);
        this.mesh = null;
      }
      if (this.program) {
        gl.deleteProgram(this.program);
        this.program = null;
      }
    }
  }
}
