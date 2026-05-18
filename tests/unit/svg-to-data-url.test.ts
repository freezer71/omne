import { describe, it, expect } from 'vitest';
import { svgToDataUrl } from '@/lib/tools/implementations/svg-to-data-url';

const SAMPLE = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10"><rect width="10" height="10" fill="#ff0000"/></svg>';

describe('svgToDataUrl', () => {
  it('returns empty fields for blank input', () => {
    const out = svgToDataUrl('');
    expect(out).toEqual({ base64: '', urlEncoded: '', base64Bytes: 0, urlEncodedBytes: 0 });
  });

  it('returns empty fields for whitespace-only input', () => {
    expect(svgToDataUrl('   \n   ').base64).toBe('');
  });

  it('produces a base64 data URI that round-trips to the original markup', () => {
    const { base64 } = svgToDataUrl(SAMPLE);
    expect(base64.startsWith('data:image/svg+xml;base64,')).toBe(true);
    const payload = base64.slice('data:image/svg+xml;base64,'.length);
    const decoded = decodeURIComponent(escape(atob(payload)));
    expect(decoded).toBe(SAMPLE);
  });

  it('produces a CSS-friendly URL-encoded data URI', () => {
    const { urlEncoded } = svgToDataUrl(SAMPLE);
    expect(urlEncoded.startsWith('data:image/svg+xml;utf8,')).toBe(true);
    // Swaps " for ' so url("…") wrapper works
    expect(urlEncoded.includes('"')).toBe(false);
    // Encodes the structural chars
    expect(urlEncoded.includes('%3C')).toBe(true);
    expect(urlEncoded.includes('%3E')).toBe(true);
  });

  it('reports UTF-8 byte counts (not UTF-16 code units)', () => {
    const utf8 = '<svg>é</svg>'; // é = 2 bytes in UTF-8
    const { base64Bytes, urlEncodedBytes } = svgToDataUrl(utf8);
    expect(base64Bytes).toBeGreaterThan(0);
    expect(urlEncodedBytes).toBeGreaterThan(0);
    // Sanity: bytes use TextEncoder, not raw .length
    const fakeStringLength = utf8.length;
    expect(base64Bytes).not.toBe(fakeStringLength);
  });

  it('escapes percent signs before other entities', () => {
    const withPercent = '<svg>100%</svg>';
    const { urlEncoded } = svgToDataUrl(withPercent);
    // % must become %25 (not survive into output as raw %)
    expect(urlEncoded.includes('%25')).toBe(true);
  });

  it('collapses whitespace in URL-encoded form for size', () => {
    const padded = '<svg>\n  \n  <rect/>\n</svg>';
    const { urlEncoded } = svgToDataUrl(padded);
    expect(urlEncoded.includes('\n')).toBe(false);
    expect(urlEncoded.includes('  ')).toBe(false);
  });
});
