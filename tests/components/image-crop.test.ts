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

import { cropImage } from '@/lib/tools/implementations/image-crop';

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

describe('cropImage', () => {
  it('creates a canvas of the rect size', async () => {
    await cropImage(new File([new Uint8Array([1])], 'p.png'), { x: 10, y: 20, w: 50, h: 30 });
    expect(createCanvasMock).toHaveBeenCalledWith(50, 30);
  });

  it('uses drawImage with the source rect', async () => {
    const ctx = { drawImage: vi.fn() };
    get2dContextMock.mockReturnValueOnce(ctx);
    await cropImage(new File([new Uint8Array([1])], 'p.png'), { x: 10, y: 20, w: 50, h: 30 });
    expect(ctx.drawImage.mock.calls[0]!.slice(1)).toEqual([10, 20, 50, 30, 0, 0, 50, 30]);
  });

  it('clamps the rect to image bounds', async () => {
    loadImageBitmapMock.mockResolvedValueOnce(fakeBitmap(100, 80));
    await cropImage(new File([new Uint8Array([1])], 'p.png'), { x: 80, y: 60, w: 50, h: 50 });
    // sw = min(50, 100 - 80) = 20; sh = min(50, 80 - 60) = 20
    expect(createCanvasMock).toHaveBeenCalledWith(20, 20);
  });

  it('throws when rect is fully outside the image', async () => {
    loadImageBitmapMock.mockResolvedValueOnce(fakeBitmap(100, 80));
    await expect(
      cropImage(new File([new Uint8Array([1])], 'p.png'), { x: 200, y: 200, w: 50, h: 50 }),
    ).rejects.toThrow(/bounds/i);
  });

  it('throws on invalid dimensions', async () => {
    await expect(
      cropImage(new File([new Uint8Array([1])], 'p.png'), { x: 0, y: 0, w: 0, h: 10 }),
    ).rejects.toThrow(/positive/i);
  });

  it('preserves the detected MIME', async () => {
    detectImageMimeMock.mockReturnValueOnce('image/jpeg');
    await cropImage(new File([new Uint8Array([1])], 'p.jpg'), { x: 0, y: 0, w: 10, h: 10 });
    expect(canvasToBytesMock.mock.calls[0]![1]).toBe('image/jpeg');
  });
});
