import { describe, it, expect, vi, beforeEach } from 'vitest';

const {
  loadImageBitmapMock,
  canvasToBytesMock,
  createCanvasMock,
  get2dContextMock,
  getBackgroundRemoverMock,
} = vi.hoisted(() => ({
  loadImageBitmapMock: vi.fn(),
  canvasToBytesMock: vi.fn(),
  createCanvasMock: vi.fn(),
  get2dContextMock: vi.fn(),
  getBackgroundRemoverMock: vi.fn(),
}));

vi.mock('@/lib/image-utils', () => ({
  loadImageBitmap: loadImageBitmapMock,
  canvasToBytes: canvasToBytesMock,
  createCanvas: createCanvasMock,
  get2dContext: get2dContextMock,
}));

vi.mock('@/lib/transformers-loader', () => ({
  getBackgroundRemover: getBackgroundRemoverMock,
}));

import { removeBackground } from '@/lib/tools/implementations/image-remove-bg';

function fakeBitmap(w = 4, h = 4) {
  return { width: w, height: h, close: vi.fn() };
}

function fakeCtx(width = 4, height = 4) {
  const data = new Uint8ClampedArray(width * height * 4);
  for (let i = 0; i < data.length; i += 4) {
    data[i] = 200;
    data[i + 1] = 100;
    data[i + 2] = 50;
    data[i + 3] = 255;
  }
  return {
    drawImage: vi.fn(),
    getImageData: vi.fn(() => ({ data, width, height })),
    putImageData: vi.fn(),
    data,
  };
}

function fakeTensor() {
  const t = {
    mul: vi.fn(),
    to: vi.fn(),
  };
  t.mul.mockReturnValue(t);
  t.to.mockReturnValue(t);
  return t;
}

function fakeRawImage(w = 4, h = 4, maskBytes?: Uint8Array) {
  const bytes = maskBytes ?? new Uint8Array(w * h);
  return {
    width: w,
    height: h,
    data: bytes,
    channels: 1,
    resize: vi.fn(async () => fakeRawImage(w, h, bytes)),
    toBlob: vi.fn(),
  };
}

beforeEach(() => {
  loadImageBitmapMock.mockReset();
  canvasToBytesMock.mockReset();
  createCanvasMock.mockReset();
  get2dContextMock.mockReset();
  getBackgroundRemoverMock.mockReset();

  loadImageBitmapMock.mockResolvedValue(fakeBitmap());
  canvasToBytesMock.mockResolvedValue(new Uint8Array([0x89, 0x50, 0x4e, 0x47]));
  createCanvasMock.mockReturnValue({ width: 0, height: 0 });

  const tensor = fakeTensor();
  const sourceRaw = fakeRawImage(4, 4);
  const maskRaw = fakeRawImage(4, 4, Uint8Array.from({ length: 16 }, (_, i) => (i % 2 === 0 ? 255 : 0)));

  getBackgroundRemoverMock.mockResolvedValue({
    model: vi.fn(async () => ({ output: [tensor] })),
    processor: vi.fn(async () => ({ pixel_values: 'pv' })),
    RawImage: {
      fromBlob: vi.fn(async () => sourceRaw),
      fromTensor: vi.fn(() => maskRaw),
      fromURL: vi.fn(),
    },
  });
});

describe('removeBackground', () => {
  it('returns PNG bytes', async () => {
    get2dContextMock.mockReturnValueOnce(fakeCtx());
    const out = await removeBackground(
      new File([new Uint8Array([1])], 'pic.png', { type: 'image/png' }),
    );
    expect(out).toBeInstanceOf(Uint8Array);
    expect(canvasToBytesMock.mock.calls[0]![1]).toBe('image/png');
  });

  it('applies the resized mask to the alpha channel', async () => {
    const ctx = fakeCtx();
    get2dContextMock.mockReturnValueOnce(ctx);
    const customMask = Uint8Array.from({ length: 16 }, (_, i) => i * 16);
    const tensor = fakeTensor();
    getBackgroundRemoverMock.mockResolvedValueOnce({
      model: vi.fn(async () => ({ output: [tensor] })),
      processor: vi.fn(async () => ({ pixel_values: 'pv' })),
      RawImage: {
        fromBlob: vi.fn(async () => fakeRawImage(4, 4)),
        fromTensor: vi.fn(() => fakeRawImage(4, 4, customMask)),
        fromURL: vi.fn(),
      },
    });
    await removeBackground(
      new File([new Uint8Array([1])], 'pic.png', { type: 'image/png' }),
    );
    expect(ctx.putImageData).toHaveBeenCalledOnce();
    for (let i = 0; i < 16; i++) {
      expect(ctx.data[i * 4 + 3]).toBe(i * 16);
    }
  });

  it('forwards the model-progress callback', async () => {
    get2dContextMock.mockReturnValueOnce(fakeCtx());
    const onModelProgress = vi.fn();
    await removeBackground(
      new File([new Uint8Array([1])], 'pic.png', { type: 'image/png' }),
      { onModelProgress },
    );
    expect(getBackgroundRemoverMock).toHaveBeenCalledWith(onModelProgress);
  });

  it('throws when the model returns no output', async () => {
    get2dContextMock.mockReturnValueOnce(fakeCtx());
    getBackgroundRemoverMock.mockResolvedValueOnce({
      model: vi.fn(async () => ({ output: [] })),
      processor: vi.fn(async () => ({ pixel_values: 'pv' })),
      RawImage: {
        fromBlob: vi.fn(async () => fakeRawImage(4, 4)),
        fromTensor: vi.fn(() => fakeRawImage(4, 4)),
        fromURL: vi.fn(),
      },
    });
    await expect(
      removeBackground(new File([new Uint8Array([1])], 'pic.png', { type: 'image/png' })),
    ).rejects.toThrow(/output/i);
  });

  it('closes the bitmap', async () => {
    const bmp = fakeBitmap();
    loadImageBitmapMock.mockResolvedValueOnce(bmp);
    get2dContextMock.mockReturnValueOnce(fakeCtx());
    await removeBackground(new File([new Uint8Array([1])], 'pic.png', { type: 'image/png' }));
    expect(bmp.close).toHaveBeenCalled();
  });
});
