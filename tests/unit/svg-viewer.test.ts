/**
 * @vitest-environment jsdom
 */
import { describe, it, expect } from 'vitest';
import { inspectSvg, tokenizeSvg } from '@/lib/tools/implementations/svg-viewer';

describe('inspectSvg', () => {
  it('returns empty info for blank input', () => {
    const info = inspectSvg('');
    expect(info.width).toBeNull();
    expect(info.height).toBeNull();
    expect(info.viewBox).toBeNull();
    expect(info.elementCount).toBe(0);
    expect(info.bytes).toBe(0);
  });

  it('extracts root attributes and counts elements', () => {
    const markup = '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><g><rect/><circle/></g></svg>';
    const info = inspectSvg(markup);
    expect(info.width).toBe(24);
    expect(info.height).toBe(24);
    expect(info.viewBox).toBe('0 0 24 24');
    expect(info.elementCount).toBe(4); // svg + g + rect + circle
    expect(info.rootAttrs['xmlns']).toBe('http://www.w3.org/2000/svg');
    expect(info.bytes).toBeGreaterThan(0);
  });

  it('handles SVG without explicit width/height (viewBox-only)', () => {
    const info = inspectSvg('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 50"></svg>');
    expect(info.width).toBeNull();
    expect(info.height).toBeNull();
    expect(info.viewBox).toBe('0 0 100 50');
  });

  it('returns empty info for non-SVG markup', () => {
    const info = inspectSvg('<html><body>not svg</body></html>');
    expect(info.elementCount).toBe(0);
  });

  it('strips px/em/% suffixes when parsing width/height', () => {
    const info = inspectSvg('<svg xmlns="http://www.w3.org/2000/svg" width="48px" height="2em"></svg>');
    expect(info.width).toBe(48);
    expect(info.height).toBe(2);
  });
});

describe('tokenizeSvg', () => {
  it('classifies tags, attrs, and strings', () => {
    const tokens = tokenizeSvg('<rect fill="red"/>');
    const types = tokens.map((t) => t.type);
    expect(types).toContain('tag');
    expect(types).toContain('attr');
    expect(types).toContain('string');
  });

  it('round-trips: concatenated tokens equal the source', () => {
    const src = '<svg><rect fill="#fff"/></svg>';
    expect(tokenizeSvg(src).map((t) => t.value).join('')).toBe(src);
  });

  it('preserves comments as a separate type', () => {
    const tokens = tokenizeSvg('<!-- hi --><rect/>');
    expect(tokens.some((t) => t.type === 'comment')).toBe(true);
  });
});
