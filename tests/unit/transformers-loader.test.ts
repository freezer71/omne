import { describe, it, expect, vi, beforeEach } from 'vitest';

const { autoModelMock, autoProcessorMock, RawImageMock, env } = vi.hoisted(() => ({
  autoModelMock: vi.fn(),
  autoProcessorMock: vi.fn(),
  RawImageMock: { fromBlob: vi.fn(), fromURL: vi.fn(), fromTensor: vi.fn() },
  env: {
    allowLocalModels: true,
    useBrowserCache: false,
    backends: { onnx: { wasm: { wasmPaths: undefined as string | undefined } } },
  },
}));

vi.mock('@huggingface/transformers', () => ({
  AutoModel: { from_pretrained: autoModelMock },
  AutoProcessor: { from_pretrained: autoProcessorMock },
  RawImage: RawImageMock,
  env,
}));

import {
  getBackgroundRemover,
  isBackgroundRemoverLoaded,
  _resetBackgroundRemover,
} from '@/lib/transformers-loader';

beforeEach(() => {
  autoModelMock.mockReset();
  autoProcessorMock.mockReset();
  autoModelMock.mockResolvedValue(vi.fn());
  autoProcessorMock.mockResolvedValue(vi.fn());
  env.allowLocalModels = true;
  env.useBrowserCache = false;
  env.backends.onnx.wasm.wasmPaths = undefined;
  _resetBackgroundRemover();
});

describe('getBackgroundRemover', () => {
  it('loads RMBG-1.4 via AutoModel + AutoProcessor', async () => {
    await getBackgroundRemover();
    expect(autoModelMock).toHaveBeenCalledOnce();
    expect(autoProcessorMock).toHaveBeenCalledOnce();
    expect(autoModelMock.mock.calls[0]![0]).toBe('briaai/RMBG-1.4');
    expect(autoProcessorMock.mock.calls[0]![0]).toBe('briaai/RMBG-1.4');
  });

  it('configures env to disable local models and enable browser cache', async () => {
    await getBackgroundRemover();
    expect(env.allowLocalModels).toBe(false);
    expect(env.useBrowserCache).toBe(true);
  });

  it('points the onnxruntime wasm runtime at the self-hosted /ort/ assets', async () => {
    // Without this, onnxruntime-web fetches its wasm from cdn.jsdelivr.net,
    // which the CSP blocks (and which would break the no-third-party-CDN promise).
    await getBackgroundRemover();
    expect(env.backends.onnx.wasm.wasmPaths).toBe('/ort/');
  });

  it('reuses the same bundle across calls (singleton)', async () => {
    await getBackgroundRemover();
    await getBackgroundRemover();
    await getBackgroundRemover();
    expect(autoModelMock).toHaveBeenCalledOnce();
    expect(autoProcessorMock).toHaveBeenCalledOnce();
  });

  it('exposes model, processor and RawImage on the bundle', async () => {
    const bundle = await getBackgroundRemover();
    expect(typeof bundle.model).toBe('function');
    expect(typeof bundle.processor).toBe('function');
    expect(bundle.RawImage).toBe(RawImageMock);
  });

  it('reports progress via callback', async () => {
    autoModelMock.mockImplementationOnce(
      async (_id: string, opts?: { progress_callback?: (e: { status: string; progress: number }) => void }) => {
        opts?.progress_callback?.({ status: 'downloading', progress: 50 });
        return vi.fn();
      },
    );
    const onProgress = vi.fn();
    await getBackgroundRemover(onProgress);
    expect(onProgress).toHaveBeenCalledWith(0.5);
  });

  it('isBackgroundRemoverLoaded reflects state', async () => {
    expect(isBackgroundRemoverLoaded()).toBe(false);
    await getBackgroundRemover();
    expect(isBackgroundRemoverLoaded()).toBe(true);
    _resetBackgroundRemover();
    expect(isBackgroundRemoverLoaded()).toBe(false);
  });
});
