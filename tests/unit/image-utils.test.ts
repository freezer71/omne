import { describe, it, expect } from 'vitest';
import { detectImageMime, inputToBytes } from '@/lib/image-utils';

const PNG = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
const JPEG = new Uint8Array([0xff, 0xd8, 0xff, 0xe0]);
const WEBP = new Uint8Array([
  0x52, 0x49, 0x46, 0x46,
  0x00, 0x00, 0x00, 0x00,
  0x57, 0x45, 0x42, 0x50,
]);

describe('detectImageMime', () => {
  it('detects PNG from magic bytes', () => {
    expect(detectImageMime(PNG)).toBe('image/png');
  });

  it('detects JPEG from magic bytes', () => {
    expect(detectImageMime(JPEG)).toBe('image/jpeg');
  });

  it('detects WebP from RIFF/WEBP container', () => {
    expect(detectImageMime(WEBP)).toBe('image/webp');
  });

  it('honors a valid MIME hint over byte inspection', () => {
    expect(detectImageMime(new Uint8Array([0x00]), 'image/png')).toBe('image/png');
    expect(detectImageMime(new Uint8Array([0x00]), 'image/jpeg')).toBe('image/jpeg');
    expect(detectImageMime(new Uint8Array([0x00]), 'image/webp')).toBe('image/webp');
  });

  it('throws for unsupported bytes and no hint', () => {
    expect(() => detectImageMime(new Uint8Array([0x00, 0x01, 0x02, 0x03]))).toThrow(
      /unsupported/i,
    );
  });

  it('ignores an unknown hint and falls back to bytes', () => {
    expect(detectImageMime(PNG, 'application/octet-stream')).toBe('image/png');
  });
});

describe('inputToBytes', () => {
  it('returns the Uint8Array unchanged', async () => {
    const bytes = new Uint8Array([1, 2, 3]);
    const result = await inputToBytes(bytes);
    expect(result.bytes).toBe(bytes);
    expect(result.mime).toBeUndefined();
  });

  it('wraps an ArrayBuffer in a Uint8Array', async () => {
    const buffer = new Uint8Array([4, 5, 6]).buffer;
    const result = await inputToBytes(buffer);
    expect(result.bytes).toBeInstanceOf(Uint8Array);
    expect(Array.from(result.bytes)).toEqual([4, 5, 6]);
  });

  it('reads a File into a Uint8Array and carries its MIME', async () => {
    const file = new File([new Uint8Array([7, 8]) as BlobPart], 'pic.png', { type: 'image/png' });
    const result = await inputToBytes(file);
    expect(Array.from(result.bytes)).toEqual([7, 8]);
    expect(result.mime).toBe('image/png');
  });
});
