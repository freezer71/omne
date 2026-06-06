import { describe, it, expect, vi } from 'vitest';
import { ensureCrossOriginIsolated, ISOLATION_RELOAD_KEY } from '@/lib/ensure-isolation';

function makeStorage(initial: Record<string, string> = {}) {
  const map = new Map(Object.entries(initial));
  return {
    getItem: vi.fn((k: string) => map.get(k) ?? null),
    setItem: vi.fn((k: string, v: string) => void map.set(k, v)),
    removeItem: vi.fn((k: string) => void map.delete(k)),
  };
}

describe('ensureCrossOriginIsolated', () => {
  it('reloads once when the document is not isolated (SPA navigation case)', () => {
    const storage = makeStorage();
    const reload = vi.fn();
    const reloaded = ensureCrossOriginIsolated({ isolated: false, storage, reload });
    expect(reloaded).toBe(true);
    expect(reload).toHaveBeenCalledOnce();
    expect(storage.setItem).toHaveBeenCalledWith(ISOLATION_RELOAD_KEY, '1');
  });

  it('does not reload again when a reload was already attempted (loop guard)', () => {
    const storage = makeStorage({ [ISOLATION_RELOAD_KEY]: '1' });
    const reload = vi.fn();
    expect(ensureCrossOriginIsolated({ isolated: false, storage, reload })).toBe(false);
    expect(reload).not.toHaveBeenCalled();
  });

  it('clears the attempt flag and does nothing when already isolated', () => {
    const storage = makeStorage({ [ISOLATION_RELOAD_KEY]: '1' });
    const reload = vi.fn();
    expect(ensureCrossOriginIsolated({ isolated: true, storage, reload })).toBe(false);
    expect(reload).not.toHaveBeenCalled();
    expect(storage.removeItem).toHaveBeenCalledWith(ISOLATION_RELOAD_KEY);
  });

  it('does nothing when the crossOriginIsolated API is unavailable', () => {
    const storage = makeStorage();
    const reload = vi.fn();
    expect(ensureCrossOriginIsolated({ isolated: undefined, storage, reload })).toBe(false);
    expect(reload).not.toHaveBeenCalled();
    expect(storage.setItem).not.toHaveBeenCalled();
  });

  it('does not reload (and does not throw) when storage is unavailable', () => {
    const throwing = {
      getItem: vi.fn(() => {
        throw new Error('denied');
      }),
      setItem: vi.fn(),
      removeItem: vi.fn(),
    };
    const reload = vi.fn();
    expect(ensureCrossOriginIsolated({ isolated: false, storage: throwing, reload })).toBe(false);
    expect(reload).not.toHaveBeenCalled();
  });
});
