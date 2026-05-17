import { describe, it, expect } from 'vitest';
import { query } from '@/lib/json/path';

const sample = {
  store: {
    book: [
      { category: 'reference', author: 'Nigel Rees', price: 8.95 },
      { category: 'fiction', author: 'Evelyn Waugh', price: 12.99 },
      { category: 'fiction', author: 'Herman Melville', price: 8.99 },
    ],
    bicycle: { color: 'red', price: 19.95 },
  },
};

describe('query (JSONPath)', () => {
  it('returns root keys for $.*', () => {
    const r = query(sample, '$.*');
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.results.length).toBeGreaterThan(0);
    }
  });

  it('returns matching strings for a specific path', () => {
    const r = query(sample, '$.store.book[*].author');
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.results).toEqual(['Nigel Rees', 'Evelyn Waugh', 'Herman Melville']);
    }
  });

  it('supports filter predicates', () => {
    const r = query(sample, '$.store.book[?(@.price>10)]');
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.results).toHaveLength(1);
      expect((r.results[0] as { author: string }).author).toBe('Evelyn Waugh');
    }
  });

  it('supports recursive descent', () => {
    const r = query(sample, '$..price');
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.results).toContain(8.95);
      expect(r.results).toContain(19.95);
    }
  });

  it('returns paths alongside values', () => {
    const r = query(sample, '$.store.book[*].author');
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.paths.length).toBe(3);
      expect(r.paths[0]).toMatch(/author/);
    }
  });

  it('returns ok with empty arrays for an empty path', () => {
    const r = query(sample, '');
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.results).toEqual([]);
      expect(r.paths).toEqual([]);
    }
  });

  it('returns ok with empty results for a path that matches nothing', () => {
    const r = query(sample, '$.nothing.here');
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.results).toEqual([]);
    }
  });
});
