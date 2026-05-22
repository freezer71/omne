import { describe, it, expect, vi } from 'vitest';
import {
  extractImageBlobFromClipboardItems,
  extractImageFileFromDataTransfer,
} from '@/lib/tools/implementations/image-from-clipboard';

function fakeItem(types: string[], blobs: Record<string, Blob>) {
  return {
    types,
    getType: vi.fn(async (t: string) => {
      const blob = blobs[t];
      if (!blob) throw new Error(`no blob for ${t}`);
      return blob;
    }),
  };
}

function fakeDataTransfer(files: File[]): DataTransfer {
  const items = files.map((f) => ({
    kind: 'file' as const,
    type: f.type,
    getAsFile: () => f,
  }));
  return { items, files } as unknown as DataTransfer;
}

describe('extractImageBlobFromClipboardItems', () => {
  it('returns null when no items contain an image', async () => {
    const item = fakeItem(['text/plain'], {});
    const result = await extractImageBlobFromClipboardItems([item]);
    expect(result).toBeNull();
  });

  it('returns the PNG blob when available', async () => {
    const png = new Blob([new Uint8Array([0x89, 0x50, 0x4e, 0x47])], { type: 'image/png' });
    const item = fakeItem(['image/png', 'text/plain'], { 'image/png': png });
    const result = await extractImageBlobFromClipboardItems([item]);
    expect(result).toBe(png);
  });

  it('prefers PNG over JPEG when both present', async () => {
    const png = new Blob([new Uint8Array([0x89])], { type: 'image/png' });
    const jpeg = new Blob([new Uint8Array([0xff, 0xd8])], { type: 'image/jpeg' });
    const item = fakeItem(['image/jpeg', 'image/png'], {
      'image/png': png,
      'image/jpeg': jpeg,
    });
    const result = await extractImageBlobFromClipboardItems([item]);
    expect(result).toBe(png);
  });

  it('falls back to any image/* type if no canonical type matches', async () => {
    const heic = new Blob([new Uint8Array([0])], { type: 'image/heic' });
    const item = fakeItem(['image/heic'], { 'image/heic': heic });
    const result = await extractImageBlobFromClipboardItems([item]);
    expect(result).toBe(heic);
  });
});

describe('extractImageFileFromDataTransfer', () => {
  it('returns null when DataTransfer is null', () => {
    expect(extractImageFileFromDataTransfer(null)).toBeNull();
  });

  it('returns the first image File from items', () => {
    const file = new File([new Uint8Array([0x89, 0x50])], 'paste.png', { type: 'image/png' });
    expect(extractImageFileFromDataTransfer(fakeDataTransfer([file]))).toBe(file);
  });

  it('returns null when DataTransfer holds only non-image data', () => {
    const dt = { items: [], files: [] } as unknown as DataTransfer;
    expect(extractImageFileFromDataTransfer(dt)).toBeNull();
  });
});
