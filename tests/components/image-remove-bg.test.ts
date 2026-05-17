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
  // Fill RGBA with non-zero values so we can verify alpha overwrites
  for (let i = 0; i < data.length; i += 4) {
    data[i] = 200; // R
    data[i + 1] = 100; // G
    data[i + 2] = 50; // B
    data[i + 3] = 255; // A — should be overwritten
  }
  return {
    drawImage: vi.fn(),
    getImageData: vi.fn(() => ({ data, width, height })),
    putImageData: vi.fn(),
    data,
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
  // by default mask: 16 pixels (4x4), alpha 0..255
  const defaultMask = new Uint8Array(16);
  for (let i = 0; i < 16; i++) defaultMask[i] = i % 2 === 0 ? 255 : 0;
  getBackgroundRemoverMock.mockResolvedValue(
    vi.fn(async () => [{ mask: { data: defaultMask, width: 4, height: 4 } }]),
  );
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

  it('applies the segmentation mask to the alpha channel (1-channel mask)', async () => {
    const ctx = fakeCtx();
    get2dContextMock.mockReturnValueOnce(ctx);
    const mask = new Uint8Array(16);
    for (let i = 0; i < 16; i++) mask[i] = i * 16; // varied alpha
    getBackgroundRemoverMock.mockResolvedValueOnce(
      vi.fn(async () => [{ mask: { data: mask, width: 4, height: 4 } }]),
    );
    await removeBackground(
      new File([new Uint8Array([1])], 'pic.png', { type: 'image/png' }),
    );
    expect(ctx.putImageData).toHaveBeenCalledOnce();
    // Verify alpha channel matches the mask
    for (let i = 0; i < 16; i++) {
      expect(ctx.data[i * 4 + 3]).toBe(i * 16);
    }
  });

  it('forwards a model-progress callback', async () => {
    get2dContextMock.mockReturnValueOnce(fakeCtx());
    const onModelProgress = vi.fn();
    await removeBackground(
      new File([new Uint8Array([1])], 'pic.png', { type: 'image/png' }),
      { onModelProgress },
    );
    expect(getBackgroundRemoverMock).toHaveBeenCalledWith(onModelProgress);
  });

  it('throws if the segmenter returns no mask', async () => {
    get2dContextMock.mockReturnValueOnce(fakeCtx());
    getBackgroundRemoverMock.mockResolvedValueOnce(vi.fn(async () => []));
    await expect(
      removeBackground(new File([new Uint8Array([1])], 'pic.png', { type: 'image/png' })),
    ).rejects.toThrow(/mask/i);
  });

  it('closes the bitmap even on failure', async () => {
    const bmp = fakeBitmap();
    loadImageBitmapMock.mockResolvedValueOnce(bmp);
    get2dContextMock.mockReturnValueOnce(fakeCtx());
    getBackgroundRemoverMock.mockResolvedValueOnce(vi.fn(async () => []));
    await expect(
      removeBackground(new File([new Uint8Array([1])], 'pic.png', { type: 'image/png' })),
    ).rejects.toThrow();
    expect(bmp.close).toHaveBeenCalled();
  });
});
