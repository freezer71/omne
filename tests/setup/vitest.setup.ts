import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';

afterEach(() => {
  cleanup();
});

if (typeof HTMLCanvasElement !== 'undefined') {
  HTMLCanvasElement.prototype.toBlob = function stubToBlob(
    callback: BlobCallback,
    type?: string,
  ): void {
    const mime = type ?? 'image/png';
    const fakeBytes = mime === 'image/jpeg'
      ? new Uint8Array([0xff, 0xd8, 0xff, 0xe0])
      : mime === 'image/webp'
        ? new Uint8Array([0x52, 0x49, 0x46, 0x46, 0x00, 0x00, 0x00, 0x00, 0x57, 0x45, 0x42, 0x50])
        : new Uint8Array([0x89, 0x50, 0x4e, 0x47]);
    queueMicrotask(() => callback(new Blob([fakeBytes as BlobPart], { type: mime })));
  } as never;
}

if (typeof globalThis.createImageBitmap !== 'function') {
  (globalThis as { createImageBitmap?: (b: Blob) => Promise<ImageBitmap> }).createImageBitmap =
    async function stubCreateImageBitmap(_blob: Blob): Promise<ImageBitmap> {
      return {
        width: 100,
        height: 80,
        close() {},
      } as unknown as ImageBitmap;
    };
}

if (typeof HTMLCanvasElement !== 'undefined' && !HTMLCanvasElement.prototype.getContext.toString().includes('stub')) {
  HTMLCanvasElement.prototype.getContext = function stub() {
    return {
      fillRect: () => {},
      clearRect: () => {},
      getImageData: () => ({ data: new Uint8ClampedArray(4) }),
      putImageData: () => {},
      createImageData: () => ({ data: new Uint8ClampedArray(4) }),
      setTransform: () => {},
      drawImage: () => {},
      save: () => {},
      restore: () => {},
      beginPath: () => {},
      moveTo: () => {},
      lineTo: () => {},
      closePath: () => {},
      stroke: () => {},
      translate: () => {},
      scale: () => {},
      rotate: () => {},
      arc: () => {},
      fill: () => {},
      measureText: () => ({ width: 0 }),
      transform: () => {},
      rect: () => {},
      clip: () => {},
    } as unknown as CanvasRenderingContext2D;
  } as never;
}
