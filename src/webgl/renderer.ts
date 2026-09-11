/**
 * Production-ready WebGL 2 Fold Renderer.
 * High-performance, 60 FPS animation loop, inverse screen-space ray projection
 * exactly matching the iPhone Solo optical illusion.
 */

import { VERTEX_SHADER_SOURCE, FOLD_FRAGMENT_SHADER_SOURCE } from './shaders';
import { createProgram, createScreenQuad, QuadMeshBuffers } from './glUtils';
import { createTextureFromSource, deleteTexture, TextureInfo } from './textureUtils';
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
  private mesh: QuadMeshBuffers | null = null;
  private activeTexture: TextureInfo | null = null;
  private pendingSource: { source: TexImageSource; width: number; height: number } | null = null;

  // Uniform locations
  private uImageLoc: WebGLUniformLocation | null = null;
  private uImageSizeLoc: WebGLUniformLocation | null = null;
  private uCoverLoc: WebGLUniformLocation | null = null;
  private uAspectLoc: WebGLUniformLocation | null = null;
  private uTurnLoc: WebGLUniformLocation | null = null;
  private uHingeLoc: WebGLUniformLocation | null = null;

  // Render loop
  private animationFrameId: number | null = null;
  private lastTimestamp: number = 0;
  private isRunning: boolean = false;
  private stateProvider: (() => FoldInputState) | null = null;

  constructor(canvas: HTMLCanvasElement, config: RendererConfig = {}) {
    this.canvas = canvas;
    this.config = config;

    this.initContext();
  }

  private initContext(): void {
    try {
      const gl = this.canvas.getContext('webgl2', {
        alpha: false,
        antialias: false,
        powerPreference: 'high-performance',
        preserveDrawingBuffer: false,
        desynchronized: true,
      });

      if (!gl) {
        throw new Error('WebGL 2 is not supported on this device/browser.');
      }

      this.gl = gl;

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

    gl.clearColor(0.0, 0.0, 0.0, 1.0);

    // Full-screen quad
    this.mesh = createScreenQuad(gl);

    // Compile and link shaders
    this.program = createProgram(gl, VERTEX_SHADER_SOURCE, FOLD_FRAGMENT_SHADER_SOURCE);
    gl.useProgram(this.program);

    // Locate uniforms
    this.uImageLoc = gl.getUniformLocation(this.program, 'u_image');
    this.uImageSizeLoc = gl.getUniformLocation(this.program, 'u_imageSize');
    this.uCoverLoc = gl.getUniformLocation(this.program, 'u_cover');
    this.uAspectLoc = gl.getUniformLocation(this.program, 'u_aspect');
    this.uTurnLoc = gl.getUniformLocation(this.program, 'u_turn');
    this.uHingeLoc = gl.getUniformLocation(this.program, 'u_hinge');

    gl.uniform1i(this.uImageLoc, 0);

    if (this.pendingSource && this.mesh) {
      this.setImage(this.pendingSource.source, this.pendingSource.width, this.pendingSource.height);
    }
  }

  public setImage(source: TexImageSource, width: number, height: number): void {
    const gl = this.gl;
    if (!gl || !this.mesh) {
      this.pendingSource = { source, width, height };
      return;
    }

    if (this.activeTexture) {
      deleteTexture(gl, this.activeTexture);
      this.activeTexture = null;
    }

    this.activeTexture = createTextureFromSource(gl, source, width, height, this.mesh.vao);
    this.resize();
  }

  public resize(): void {
    const gl = this.gl;
    if (!gl) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2.0);
    const displayWidth = Math.round(this.canvas.clientWidth * dpr);
    const displayHeight = Math.round(this.canvas.clientHeight * dpr);

    if (this.canvas.width !== displayWidth || this.canvas.height !== displayHeight) {
      this.canvas.width = displayWidth;
      this.canvas.height = displayHeight;
    }

    gl.viewport(0, 0, this.canvas.width, this.canvas.height);
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

    this.resize();

    const inputState = this.stateProvider ? this.stateProvider() : {
      foldAmount: 0,
      hingeDirection: 'LEFT' as const,
      tiltAngle: 0,
      isInteracting: false,
      source: 'pointer' as const,
    };

    const aspect = this.canvas.width / (this.canvas.height || 1);
    const imgW = this.activeTexture.width;
    const imgH = this.activeTexture.height;
    const imageAspect = imgW / (imgH || 1);

    // Exact cover calculation: image is scaled to fill canvas without borders or stretching
    const coverX = Math.min(1.0, aspect / imageAspect);
    const coverY = Math.min(1.0, imageAspect / aspect);

    gl.useProgram(this.program);
    gl.bindVertexArray(this.mesh.vao);

    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.activeTexture.texture);

    gl.uniform1i(this.uImageLoc, 0);
    gl.uniform2f(this.uImageSizeLoc, imgW, imgH);
    gl.uniform2f(this.uCoverLoc, coverX, coverY);
    gl.uniform1f(this.uAspectLoc, aspect);
    gl.uniform1f(this.uTurnLoc, inputState.foldAmount);
    gl.uniform1f(this.uHingeLoc, inputState.hingeDirection === 'LEFT' ? 0.0 : 1.0);

    gl.drawArrays(gl.TRIANGLES, 0, 6);
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
