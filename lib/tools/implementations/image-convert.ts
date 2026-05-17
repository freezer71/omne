import {
  canvasToBytes,
  createCanvas,
  get2dContext,
  loadImageBitmap,
  type ImageBytesInput,
  type ImageMime,
} from '@/lib/image-utils';

export type ImageTargetFormat = 'png' | 'jpeg' | 'webp';

const MIME: Record<ImageTargetFormat, ImageMime> = {
  png: 'image/png',
  jpeg: 'image/jpeg',
  webp: 'image/webp',
};

export type ConvertImageOptions = {
  quality?: number;
};

export async function convertImage(
  input: ImageBytesInput,
  target: ImageTargetFormat,
  options: ConvertImageOptions = {},
): Promise<Uint8Array> {
  const bitmap = await loadImageBitmap(input);
  try {
    const canvas = createCanvas(bitmap.width, bitmap.height);
    const ctx = get2dContext(canvas);
    ctx.drawImage(bitmap, 0, 0);
    const quality = target === 'png' ? undefined : options.quality;
    return await canvasToBytes(canvas, MIME[target], quality);
  } finally {
    bitmap.close();
  }
}
