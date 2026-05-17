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

export type RotateAngle = 0 | 90 | 180 | 270;

export type RotateImageOptions = {
  angle: RotateAngle;
  flipH?: boolean;
  flipV?: boolean;
  outputMime?: ImageMime;
  quality?: number;
};

export async function rotateImage(
  input: ImageBytesInput,
  options: RotateImageOptions,
): Promise<Uint8Array> {
  const { angle, flipH = false, flipV = false } = options;
  if (![0, 90, 180, 270].includes(angle)) {
    throw new Error('rotateImage: angle must be 0, 90, 180, or 270');
  }

  let outputMime = options.outputMime;
  if (!outputMime) {
    const { bytes, mime } = await inputToBytes(input);
    outputMime = detectImageMime(bytes, mime);
  }

  const bitmap = await loadImageBitmap(input);
  try {
    const w = bitmap.width;
    const h = bitmap.height;
    const swap = angle === 90 || angle === 270;
    const outW = swap ? h : w;
    const outH = swap ? w : h;

    const canvas = createCanvas(outW, outH);
    const ctx = get2dContext(canvas);
    ctx.save();
    ctx.translate(outW / 2, outH / 2);
    ctx.rotate((angle * Math.PI) / 180);
    ctx.scale(flipH ? -1 : 1, flipV ? -1 : 1);
    ctx.drawImage(bitmap, -w / 2, -h / 2);
    ctx.restore();

    const quality = outputMime === 'image/png' ? undefined : options.quality;
    return await canvasToBytes(canvas, outputMime, quality);
  } finally {
    bitmap.close();
  }
}
