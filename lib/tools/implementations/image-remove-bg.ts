import {
  canvasToBytes,
  createCanvas,
  get2dContext,
  loadImageBitmap,
  type ImageBytesInput,
} from '@/lib/image-utils';
import { getBackgroundRemover } from '@/lib/transformers-loader';

export type RemoveBgOptions = {
  onModelProgress?: (ratio: number) => void;
};

async function inputToBlob(input: ImageBytesInput): Promise<Blob> {
  if (input instanceof File) return input;
  if (input instanceof Uint8Array) return new Blob([new Uint8Array(input) as BlobPart]);
  return new Blob([new Uint8Array(input as ArrayBuffer) as BlobPart]);
}

export async function removeBackground(
  input: ImageBytesInput,
  options: RemoveBgOptions = {},
): Promise<Uint8Array> {
  const { model, processor, RawImage } = await getBackgroundRemover(options.onModelProgress);

  const blob = await inputToBlob(input);
  const rawImage = await RawImage.fromBlob(blob);
  const sourceW = rawImage.width;
  const sourceH = rawImage.height;

  const { pixel_values } = await processor(rawImage);
  const { output } = await model({ input: pixel_values });
  const tensor = output[0];
  if (!tensor) throw new Error('removeBackground: model returned no output tensor');

  const maskImage = (await RawImage.fromTensor(tensor.mul(255).to('uint8')).resize(
    sourceW,
    sourceH,
  )) as RawImageLikeWithData;
  const maskData = maskImage.data;
  const maskChannels = maskImage.channels;

  const bitmap = await loadImageBitmap(input);
  try {
    const canvas = createCanvas(sourceW, sourceH);
    const ctx = get2dContext(canvas);
    ctx.drawImage(bitmap, 0, 0, sourceW, sourceH);
    const imageData = ctx.getImageData(0, 0, sourceW, sourceH);
    const data = imageData.data;
    const total = sourceW * sourceH;
    for (let i = 0; i < total; i++) {
      const alpha = maskData[i * maskChannels] ?? 0;
      data[i * 4 + 3] = alpha;
    }
    ctx.putImageData(imageData, 0, 0);
    return await canvasToBytes(canvas, 'image/png');
  } finally {
    bitmap.close();
  }
}

type RawImageLikeWithData = {
  data: Uint8Array | Uint8ClampedArray;
  channels: number;
};
