/**
 * @vitest-environment jsdom
 */
import { describe, it, expect } from 'vitest';
import {
  applyRootAttrs,
  applyRootTransform,
  extractFills,
  parseSvgDoc,
  readRootTransform,
  replaceColor,
} from '@/lib/tools/implementations/svg-editor';

const HEART = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path fill="#ff0000" d="M12 21s-7-4.5-7-10a4 4 0 0 1 7-2 4 4 0 0 1 7 2c0 5.5-7 10-7 10z"/><circle fill="#ff0000" cx="6" cy="6" r="2"/><rect style="fill: #00ff00; stroke: #0000ff" x="0" y="0" width="4" height="4"/></svg>';

describe('parseSvgDoc', () => {
  it('parses valid SVG', () => {
    const r = parseSvgDoc(HEART);
    expect(r.error).toBeNull();
    expect(r.root?.nodeName.toLowerCase()).toBe('svg');
  });

  it('rejects empty input', () => {
    const r = parseSvgDoc('');
    expect(r.error).not.toBeNull();
  });

  it('rejects non-svg roots', () => {
    const r = parseSvgDoc('<html><body>nope</body></html>');
    expect(r.error).not.toBeNull();
  });
});

describe('extractFills', () => {
  it('lists distinct colors with counts and normalizes hex', () => {
    const { doc } = parseSvgDoc(HEART);
    expect(doc).not.toBeNull();
    const colors = extractFills(doc!);
    const map = new Map(colors.map((c) => [c.color, c.count]));
    expect(map.get('#ff0000')).toBe(2);
    expect(map.get('#00ff00')).toBe(1);
    expect(map.get('#0000ff')).toBe(1);
  });

  it('returns empty for SVG without fills/strokes', () => {
    const { doc } = parseSvgDoc('<svg xmlns="http://www.w3.org/2000/svg"><rect/></svg>');
    expect(doc).not.toBeNull();
    expect(extractFills(doc!)).toEqual([]);
  });
});

describe('replaceColor', () => {
  it('replaces a color in attributes', () => {
    const next = replaceColor(HEART, '#ff0000', '#abcdef');
    expect(next).toContain('#abcdef');
    expect(next).not.toContain('#ff0000');
  });

  it('replaces a color in inline styles', () => {
    const next = replaceColor(HEART, '#00ff00', '#abcdef');
    expect(next).toContain('#abcdef');
  });

  it('does not touch unrelated text content (comments)', () => {
    const withComment = '<svg xmlns="http://www.w3.org/2000/svg"><!-- fill="#ff0000" --><rect fill="#ff0000"/></svg>';
    const next = replaceColor(withComment, '#ff0000', '#abcdef');
    // The comment text contains "#ff0000" — DOM-based replace should leave it intact
    expect(next).toContain('fill="#ff0000"'); // inside the comment
    expect(next).toContain('fill="#abcdef"'); // on the rect
  });
});

describe('applyRootAttrs', () => {
  it('sets width and height', () => {
    const next = applyRootAttrs('<svg xmlns="http://www.w3.org/2000/svg"></svg>', { width: '120', height: '60' });
    expect(next).toContain('width="120"');
    expect(next).toContain('height="60"');
  });

  it('removes an attribute when empty string is passed', () => {
    const next = applyRootAttrs('<svg xmlns="http://www.w3.org/2000/svg" width="100"></svg>', { width: '' });
    expect(next).not.toContain('width=');
  });

  it('preserves other attributes', () => {
    const next = applyRootAttrs('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10"></svg>', { width: '50' });
    expect(next).toContain('viewBox="0 0 10 10"');
    expect(next).toContain('width="50"');
  });
});

describe('applyRootTransform', () => {
  const BASE = '<svg xmlns="http://www.w3.org/2000/svg"><rect/></svg>';

  it('wraps children in a <g> with transform', () => {
    const next = applyRootTransform(BASE, { rotate: 45 });
    expect(next).toContain('rotate(45)');
    expect(next).toContain('data-omne-transform');
  });

  it('is idempotent: repeated calls do not stack <g>', () => {
    let next = applyRootTransform(BASE, { rotate: 45 });
    next = applyRootTransform(next, { rotate: 90 });
    next = applyRootTransform(next, { rotate: 30 });
    const occurrences = (next.match(/data-omne-transform/g) ?? []).length;
    expect(occurrences).toBe(1);
    expect(next).toContain('rotate(30)');
  });

  it('removes the wrapper when transform becomes identity', () => {
    let next = applyRootTransform(BASE, { rotate: 45 });
    next = applyRootTransform(next, {});
    expect(next).not.toContain('data-omne-transform');
  });

  it('readRootTransform returns the applied values', () => {
    const next = applyRootTransform(BASE, { rotate: 30, scale: 2 });
    const t = readRootTransform(next);
    expect(t.rotate).toBe(30);
    expect(t.scale).toBe(2);
  });
});
