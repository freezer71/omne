import { describe, it, expect } from 'vitest';
import { diffJson, summarize, buildPathIndex } from '@/lib/json/diff';

describe('diffJson', () => {
  it('marks identical primitives as same', () => {
    const d = diffJson(42, 42);
    expect(d).toHaveLength(1);
    expect(d[0]?.kind).toBe('same');
  });

  it('marks different primitives as change', () => {
    const d = diffJson(1, 2);
    expect(d[0]?.kind).toBe('change');
    expect(d[0]?.before).toBe(1);
    expect(d[0]?.after).toBe(2);
  });

  it('detects added keys', () => {
    const d = diffJson({ a: 1 }, { a: 1, b: 2 });
    const b = d.find((x) => x.path === '$.b');
    expect(b?.kind).toBe('add');
    expect(b?.after).toBe(2);
  });

  it('detects removed keys', () => {
    const d = diffJson({ a: 1, b: 2 }, { a: 1 });
    const b = d.find((x) => x.path === '$.b');
    expect(b?.kind).toBe('del');
    expect(b?.before).toBe(2);
  });

  it('detects changed nested values', () => {
    const d = diffJson({ a: { b: 1 } }, { a: { b: 2 } });
    const node = d.find((x) => x.path === '$.a.b');
    expect(node?.kind).toBe('change');
    expect(node?.before).toBe(1);
    expect(node?.after).toBe(2);
  });

  it('compares arrays positionally', () => {
    const d = diffJson([1, 2, 3], [1, 9, 3, 4]);
    expect(d.find((x) => x.path === '$[1]')?.kind).toBe('change');
    expect(d.find((x) => x.path === '$[3]')?.kind).toBe('add');
  });
});

describe('summarize', () => {
  it('counts kinds correctly', () => {
    const d = diffJson({ a: 1, b: 2, c: 3 }, { a: 1, b: 9, d: 4 });
    const s = summarize(d);
    expect(s.same).toBeGreaterThan(0); // a
    expect(s.changed).toBe(1); // b
    expect(s.removed).toBe(1); // c
    expect(s.added).toBe(1); // d
  });
});

describe('buildPathIndex', () => {
  it('marks the leaf path and propagates change to ancestors', () => {
    const d = diffJson({ root: { inner: { leaf: 1 } } }, { root: { inner: { leaf: 2 } } });
    const idx = buildPathIndex(d);
    expect(idx.get('$.root.inner.leaf')).toBe('change');
    expect(idx.get('$.root.inner')).toBe('change');
    expect(idx.get('$.root')).toBe('change');
  });
});
