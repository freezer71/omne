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

export async function removeBackground(
  input: ImageBytesInput,
  options: RemoveBgOptions = {},
): Promise<Uint8Array> {
  const segmenter = await getBackgroundRemover(options.onModelProgress);

  const bitmap = await loadImageBitmap(input);
  try {
    const w = bitmap.width;
    const h = bitmap.height;

    const fileForSegmenter =
      input instanceof File
        ? URL.createObjectURL(input)
        : URL.createObjectURL(new Blob([new Uint8Array(input as ArrayBuffer) as BlobPart]));

    let mask: { data: Uint8Array; width: number; height: number };
    try {
      const result = await segmenter(fileForSegmenter);
      const first = result[0];
      if (!first || !first.mask) {
        throw new Error('No segmentation mask returned');
      }
      mask = first.mask;
    } finally {
      URL.revokeObjectURL(fileForSegmenter);
    }

    const canvas = createCanvas(w, h);
    const ctx = get2dContext(canvas);
    ctx.drawImage(bitmap, 0, 0);
    const imageData = ctx.getImageData(0, 0, w, h);
    const data = imageData.data;
    const maskData = mask.data;
    const totalPixels = w * h;
    const maskStride = maskData.length === totalPixels ? 1 : 4;
    for (let i = 0; i < totalPixels; i++) {
      const alpha = maskData[i * maskStride] ?? 0;
      data[i * 4 + 3] = alpha;
    }
    ctx.putImageData(imageData, 0, 0);

    return await canvasToBytes(canvas, 'image/png');
  } finally {
    bitmap.close();
  }
}
