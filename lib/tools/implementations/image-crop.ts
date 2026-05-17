import {
  canvasToBytes,
  createCanvas,
  detectImageMime,
  get2dContext,
  inputToBytes,
  loadImageBitmap,
  type ImageBytesInput,
  type ImageMime,
} from '@/lib/image-utils';

export type CropRect = {
  x: number;
  y: number;
  w: number;
  h: number;
};

export type CropImageOptions = {
  outputMime?: ImageMime;
  quality?: number;
};

export async function cropImage(
  input: ImageBytesInput,
  rect: CropRect,
  options: CropImageOptions = {},
): Promise<Uint8Array> {
  if (!Number.isFinite(rect.w) || !Number.isFinite(rect.h)) {
    throw new Error('cropImage: width and height must be finite');
  }
  if (rect.w <= 0 || rect.h <= 0) {
    throw new Error('cropImage: width and height must be positive');
  }

  let outputMime = options.outputMime;
  if (!outputMime) {
    const { bytes, mime } = await inputToBytes(input);
    outputMime = detectImageMime(bytes, mime);
  }

  const bitmap = await loadImageBitmap(input);
  try {
    const sx = Math.max(0, Math.round(rect.x));
    const sy = Math.max(0, Math.round(rect.y));
    const sw = Math.min(Math.round(rect.w), bitmap.width - sx);
    const sh = Math.min(Math.round(rect.h), bitmap.height - sy);

    if (sw <= 0 || sh <= 0) {
      throw new Error('cropImage: rect is outside image bounds');
    }

    const canvas = createCanvas(sw, sh);
    const ctx = get2dContext(canvas);
    ctx.drawImage(bitmap, sx, sy, sw, sh, 0, 0, sw, sh);

    const quality = outputMime === 'image/png' ? undefined : options.quality;
    return await canvasToBytes(canvas, outputMime, quality);
  } finally {
    bitmap.close();
  }
}
