import { describe, it, expect } from 'vitest';
import {
  loadImageBitmap,
  canvasToBytes,
  createCanvas,
  get2dContext,
} from '@/lib/image-utils';

describe('createCanvas', () => {
  it('produces a canvas with the requested dimensions', () => {
    const c = createCanvas(320, 240);
    expect(c.width).toBe(320);
    expect(c.height).toBe(240);
  });

  it('rounds non-integer dimensions', () => {
    const c = createCanvas(99.4, 99.6);
    expect(c.width).toBe(99);
    expect(c.height).toBe(100);
  });

  it('clamps to a minimum of 1 px', () => {
    const c = createCanvas(0, -5);
    expect(c.width).toBe(1);
    expect(c.height).toBe(1);
  });
});

describe('canvasToBytes', () => {
  it('returns PNG bytes when mime is image/png', async () => {
    const canvas = createCanvas(10, 10);
    const bytes = await canvasToBytes(canvas, 'image/png');
    expect(bytes).toBeInstanceOf(Uint8Array);
    expect(bytes[0]).toBe(0x89);
    expect(bytes[1]).toBe(0x50);
  });

  it('returns JPEG bytes when mime is image/jpeg', async () => {
    const canvas = createCanvas(10, 10);
    const bytes = await canvasToBytes(canvas, 'image/jpeg', 0.8);
    expect(bytes).toBeInstanceOf(Uint8Array);
    expect(bytes[0]).toBe(0xff);
    expect(bytes[1]).toBe(0xd8);
  });

  it('returns WebP bytes when mime is image/webp', async () => {
    const canvas = createCanvas(10, 10);
    const bytes = await canvasToBytes(canvas, 'image/webp');
    expect(bytes).toBeInstanceOf(Uint8Array);
    expect(bytes[0]).toBe(0x52);
  });
});

describe('loadImageBitmap', () => {
  it('returns an ImageBitmap with dimensions from a Blob input', async () => {
    const png = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
    const bitmap = await loadImageBitmap(png);
    expect(bitmap.width).toBeGreaterThan(0);
    expect(bitmap.height).toBeGreaterThan(0);
  });

  it('accepts a File input', async () => {
    const file = new File(
      [new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]) as BlobPart],
      'pic.png',
      { type: 'image/png' },
    );
    const bitmap = await loadImageBitmap(file);
    expect(bitmap.width).toBeGreaterThan(0);
  });
});

describe('get2dContext', () => {
  it('returns the 2D context for a canvas', () => {
    const c = createCanvas(10, 10);
    const ctx = get2dContext(c);
    expect(ctx).toBeDefined();
  });
});
