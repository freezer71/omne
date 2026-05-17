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

export type ResizeImageOptions = {
  width: number;
  height: number;
  outputMime?: ImageMime;
  quality?: number;
};

export async function resizeImage(
  input: ImageBytesInput,
  options: ResizeImageOptions,
): Promise<Uint8Array> {
  if (!Number.isFinite(options.width) || !Number.isFinite(options.height)) {
    throw new Error('resizeImage: width and height must be finite numbers');
  }
  if (options.width <= 0 || options.height <= 0) {
    throw new Error('resizeImage: width and height must be positive');
  }

  let outputMime = options.outputMime;
  if (!outputMime) {
    const { bytes, mime } = await inputToBytes(input);
    outputMime = detectImageMime(bytes, mime);
  }

  const bitmap = await loadImageBitmap(input);
  try {
    const canvas = createCanvas(options.width, options.height);
    const ctx = get2dContext(canvas);
    ctx.drawImage(bitmap, 0, 0, options.width, options.height);
    const quality = outputMime === 'image/png' ? undefined : options.quality;
    return await canvasToBytes(canvas, outputMime, quality);
  } finally {
    bitmap.close();
  }
}
