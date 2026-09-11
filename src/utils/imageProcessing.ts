/**
 * Image processing utilities for client-side loading, downscaling, and dimension validation.
 */

export interface ProcessedImage {
  source: HTMLCanvasElement | ImageBitmap | HTMLImageElement;
  width: number;
  height: number;
  aspectRatio: number;
  originalName: string;
}

const DEFAULT_MAX_TEXTURE_SIZE = 2048; // Safe baseline for mobile GPUs

/**
 * Loads a File or Blob, resizes if it exceeds maxTextureSize, and returns a drawable source.
 */
export async function processImageFile(
  file: File | Blob,
  fileName = 'photo.jpg',
  maxTextureSize: number = DEFAULT_MAX_TEXTURE_SIZE
): Promise<ProcessedImage> {
  const url = URL.createObjectURL(file);

  try {
    const img = await loadImageElement(url);
    const { width: origWidth, height: origHeight } = img;

    let targetWidth = origWidth;
    let targetHeight = origHeight;

    // Check if downscaling is required
    if (targetWidth > maxTextureSize || targetHeight > maxTextureSize) {
      if (targetWidth > targetHeight) {
        targetHeight = Math.round((targetHeight * maxTextureSize) / targetWidth);
        targetWidth = maxTextureSize;
      } else {
        targetWidth = Math.round((targetWidth * maxTextureSize) / targetHeight);
        targetHeight = maxTextureSize;
      }
    }

    // If no resize is needed, return image element directly
    if (targetWidth === origWidth && targetHeight === origHeight) {
      return {
        source: img,
        width: origWidth,
        height: origHeight,
        aspectRatio: origWidth / origHeight,
        originalName: fileName,
      };
    }

    // Resize using offscreen canvas for optimal GPU upload performance
    const canvas = document.createElement('canvas');
    canvas.width = targetWidth;
    canvas.height = targetHeight;
    const ctx = canvas.getContext('2d', { alpha: false });

    if (!ctx) {
      throw new Error('Could not create 2D canvas context for image processing');
    }

    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(img, 0, 0, targetWidth, targetHeight);

    return {
      source: canvas,
      width: targetWidth,
      height: targetHeight,
      aspectRatio: targetWidth / targetHeight,
      originalName: fileName,
    };
  } finally {
    URL.revokeObjectURL(url);
  }
}

function loadImageElement(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = (e) => reject(new Error('Failed to load image element'));
    img.src = url;
  });
}
