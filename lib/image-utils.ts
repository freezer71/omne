export type ImageBytesInput = File | Uint8Array | ArrayBuffer;

export type ImageMime = 'image/png' | 'image/jpeg' | 'image/webp';

const PNG_SIGNATURE = [0x89, 0x50, 0x4e, 0x47];
const JPEG_SIGNATURE = [0xff, 0xd8, 0xff];
const RIFF_SIGNATURE = [0x52, 0x49, 0x46, 0x46];
const WEBP_SIGNATURE = [0x57, 0x45, 0x42, 0x50];

function matches(bytes: Uint8Array, signature: number[], offset = 0): boolean {
  if (bytes.length < offset + signature.length) return false;
  for (let i = 0; i < signature.length; i++) {
    if (bytes[offset + i] !== signature[i]) return false;
  }
  return true;
}

export function detectImageMime(bytes: Uint8Array, hint?: string): ImageMime {
  if (hint === 'image/png' || hint === 'image/jpeg' || hint === 'image/webp') return hint;
  if (matches(bytes, PNG_SIGNATURE)) return 'image/png';
  if (matches(bytes, JPEG_SIGNATURE)) return 'image/jpeg';
  if (matches(bytes, RIFF_SIGNATURE) && matches(bytes, WEBP_SIGNATURE, 8)) return 'image/webp';
  throw new Error('Unsupported image format. Use PNG, JPEG, or WebP.');
}

export async function inputToBytes(
  input: ImageBytesInput,
): Promise<{ bytes: Uint8Array; mime?: string }> {
  if (input instanceof Uint8Array) return { bytes: input };
  if (input instanceof ArrayBuffer) return { bytes: new Uint8Array(input) };
  return { bytes: new Uint8Array(await input.arrayBuffer()), mime: input.type };
}

export async function loadImageBitmap(input: ImageBytesInput): Promise<ImageBitmap> {
  const { bytes, mime } = await inputToBytes(input);
  const resolvedMime = mime && mime.length > 0 ? mime : detectImageMime(bytes);
  const blob = new Blob([new Uint8Array(bytes) as BlobPart], { type: resolvedMime });
  return createImageBitmap(blob);
}

export function createCanvas(width: number, height: number): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(width));
  canvas.height = Math.max(1, Math.round(height));
  return canvas;
}

export function canvasToBytes(
  canvas: HTMLCanvasElement,
  mime: string,
  quality?: number,
): Promise<Uint8Array> {
  return new Promise((resolve, reject) => {
    const onBlob = async (blob: Blob | null) => {
      if (!blob) {
        reject(new Error(`Failed to encode image as ${mime}`));
        return;
      }
      resolve(new Uint8Array(await blob.arrayBuffer()));
    };
    if (quality === undefined) {
      canvas.toBlob(onBlob, mime);
    } else {
      canvas.toBlob(onBlob, mime, quality);
    }
  });
}

export function get2dContext(canvas: HTMLCanvasElement): CanvasRenderingContext2D {
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Failed to acquire 2D context');
  return ctx;
}
