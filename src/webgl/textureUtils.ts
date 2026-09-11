/**
 * WebGL 2 texture upload and mipmap management.
 */

export interface TextureInfo {
  texture: WebGLTexture;
  width: number;
  height: number;
  aspectRatio: number;
  maxLod: number;
}

export function createTextureFromSource(
  gl: WebGL2RenderingContext,
  source: TexImageSource,
  width: number,
  height: number
): TextureInfo {
  const texture = gl.createTexture();
  if (!texture) {
    throw new Error('Failed to create WebGL texture');
  }

  gl.bindTexture(gl.TEXTURE_2D, texture);

  // Set pixel storage mode for web images (Y-flip for matching canvas coordinates)
  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, 0);
  gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, 1);

  // Upload texture data
  gl.texImage2D(
    gl.TEXTURE_2D,
    0,
    gl.RGBA,
    gl.RGBA,
    gl.UNSIGNED_BYTE,
    source
  );

  // Generate mipmaps for hardware progressive blur
  gl.generateMipmap(gl.TEXTURE_2D);

  // Trilinear filtering for smooth LOD sampling in shader
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

  // Compute maximum available mip level
  const maxDimension = Math.max(width, height);
  const totalMips = Math.floor(Math.log2(maxDimension));
  const maxLod = Math.max(1.0, Math.min(6.0, totalMips - 2));

  gl.bindTexture(gl.TEXTURE_2D, null);

  return {
    texture,
    width,
    height,
    aspectRatio: width / height,
    maxLod,
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
