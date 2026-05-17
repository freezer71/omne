import { describe, it, expect, vi, beforeEach } from 'vitest';

const {
  loadImageBitmapMock,
  canvasToBytesMock,
  createCanvasMock,
  get2dContextMock,
  inputToBytesMock,
  detectImageMimeMock,
} = vi.hoisted(() => ({
  loadImageBitmapMock: vi.fn(),
  canvasToBytesMock: vi.fn(),
  createCanvasMock: vi.fn(),
  get2dContextMock: vi.fn(),
  inputToBytesMock: vi.fn(),
  detectImageMimeMock: vi.fn(),
}));

vi.mock('@/lib/image-utils', () => ({
  loadImageBitmap: loadImageBitmapMock,
  canvasToBytes: canvasToBytesMock,
  createCanvas: createCanvasMock,
  get2dContext: get2dContextMock,
  inputToBytes: inputToBytesMock,
  detectImageMime: detectImageMimeMock,
}));

import { resizeImage } from '@/lib/tools/implementations/image-resize';

function fakeBitmap(w = 100, h = 80) {
  return { width: w, height: h, close: vi.fn() };
}

beforeEach(() => {
  loadImageBitmapMock.mockReset();
  canvasToBytesMock.mockReset();
  createCanvasMock.mockReset();
  get2dContextMock.mockReset();
  inputToBytesMock.mockReset();
  detectImageMimeMock.mockReset();

  loadImageBitmapMock.mockResolvedValue(fakeBitmap());
  canvasToBytesMock.mockResolvedValue(new Uint8Array([0x89, 0x50, 0x4e, 0x47]));
  createCanvasMock.mockReturnValue({ width: 0, height: 0 });
  get2dContextMock.mockReturnValue({ drawImage: vi.fn() });
  inputToBytesMock.mockResolvedValue({
    bytes: new Uint8Array([0x89, 0x50, 0x4e, 0x47]),
    mime: 'image/png',
  });
  detectImageMimeMock.mockReturnValue('image/png');
});

describe('resizeImage', () => {
  it('creates a canvas of the target size and draws into it', async () => {
    const ctx = { drawImage: vi.fn() };
    get2dContextMock.mockReturnValueOnce(ctx);
    await resizeImage(new File([new Uint8Array([1])], 'p.png'), { width: 200, height: 150 });
    expect(createCanvasMock).toHaveBeenCalledWith(200, 150);
    expect(ctx.drawImage.mock.calls[0]!.slice(1)).toEqual([0, 0, 200, 150]);
  });

  it('uses the detected MIME when no outputMime is given', async () => {
    detectImageMimeMock.mockReturnValueOnce('image/webp');
    await resizeImage(new File([new Uint8Array([1])], 'p.webp'), { width: 50, height: 50 });
    expect(canvasToBytesMock.mock.calls[0]![1]).toBe('image/webp');
  });

  it('respects an explicit outputMime', async () => {
    await resizeImage(new File([new Uint8Array([1])], 'p.png'), {
      width: 10,
      height: 10,
      outputMime: 'image/jpeg',
      quality: 0.6,
    });
    expect(canvasToBytesMock.mock.calls[0]![1]).toBe('image/jpeg');
    expect(canvasToBytesMock.mock.calls[0]![2]).toBe(0.6);
  });

  it('ignores quality for PNG output', async () => {
    await resizeImage(new File([new Uint8Array([1])], 'p.png'), {
      width: 10,
      height: 10,
      outputMime: 'image/png',
      quality: 0.5,
    });
    expect(canvasToBytesMock.mock.calls[0]![2]).toBeUndefined();
  });

  it('throws when dimensions are not positive', async () => {
    await expect(
      resizeImage(new File([new Uint8Array([1])], 'p.png'), { width: 0, height: 10 }),
    ).rejects.toThrow(/positive/i);
    await expect(
      resizeImage(new File([new Uint8Array([1])], 'p.png'), { width: 10, height: -3 }),
    ).rejects.toThrow(/positive/i);
  });

  it('throws when dimensions are not finite', async () => {
    await expect(
      resizeImage(new File([new Uint8Array([1])], 'p.png'), { width: NaN, height: 10 }),
    ).rejects.toThrow(/finite/i);
  });

  it('closes the bitmap', async () => {
    const bmp = fakeBitmap();
    loadImageBitmapMock.mockResolvedValueOnce(bmp);
    await resizeImage(new File([new Uint8Array([1])], 'p.png'), { width: 5, height: 5 });
    expect(bmp.close).toHaveBeenCalled();
  });
});
