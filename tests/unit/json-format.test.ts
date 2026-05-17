import { describe, it, expect } from 'vitest';
import { format } from '@/lib/json/format';

describe('format', () => {
  const sample = { b: 2, a: { z: 1, y: [3, 1, 2] }, c: null };

  it('pretty-prints with 2 spaces by default', () => {
    const out = format(sample, { indent: '2' });
    expect(out).toContain('  "b": 2');
    expect(out.split('\n').length).toBeGreaterThan(1);
  });

  it('pretty-prints with 4 spaces', () => {
    const out = format(sample, { indent: '4' });
    expect(out).toContain('    "b": 2');
  });

  it('indents with tab character', () => {
    const out = format(sample, { indent: 'tab' });
    expect(out).toContain('\t"b": 2');
  });

  it('minifies on a single line', () => {
    const out = format(sample, { indent: 'minify' });
    expect(out).not.toContain('\n');
    expect(out).toBe(JSON.stringify(sample));
  });

  it('preserves original key order when sortKeys is false', () => {
    const out = format(sample, { indent: '2', sortKeys: false });
    const keys = (JSON.parse(out) as Record<string, unknown>);
    expect(Object.keys(keys)).toEqual(['b', 'a', 'c']);
  });

  it('sorts keys alphabetically when sortKeys is true', () => {
    const out = format(sample, { indent: '2', sortKeys: true });
    const parsed = JSON.parse(out) as Record<string, unknown>;
    expect(Object.keys(parsed)).toEqual(['a', 'b', 'c']);
    const nested = parsed['a'] as Record<string, unknown>;
    expect(Object.keys(nested)).toEqual(['y', 'z']);
  });

  it('does not sort array elements when sortKeys is true', () => {
    const out = format({ items: [3, 1, 2] }, { indent: '2', sortKeys: true });
    const parsed = JSON.parse(out) as { items: number[] };
    expect(parsed.items).toEqual([3, 1, 2]);
  });

  it('formats primitives at the top level', () => {
    expect(format(42, { indent: '2' })).toBe('42');
    expect(format(null, { indent: '2' })).toBe('null');
    expect(format(true, { indent: 'minify' })).toBe('true');
  });

  it('handles empty objects and arrays', () => {
    expect(format({}, { indent: '2' })).toBe('{}');
    expect(format([], { indent: '4' })).toBe('[]');
  });
});
