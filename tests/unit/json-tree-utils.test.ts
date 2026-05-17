import { describe, it, expect } from 'vitest';
import { walk, computeStats, flattenForTable } from '@/lib/json/tree-utils';

describe('walk', () => {
  it('visits the root for a primitive', () => {
    const visits: Array<[string, unknown]> = [];
    walk(42, (path, v) => visits.push([path, v]));
    expect(visits).toEqual([['$', 42]]);
  });

  it('visits nested object keys with JSONPath-style paths', () => {
    const visits: string[] = [];
    walk({ a: { b: 1 }, c: [2, 3] }, (path) => visits.push(path));
    expect(visits).toContain('$');
    expect(visits).toContain('$.a');
    expect(visits).toContain('$.a.b');
    expect(visits).toContain('$.c');
    expect(visits).toContain('$.c[0]');
    expect(visits).toContain('$.c[1]');
  });
});

describe('computeStats', () => {
  it('counts nodes, depth, keys, arrays, objects', () => {
    const stats = computeStats({ a: { b: 1, c: 2 }, d: [1, 2, 3] });
    expect(stats.objects).toBe(2); // root + a
    expect(stats.arrays).toBe(1); // d
    expect(stats.keys).toBe(4); // a, b, c, d
    expect(stats.depth).toBeGreaterThanOrEqual(2);
    expect(stats.nodes).toBeGreaterThan(0);
  });

  it('handles a primitive at top level', () => {
    const stats = computeStats(true);
    expect(stats.nodes).toBe(1);
    expect(stats.depth).toBe(0);
    expect(stats.keys).toBe(0);
  });

  it('handles empty object/array', () => {
    expect(computeStats({}).objects).toBe(1);
    expect(computeStats({}).keys).toBe(0);
    expect(computeStats([]).arrays).toBe(1);
  });
});

describe('flattenForTable', () => {
  it('returns null when input is not an array', () => {
    expect(flattenForTable({ a: 1 })).toBeNull();
    expect(flattenForTable('not array')).toBeNull();
    expect(flattenForTable(42)).toBeNull();
  });

  it('computes a union of columns across rows', () => {
    const result = flattenForTable([
      { name: 'a', age: 1 },
      { name: 'b', email: 'b@x' },
      { age: 3 },
    ]);
    expect(result).not.toBeNull();
    expect(result!.columns).toEqual(['name', 'age', 'email']);
    expect(result!.rows).toHaveLength(3);
  });

  it('wraps primitive items in a `value` column', () => {
    const result = flattenForTable([1, 'two', null]);
    expect(result!.columns).toEqual(['value']);
    expect(result!.rows[0]).toEqual({ value: 1 });
    expect(result!.rows[2]).toEqual({ value: null });
  });

  it('returns an empty table for an empty array', () => {
    const result = flattenForTable([]);
    expect(result!.columns).toEqual([]);
    expect(result!.rows).toEqual([]);
  });
});
