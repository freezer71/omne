import { describe, it, expect, vi, beforeEach } from 'vitest';

const { pipelineMock, env } = vi.hoisted(() => ({
  pipelineMock: vi.fn(),
  env: { allowLocalModels: true, useBrowserCache: false },
}));

vi.mock('@huggingface/transformers', () => ({
  pipeline: pipelineMock,
  env,
}));

import {
  getBackgroundRemover,
  isBackgroundRemoverLoaded,
  _resetBackgroundRemover,
} from '@/lib/transformers-loader';

beforeEach(() => {
  pipelineMock.mockReset();
  pipelineMock.mockImplementation(async () => vi.fn());
  env.allowLocalModels = true;
  env.useBrowserCache = false;
  _resetBackgroundRemover();
});

describe('getBackgroundRemover', () => {
  it('lazily creates the image-segmentation pipeline with RMBG-1.4', async () => {
    await getBackgroundRemover();
    expect(pipelineMock).toHaveBeenCalledOnce();
    const [task, model] = pipelineMock.mock.calls[0]!;
    expect(task).toBe('image-segmentation');
    expect(model).toBe('briaai/RMBG-1.4');
  });

  it('configures env to disable local models and enable browser cache', async () => {
    await getBackgroundRemover();
    expect(env.allowLocalModels).toBe(false);
    expect(env.useBrowserCache).toBe(true);
  });

  it('reuses the same pipeline instance across calls (singleton)', async () => {
    await getBackgroundRemover();
    await getBackgroundRemover();
    await getBackgroundRemover();
    expect(pipelineMock).toHaveBeenCalledOnce();
  });

  it('reports progress via the callback if a progress event arrives', async () => {
    pipelineMock.mockImplementationOnce(
      async (_task: string, _model: string, opts?: { progress_callback?: (e: { status: string; progress: number }) => void }) => {
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
