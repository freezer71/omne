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

import { rotateImage } from '@/lib/tools/implementations/image-rotate';

function fakeBitmap(w = 100, h = 80) {
  return { width: w, height: h, close: vi.fn() };
}

function fakeCtx() {
  return {
    save: vi.fn(),
    restore: vi.fn(),
    translate: vi.fn(),
    rotate: vi.fn(),
    scale: vi.fn(),
    drawImage: vi.fn(),
  };
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
  get2dContextMock.mockReturnValue(fakeCtx());
  inputToBytesMock.mockResolvedValue({
    bytes: new Uint8Array([0x89, 0x50, 0x4e, 0x47]),
    mime: 'image/png',
  });
  detectImageMimeMock.mockReturnValue('image/png');
});

describe('rotateImage', () => {
  it('uses the same dimensions for 0° and 180°', async () => {
    await rotateImage(new File([new Uint8Array([1])], 'p.png'), { angle: 0 });
    expect(createCanvasMock).toHaveBeenLastCalledWith(100, 80);
    await rotateImage(new File([new Uint8Array([1])], 'p.png'), { angle: 180 });
    expect(createCanvasMock).toHaveBeenLastCalledWith(100, 80);
  });

  it('swaps dimensions for 90° and 270°', async () => {
    await rotateImage(new File([new Uint8Array([1])], 'p.png'), { angle: 90 });
    expect(createCanvasMock).toHaveBeenLastCalledWith(80, 100);
    await rotateImage(new File([new Uint8Array([1])], 'p.png'), { angle: 270 });
    expect(createCanvasMock).toHaveBeenLastCalledWith(80, 100);
  });

  it('applies the angle in radians via ctx.rotate', async () => {
    const ctx = fakeCtx();
    get2dContextMock.mockReturnValueOnce(ctx);
    await rotateImage(new File([new Uint8Array([1])], 'p.png'), { angle: 90 });
    expect(ctx.rotate).toHaveBeenCalledWith(Math.PI / 2);
  });

  it('applies flipH via ctx.scale with x=-1', async () => {
    const ctx = fakeCtx();
    get2dContextMock.mockReturnValueOnce(ctx);
    await rotateImage(new File([new Uint8Array([1])], 'p.png'), { angle: 0, flipH: true });
    expect(ctx.scale).toHaveBeenCalledWith(-1, 1);
  });

  it('applies flipV via ctx.scale with y=-1', async () => {
    const ctx = fakeCtx();
    get2dContextMock.mockReturnValueOnce(ctx);
    await rotateImage(new File([new Uint8Array([1])], 'p.png'), { angle: 0, flipV: true });
    expect(ctx.scale).toHaveBeenCalledWith(1, -1);
  });

  it('throws on invalid angles', async () => {
    await expect(
      rotateImage(new File([new Uint8Array([1])], 'p.png'), {
        angle: 45 as unknown as 90,
      }),
    ).rejects.toThrow(/angle/i);
  });

  it('preserves the detected MIME', async () => {
    detectImageMimeMock.mockReturnValueOnce('image/webp');
    await rotateImage(new File([new Uint8Array([1])], 'p.webp'), { angle: 0 });
    expect(canvasToBytesMock.mock.calls[0]![1]).toBe('image/webp');
  });

  it('closes the bitmap', async () => {
    const bmp = fakeBitmap();
    loadImageBitmapMock.mockResolvedValueOnce(bmp);
    await rotateImage(new File([new Uint8Array([1])], 'p.png'), { angle: 0 });
    expect(bmp.close).toHaveBeenCalled();
  });
});
