import { describe, it, expect } from 'vitest';
import { compareSizes } from '@/lib/tools/size-delta';

describe('compareSizes', () => {
  it('reports a shrink as a rounded percentage', () => {
    expect(compareSizes(1000, 680)).toEqual({ direction: 'smaller', percent: 32 });
  });

  it('reports growth as a rounded percentage', () => {
    expect(compareSizes(1000, 1250)).toEqual({ direction: 'larger', percent: 25 });
  });

  it('measures growth against the source, so doubling reads as 100% larger', () => {
    expect(compareSizes(500, 1000)).toEqual({ direction: 'larger', percent: 100 });
  });

  it('calls a sub-half-percent difference "same" rather than 0% smaller', () => {
    expect(compareSizes(100_000, 99_700)).toEqual({ direction: 'same' });
    expect(compareSizes(100_000, 100_300)).toEqual({ direction: 'same' });
  });

  it('treats identical sizes as same', () => {
    expect(compareSizes(4096, 4096)).toEqual({ direction: 'same' });
  });

  it('handles a result compressed to almost nothing', () => {
    expect(compareSizes(1_000_000, 1)).toEqual({ direction: 'smaller', percent: 100 });
  });

  it('returns null when there is no ratio to compute', () => {
    expect(compareSizes(0, 500)).toBeNull();
    expect(compareSizes(-1, 500)).toBeNull();
    expect(compareSizes(500, -1)).toBeNull();
    expect(compareSizes(Number.NaN, 500)).toBeNull();
    expect(compareSizes(500, Number.POSITIVE_INFINITY)).toBeNull();
  });

  it('accepts a zero-byte result', () => {
    expect(compareSizes(1000, 0)).toEqual({ direction: 'smaller', percent: 100 });
  });
});
