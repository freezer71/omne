import { describe, it, expect } from 'vitest';
import { safeParse } from '@/lib/json/parse';

describe('safeParse', () => {
  it('parses a valid JSON object', () => {
    const result = safeParse('{"a":1,"b":[true,null,"x"]}');
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value).toEqual({ a: 1, b: [true, null, 'x'] });
    }
  });

  it('parses primitives at top level', () => {
    expect(safeParse('true').ok).toBe(true);
    expect(safeParse('42').ok).toBe(true);
    expect(safeParse('"hello"').ok).toBe(true);
    expect(safeParse('null').ok).toBe(true);
  });

  it('returns failure on empty input', () => {
    const result = safeParse('');
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.line).toBe(1);
      expect(result.col).toBe(1);
    }
  });

  it('returns failure on whitespace-only input', () => {
    const result = safeParse('   \n  \t  ');
    expect(result.ok).toBe(false);
  });

  it('reports line and column for an invalid object', () => {
    const text = '{\n  "a": 1,\n  "b": ,\n}';
    const result = safeParse(text);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.line).toBeGreaterThanOrEqual(2);
      expect(result.message).toBeTruthy();
      expect(result.message).not.toMatch(/at position/);
    }
  });

  it('reports line 1 for an unterminated string on the first line', () => {
    const result = safeParse('"unterminated');
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.line).toBe(1);
    }
  });

  it('handles trailing comma as failure', () => {
    const result = safeParse('{"a":1,}');
    expect(result.ok).toBe(false);
  });

  it('handles CRLF line endings', () => {
    const text = '{\r\n  "a": 1,\r\n  "b": broken\r\n}';
    const result = safeParse(text);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.line).toBeGreaterThan(1);
    }
  });

  it('parses an array at the top level', () => {
    const result = safeParse('[1,2,3]');
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value).toEqual([1, 2, 3]);
  });

  it('strips noisy prefixes from error messages', () => {
    const result = safeParse('not json');
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.message).not.toMatch(/JSON\.parse:/i);
      expect(result.message).not.toMatch(/JSON Parse error:/i);
    }
  });
});
