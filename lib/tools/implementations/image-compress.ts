import {
  canvasToBytes,
  createCanvas,
  get2dContext,
  loadImageBitmap,
  type ImageBytesInput,
} from '@/lib/image-utils';

export type CompressTarget = 'jpeg' | 'webp';

export type CompressImageOptions = {
  quality: number;
  format?: CompressTarget;
};

const MIME: Record<CompressTarget, string> = {
  jpeg: 'image/jpeg',
  webp: 'image/webp',
};

function clamp01(n: number): number {
  if (Number.isNaN(n)) return 0.8;
  return Math.min(1, Math.max(0, n));
}

export async function compressImage(
  input: ImageBytesInput,
  options: CompressImageOptions,
): Promise<Uint8Array> {
  const format: CompressTarget = options.format ?? 'jpeg';
  const quality = clamp01(options.quality);
  const bitmap = await loadImageBitmap(input);
  try {
    const canvas = createCanvas(bitmap.width, bitmap.height);
    const ctx = get2dContext(canvas);
    ctx.drawImage(bitmap, 0, 0);
    return await canvasToBytes(canvas, MIME[format], quality);
  } finally {
    bitmap.close();
  }
}
