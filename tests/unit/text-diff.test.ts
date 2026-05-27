import { describe, it, expect } from 'vitest';
import { diffText, diffStats, diffTokens } from '@/lib/tools/implementations/text-diff';

/* ---------- line mode ---------- */

describe('diffText — line mode', () => {
  it('returns all eq for identical texts', () => {
    const diff = diffText('hello\nworld', 'hello\nworld', 'line');
    expect(diff).toHaveLength(2);
    expect(diff.every((d) => d.kind === 'eq')).toBe(true);
    expect(diff[0]).toMatchObject({ kind: 'eq', text: 'hello', aLine: 1, bLine: 1 });
    expect(diff[1]).toMatchObject({ kind: 'eq', text: 'world', aLine: 2, bLine: 2 });
  });

  it('detects a single added line', () => {
    const diff = diffText('a\nb', 'a\nb\nc', 'line');
    const added = diff.filter((d) => d.kind === 'add');
    expect(added).toHaveLength(1);
    expect(added[0]?.text).toBe('c');
    expect(added[0]?.bLine).toBe(3);
  });

  it('detects a single removed line', () => {
    const diff = diffText('a\nb\nc', 'a\nc', 'line');
    const removed = diff.filter((d) => d.kind === 'del');
    expect(removed).toHaveLength(1);
    expect(removed[0]?.text).toBe('b');
    expect(removed[0]?.aLine).toBe(2);
  });

  it('handles multi-line diff with mixed add/del/eq', () => {
    const a = 'one\ntwo\nthree\nfour';
    const b = 'one\nTWO\nthree\nfive\nsix';
    const diff = diffText(a, b, 'line');

    const kinds = diff.map((d) => d.kind);
    expect(kinds).toContain('eq');
    expect(kinds).toContain('add');
    expect(kinds).toContain('del');

    // "one" and "three" are shared
    const eqs = diff.filter((d) => d.kind === 'eq');
    expect(eqs.map((d) => d.text)).toContain('one');
    expect(eqs.map((d) => d.text)).toContain('three');
  });

  it('treats empty strings as a single empty-string token', () => {
    const diff = diffText('', '', 'line');
    expect(diff).toHaveLength(1);
    expect(diff[0]).toMatchObject({ kind: 'eq', text: '' });
  });

  it('defaults mode to line when omitted', () => {
    const diff = diffText('a\nb', 'a\nc');
    expect(diff.some((d) => d.aLine !== undefined || d.bLine !== undefined)).toBe(true);
  });
});

/* ---------- word mode ---------- */

describe('diffText — word mode', () => {
  it('detects a single word change', () => {
    const diff = diffText('hello world', 'hello mars', 'word');
    const del = diff.find((d) => d.kind === 'del');
    const add = diff.find((d) => d.kind === 'add');
    expect(del?.text).toBe('world');
    expect(add?.text).toBe('mars');
  });

  it('detects added words', () => {
    const diff = diffText('a b', 'a b c', 'word');
    const added = diff.filter((d) => d.kind === 'add');
    expect(added.some((d) => d.text === 'c')).toBe(true);
  });

  it('detects removed words', () => {
    const diff = diffText('a b c', 'a c', 'word');
    const removed = diff.filter((d) => d.kind === 'del');
    expect(removed.some((d) => d.text === 'b')).toBe(true);
  });
});

/* ---------- char mode ---------- */

describe('diffText — char mode', () => {
  it('detects character-level changes', () => {
    const diff = diffText('abc', 'aXc', 'char');
    const del = diff.find((d) => d.kind === 'del');
    const add = diff.find((d) => d.kind === 'add');
    expect(del?.text).toBe('b');
    expect(add?.text).toBe('X');
  });

  it('handles completely different strings', () => {
    const diff = diffText('ab', 'xy', 'char');
    expect(diff.filter((d) => d.kind === 'del')).toHaveLength(2);
    expect(diff.filter((d) => d.kind === 'add')).toHaveLength(2);
  });
});

/* ---------- diffStats ---------- */

describe('diffStats', () => {
  it('counts additions, deletions, and unchanged lines', () => {
    const diff = diffText('a\nb\nc', 'a\nX\nc\nd', 'line');
    const stats = diffStats(diff);
    // "a" and "c" are unchanged, "b" is deleted, "X" and "d" are added
    expect(stats.unchanged).toBe(2);
    expect(stats.deletions).toBe(1);
    expect(stats.additions).toBe(2);
  });

  it('returns all zeros for an empty diff array', () => {
    const stats = diffStats([]);
    expect(stats).toEqual({ additions: 0, deletions: 0, unchanged: 0 });
  });

  it('returns all unchanged for identical texts', () => {
    const diff = diffText('foo\nbar', 'foo\nbar', 'line');
    const stats = diffStats(diff);
    expect(stats.additions).toBe(0);
    expect(stats.deletions).toBe(0);
    expect(stats.unchanged).toBe(2);
  });
});

/* ---------- diffTokens (lower-level) ---------- */

describe('diffTokens', () => {
  it('returns eq ops for identical arrays', () => {
    const ops = diffTokens(['a', 'b'], ['a', 'b']);
    expect(ops).toHaveLength(2);
    expect(ops.every((o) => o.kind === 'eq')).toBe(true);
    expect(ops[0]).toMatchObject({ kind: 'eq', value: 'a', aIndex: 0, bIndex: 0 });
  });

  it('returns add ops for items only in b', () => {
    const ops = diffTokens([], ['x']);
    expect(ops).toHaveLength(1);
    expect(ops[0]).toMatchObject({ kind: 'add', value: 'x', bIndex: 0 });
  });

  it('returns del ops for items only in a', () => {
    const ops = diffTokens(['x'], []);
    expect(ops).toHaveLength(1);
    expect(ops[0]).toMatchObject({ kind: 'del', value: 'x', aIndex: 0 });
  });
});

/* ---------- memory guard ---------- */

describe('memory guard (MAX_LCS_CELLS)', () => {
  it('throws when char-mode inputs exceed 10 million cells', () => {
    const big = 'x'.repeat(4_000);
    expect(() => diffText(big, big, 'char')).toThrow(/too large for diff/i);
  });

  it('does not throw when inputs are just under the limit', () => {
    // sqrt(10_000_000) ≈ 3162 — use 3162 × 3162 ≈ 9.998M cells
    const a = 'a'.repeat(3_162);
    const b = 'b'.repeat(3_162);
    expect(() => diffText(a, b, 'char')).not.toThrow();
  });
});

/* ---------- edge cases ---------- */

describe('edge cases', () => {
  it('handles both empty strings', () => {
    const diff = diffText('', '', 'line');
    expect(diff).toHaveLength(1);
    expect(diff[0]?.kind).toBe('eq');
    expect(diff[0]?.text).toBe('');
  });

  it('handles one empty and one non-empty (addition)', () => {
    const diff = diffText('', 'hello', 'line');
    const del = diff.filter((d) => d.kind === 'del');
    const add = diff.filter((d) => d.kind === 'add');
    // empty string tokenizes to [''], 'hello' to ['hello']
    // so '' is deleted and 'hello' is added
    expect(del).toHaveLength(1);
    expect(del[0]?.text).toBe('');
    expect(add).toHaveLength(1);
    expect(add[0]?.text).toBe('hello');
  });

  it('handles one non-empty and one empty (deletion)', () => {
    const diff = diffText('hello', '', 'line');
    const del = diff.filter((d) => d.kind === 'del');
    const add = diff.filter((d) => d.kind === 'add');
    expect(del).toHaveLength(1);
    expect(del[0]?.text).toBe('hello');
    expect(add).toHaveLength(1);
    expect(add[0]?.text).toBe('');
  });

  it('handles unicode characters in char mode', () => {
    const diff = diffText('café', 'cafè', 'char');
    const del = diff.find((d) => d.kind === 'del');
    const add = diff.find((d) => d.kind === 'add');
    expect(del?.text).toBe('é');
    expect(add?.text).toBe('è');
    // 'c', 'a', 'f' are unchanged
    expect(diff.filter((d) => d.kind === 'eq')).toHaveLength(3);
  });

  it('handles emoji in char mode', () => {
    const diff = diffText('a😀b', 'a😎b', 'char');
    const del = diff.find((d) => d.kind === 'del');
    const add = diff.find((d) => d.kind === 'add');
    expect(del?.text).toBe('😀');
    expect(add?.text).toBe('😎');
  });

  it('normalizes Windows line endings (\\r\\n) in line mode', () => {
    const diff = diffText('a\r\nb\r\nc', 'a\nb\nc', 'line');
    expect(diff).toHaveLength(3);
    expect(diff.every((d) => d.kind === 'eq')).toBe(true);
  });

  it('handles mixed \\r\\n and \\n line endings', () => {
    const a = 'line1\r\nline2\nline3';
    const b = 'line1\nline2\r\nline3';
    const diff = diffText(a, b, 'line');
    expect(diff).toHaveLength(3);
    expect(diff.every((d) => d.kind === 'eq')).toBe(true);
  });
});
