import { describe, it, expect, vi, beforeEach } from 'vitest';

const { loadImageBitmapMock, canvasToBytesMock, createCanvasMock, get2dContextMock } =
  vi.hoisted(() => ({
    loadImageBitmapMock: vi.fn(),
    canvasToBytesMock: vi.fn(),
    createCanvasMock: vi.fn(),
    get2dContextMock: vi.fn(),
  }));

vi.mock('@/lib/image-utils', () => ({
  loadImageBitmap: loadImageBitmapMock,
  canvasToBytes: canvasToBytesMock,
  createCanvas: createCanvasMock,
  get2dContext: get2dContextMock,
}));

import { convertImage } from '@/lib/tools/implementations/image-convert';

function fakeBitmap(width = 100, height = 80) {
  return { width, height, close: vi.fn() };
}

beforeEach(() => {
  loadImageBitmapMock.mockReset();
  canvasToBytesMock.mockReset();
  createCanvasMock.mockReset();
  get2dContextMock.mockReset();

  loadImageBitmapMock.mockResolvedValue(fakeBitmap());
  canvasToBytesMock.mockResolvedValue(new Uint8Array([0x89, 0x50, 0x4e, 0x47]));
  createCanvasMock.mockReturnValue({ width: 0, height: 0 });
  get2dContextMock.mockReturnValue({ drawImage: vi.fn() });
});

describe('convertImage', () => {
  it('returns Uint8Array bytes from canvas encoding', async () => {
    const bytes = new Uint8Array([1, 2, 3]);
    const file = new File([bytes as BlobPart], 'pic.png', { type: 'image/png' });
    const out = await convertImage(file, 'jpeg');
    expect(out).toBeInstanceOf(Uint8Array);
  });

  it('creates a canvas with the bitmap dimensions', async () => {
    loadImageBitmapMock.mockResolvedValueOnce(fakeBitmap(200, 150));
    const file = new File([new Uint8Array([1])], 'pic.png');
    await convertImage(file, 'png');
    expect(createCanvasMock).toHaveBeenCalledWith(200, 150);
  });

  it('passes the right MIME to canvasToBytes', async () => {
    const file = new File([new Uint8Array([1])], 'pic.png');
    await convertImage(file, 'jpeg');
    expect(canvasToBytesMock.mock.calls[0]![1]).toBe('image/jpeg');
    canvasToBytesMock.mockClear();
    await convertImage(file, 'webp');
    expect(canvasToBytesMock.mock.calls[0]![1]).toBe('image/webp');
    canvasToBytesMock.mockClear();
    await convertImage(file, 'png');
    expect(canvasToBytesMock.mock.calls[0]![1]).toBe('image/png');
  });

  it('ignores quality for PNG target (lossless)', async () => {
    const file = new File([new Uint8Array([1])], 'pic.png');
    await convertImage(file, 'png', { quality: 0.5 });
    expect(canvasToBytesMock.mock.calls[0]![2]).toBeUndefined();
  });

  it('forwards quality for lossy formats', async () => {
    const file = new File([new Uint8Array([1])], 'pic.png');
    await convertImage(file, 'jpeg', { quality: 0.75 });
    expect(canvasToBytesMock.mock.calls[0]![2]).toBe(0.75);
  });

  it('closes the bitmap to free memory', async () => {
    const bmp = fakeBitmap();
    loadImageBitmapMock.mockResolvedValueOnce(bmp);
    const file = new File([new Uint8Array([1])], 'pic.png');
    await convertImage(file, 'png');
    expect(bmp.close).toHaveBeenCalledOnce();
  });

  it('closes the bitmap even if encoding fails', async () => {
    const bmp = fakeBitmap();
    loadImageBitmapMock.mockResolvedValueOnce(bmp);
    canvasToBytesMock.mockRejectedValueOnce(new Error('encode failed'));
    const file = new File([new Uint8Array([1])], 'pic.png');
    await expect(convertImage(file, 'jpeg')).rejects.toThrow(/encode failed/);
    expect(bmp.close).toHaveBeenCalledOnce();
  });
});
