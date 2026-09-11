/**
 * WebGL 2 texture upload and Gaussian mipmap generation.
 */

import { compileShader } from './glUtils';
import { VERTEX_SHADER_SOURCE, GAUSS_FRAGMENT_SHADER_SOURCE } from './shaders';

export interface TextureInfo {
  texture: WebGLTexture;
  width: number;
  height: number;
  aspectRatio: number;
}

function clampToEdge(gl: WebGL2RenderingContext): void {
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
}

export function createTextureFromSource(
  gl: WebGL2RenderingContext,
  source: TexImageSource,
  width: number,
  height: number,
  quadVao: WebGLVertexArrayObject
): TextureInfo {
  const texture = gl.createTexture();
  if (!texture) throw new Error('Failed to create WebGL texture');

  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, 1);
  gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, 0);

  // Set mipmap filtering
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
  clampToEdge(gl);

  // Upload image
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, source);

  // Generate base mipmaps
  gl.generateMipmap(gl.TEXTURE_2D);

  // Build Gaussian mips for silky optical defocus
  try {
    const gaussProgram = gl.createProgram()!;
    const vs = compileShader(gl, gl.VERTEX_SHADER, VERTEX_SHADER_SOURCE);
    const fs = compileShader(gl, gl.FRAGMENT_SHADER, GAUSS_FRAGMENT_SHADER_SOURCE);
    gl.attachShader(gaussProgram, vs);
    gl.attachShader(gaussProgram, fs);
    gl.linkProgram(gaussProgram);
    gl.deleteShader(vs);
    gl.deleteShader(fs);

    const uSource = gl.getUniformLocation(gaussProgram, 'u_source');
    const uStep = gl.getUniformLocation(gaussProgram, 'u_step');
    const uLevel = gl.getUniformLocation(gaussProgram, 'u_level');

    const scratch = gl.createTexture()!;
    const framebuffer = gl.createFramebuffer()!;
    gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
    gl.bindTexture(gl.TEXTURE_2D, scratch);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    clampToEdge(gl);

    gl.useProgram(gaussProgram);
    gl.uniform1i(uSource, 0);
    gl.bindVertexArray(quadVao);

    const levels = Math.floor(Math.log2(Math.max(width, height)));
    for (let level = 1; level <= levels; level++) {
      const w = Math.max(1, width >> level);
      const h = Math.max(1, height >> level);
      const sourceW = Math.max(1, width >> (level - 1));
      const sourceH = Math.max(1, height >> (level - 1));

      // Horizontal blur pass
      gl.bindTexture(gl.TEXTURE_2D, scratch);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, w, h, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
      gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, scratch, 0);
      gl.viewport(0, 0, w, h);
      gl.bindTexture(gl.TEXTURE_2D, texture);
      gl.uniform1f(uLevel, level - 1);
      gl.uniform2f(uStep, 1 / sourceW, 0);
      gl.drawArrays(gl.TRIANGLES, 0, 6);

      // Vertical blur pass
      gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, level);
      gl.bindTexture(gl.TEXTURE_2D, scratch);
      gl.uniform1f(uLevel, 0);
      gl.uniform2f(uStep, 0, 1 / sourceH);
      gl.drawArrays(gl.TRIANGLES, 0, 6);
    }

    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.deleteFramebuffer(framebuffer);
    gl.deleteTexture(scratch);
    gl.deleteProgram(gaussProgram);
  } catch (err) {
    console.warn('Gaussian mips skipped, standard mipmaps active:', err);
  }

  gl.bindTexture(gl.TEXTURE_2D, null);

  return {
    texture,
    width,
    height,
    aspectRatio: width / height,
  };
}

export function deleteTexture(
  gl: WebGL2RenderingContext,
  textureInfo: TextureInfo | null
): void {
  if (textureInfo && textureInfo.texture) {
    gl.deleteTexture(textureInfo.texture);
  }
}
