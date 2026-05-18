import { describe, it, expect } from 'vitest';
import {
  encodeUrl,
  decodeUrl,
  transformUrl,
  URL_VARIANTS,
} from '@/lib/tools/implementations/encode-url';

describe('URL_VARIANTS', () => {
  it('exposes the 3 variants', () => {
    expect(URL_VARIANTS).toEqual(['component', 'full', 'form']);
  });
});

describe('encodeUrl', () => {
  it('returns empty string for empty input', () => {
    for (const v of URL_VARIANTS) expect(encodeUrl('', v)).toBe('');
  });

  it("component encodes reserved URI characters like '/?&='", () => {
    expect(encodeUrl('a b/c?d=e&f', 'component')).toBe('a%20b%2Fc%3Fd%3De%26f');
  });

  it('full leaves reserved URI characters intact', () => {
    expect(encodeUrl('https://example.com/path?q=hello world', 'full'))
      .toBe('https://example.com/path?q=hello%20world');
  });

  it('form encodes spaces as +', () => {
    expect(encodeUrl('hello world', 'form')).toBe('hello+world');
  });

  it('form percent-encodes other chars like component', () => {
    expect(encodeUrl('a&b', 'form')).toBe('a%26b');
  });

  it('handles UTF-8 (component)', () => {
    expect(encodeUrl('café', 'component')).toBe('caf%C3%A9');
  });
});

describe('decodeUrl', () => {
  it('returns empty string for empty input', () => {
    for (const v of URL_VARIANTS) expect(decodeUrl('', v)).toBe('');
  });

  it('decodes component-encoded text', () => {
    expect(decodeUrl('a%20b%2Fc%3Fd%3De%26f', 'component')).toBe('a b/c?d=e&f');
  });

  it('full decodes %20 but leaves reserved chars (cosmetic — same as decodeURI)', () => {
    expect(decodeUrl('hello%20world', 'full')).toBe('hello world');
  });

  it('form decodes + to space', () => {
    expect(decodeUrl('hello+world', 'form')).toBe('hello world');
    expect(decodeUrl('a%26b', 'form')).toBe('a&b');
  });

  it('decodes UTF-8 (component)', () => {
    expect(decodeUrl('caf%C3%A9', 'component')).toBe('café');
  });

  it('throws on invalid percent encoding', () => {
    expect(() => decodeUrl('%ZZ', 'component')).toThrow();
  });
});

describe('encode/decode round-trips', () => {
  const samples = [
    'hello world',
    'https://example.com/path with spaces?q=café & filtre=tout',
    'a&b=c',
    'plain',
    'éàü中日',
  ];

  it('round-trips for component', () => {
    for (const s of samples) {
      expect(decodeUrl(encodeUrl(s, 'component'), 'component')).toBe(s);
    }
  });

  it('round-trips for form', () => {
    for (const s of samples) {
      expect(decodeUrl(encodeUrl(s, 'form'), 'form')).toBe(s);
    }
  });

  it('round-trips for full when input is a valid URI', () => {
    const u = 'https://example.com/path?q=hello world';
    expect(decodeUrl(encodeUrl(u, 'full'), 'full')).toBe(u);
  });
});

describe('transformUrl', () => {
  it('dispatches encode/decode through one entry point', () => {
    expect(transformUrl('a b', 'encode', 'component')).toBe('a%20b');
    expect(transformUrl('a%20b', 'decode', 'component')).toBe('a b');
  });
});
