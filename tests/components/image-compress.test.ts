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

import { compressImage } from '@/lib/tools/implementations/image-compress';

function fakeBitmap(width = 100, height = 80) {
  return { width, height, close: vi.fn() };
}

beforeEach(() => {
  loadImageBitmapMock.mockReset();
  canvasToBytesMock.mockReset();
  createCanvasMock.mockReset();
  get2dContextMock.mockReset();

  loadImageBitmapMock.mockResolvedValue(fakeBitmap());
  canvasToBytesMock.mockResolvedValue(new Uint8Array([0xff, 0xd8]));
  createCanvasMock.mockReturnValue({ width: 0, height: 0 });
  get2dContextMock.mockReturnValue({ drawImage: vi.fn() });
});

describe('compressImage', () => {
  it('defaults to JPEG output when no format is given', async () => {
    await compressImage(new File([new Uint8Array([1])], 'p.png'), { quality: 0.7 });
    expect(canvasToBytesMock.mock.calls[0]![1]).toBe('image/jpeg');
  });

  it('respects an explicit WebP target', async () => {
    await compressImage(new File([new Uint8Array([1])], 'p.png'), {
      quality: 0.6,
      format: 'webp',
    });
    expect(canvasToBytesMock.mock.calls[0]![1]).toBe('image/webp');
  });

  it('forwards the quality value', async () => {
    await compressImage(new File([new Uint8Array([1])], 'p.png'), { quality: 0.42 });
    expect(canvasToBytesMock.mock.calls[0]![2]).toBeCloseTo(0.42);
  });

  it('clamps quality to [0,1]', async () => {
    await compressImage(new File([new Uint8Array([1])], 'p.png'), { quality: -2 });
    expect(canvasToBytesMock.mock.calls[0]![2]).toBe(0);
    canvasToBytesMock.mockClear();
    await compressImage(new File([new Uint8Array([1])], 'p.png'), { quality: 5 });
    expect(canvasToBytesMock.mock.calls[0]![2]).toBe(1);
  });

  it('preserves original dimensions', async () => {
    loadImageBitmapMock.mockResolvedValueOnce(fakeBitmap(640, 480));
    await compressImage(new File([new Uint8Array([1])], 'p.png'), { quality: 0.8 });
    expect(createCanvasMock).toHaveBeenCalledWith(640, 480);
  });

  it('closes the bitmap after encoding', async () => {
    const bmp = fakeBitmap();
    loadImageBitmapMock.mockResolvedValueOnce(bmp);
    await compressImage(new File([new Uint8Array([1])], 'p.png'), { quality: 0.8 });
    expect(bmp.close).toHaveBeenCalledOnce();
  });
});
