/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, beforeAll } from 'vitest';
import { svgNaturalSize } from '@/lib/tools/implementations/svg-to-png';

beforeAll(() => {
  // jsdom doesn't implement HTMLImageElement.decode/onload realistically, so we
  // only test the pure parsing helpers from this module. Full pipeline coverage
  // is delegated to favicon-from-svg.test.ts (which exercises the same path)
  // and to the e2e suite.
});

describe('svgNaturalSize', () => {
  it('reads explicit width/height attributes', () => {
    expect(svgNaturalSize('<svg width="48" height="32"></svg>')).toEqual({ width: 48, height: 32 });
  });

  it('strips px/em suffixes on width/height', () => {
    expect(svgNaturalSize('<svg width="48px" height="2em"></svg>')).toEqual({ width: 48, height: 2 });
  });

  it('falls back to viewBox when width/height absent', () => {
    expect(svgNaturalSize('<svg viewBox="0 0 100 50"></svg>')).toEqual({ width: 100, height: 50 });
  });

  it('uses fallback size when no dimensions can be derived', () => {
    expect(svgNaturalSize('<svg></svg>', 256)).toEqual({ width: 256, height: 256 });
  });

  it('mixes explicit width with viewBox-derived height', () => {
    expect(svgNaturalSize('<svg width="200" viewBox="0 0 100 50"></svg>')).toEqual({ width: 200, height: 50 });
  });
});
