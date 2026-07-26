import { describe, it, expect, vi, beforeEach } from 'vitest';

const { loadMock, terminateMock, state } = vi.hoisted(() => ({
  loadMock: vi.fn(),
  terminateMock: vi.fn(),
  state: { ctorCalls: 0 },
}));

vi.mock('@ffmpeg/ffmpeg', () => ({
  FFmpeg: class {
    load = loadMock;
    terminate = terminateMock;
    on = () => {};
    off = () => {};
    exec = vi.fn();
    writeFile = vi.fn();
    readFile = vi.fn();
    deleteFile = vi.fn();
    constructor() {
      state.ctorCalls++;
    }
  },
}));

import { getFfmpeg, isLoaded, terminateFfmpeg, _resetFfmpegLoader } from '@/lib/ffmpeg-loader';

beforeEach(() => {
  loadMock.mockReset();
  loadMock.mockResolvedValue(undefined);
  terminateMock.mockReset();
  state.ctorCalls = 0;
  _resetFfmpegLoader();
});

describe('ffmpeg-loader', () => {
  it('reports not loaded before first call', () => {
    expect(isLoaded()).toBe(false);
  });

  it('creates an FFmpeg instance and calls load on first getFfmpeg()', async () => {
    const ffmpeg = await getFfmpeg();
    expect(ffmpeg).toBeDefined();
    expect(state.ctorCalls).toBe(1);
    expect(loadMock).toHaveBeenCalledTimes(1);
    expect(isLoaded()).toBe(true);
  });

  it('loads from the self-hosted /ffmpeg/ URLs (privacy-first)', async () => {
    await getFfmpeg();
    const config = loadMock.mock.calls[0]![0];
    expect(config.coreURL).toBe('/ffmpeg/ffmpeg-core.js');
    expect(config.wasmURL).toBe('/ffmpeg/ffmpeg-core.wasm');
  });

  it('returns the same instance on subsequent calls without re-loading', async () => {
    const a = await getFfmpeg();
    const b = await getFfmpeg();
    expect(a).toBe(b);
    expect(state.ctorCalls).toBe(1);
    expect(loadMock).toHaveBeenCalledTimes(1);
  });

  it('shares the loading promise between concurrent callers', async () => {
    const [a, b, c] = await Promise.all([getFfmpeg(), getFfmpeg(), getFfmpeg()]);
    expect(a).toBe(b);
    expect(b).toBe(c);
    expect(state.ctorCalls).toBe(1);
    expect(loadMock).toHaveBeenCalledTimes(1);
  });

  describe('terminateFfmpeg', () => {
    it('terminates the loaded instance', async () => {
      await getFfmpeg();
      terminateFfmpeg();
      expect(terminateMock).toHaveBeenCalledTimes(1);
      expect(isLoaded()).toBe(false);
    });

    it('builds and loads a fresh core afterwards, since terminate leaves the old one dead', async () => {
      const first = await getFfmpeg();
      terminateFfmpeg();
      const second = await getFfmpeg();
      expect(second).not.toBe(first);
      expect(state.ctorCalls).toBe(2);
      expect(loadMock).toHaveBeenCalledTimes(2);
    });

    it('reaches an instance that is still downloading its core', async () => {
      let release: () => void = () => {};
      loadMock.mockReturnValue(new Promise<void>((resolve) => { release = resolve; }));
      const pending = getFfmpeg();
      // Cancelled before load() settles: the object exists but was never cached
      // as the loaded instance, so only the `live` reference can find it.
      terminateFfmpeg();
      expect(terminateMock).toHaveBeenCalledTimes(1);
      release();
      await pending;
    });

    it('is a no-op when nothing was ever created', () => {
      expect(() => terminateFfmpeg()).not.toThrow();
      expect(terminateMock).not.toHaveBeenCalled();
    });
  });
});
