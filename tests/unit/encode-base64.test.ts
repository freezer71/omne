import { describe, it, expect } from 'vitest';
import {
  encodeTextToBase64,
  encodeBytesToBase64,
  decodeBase64ToText,
  decodeBase64ToBytes,
  toDataUri,
  parseDataUri,
  sniffMimeAndExt,
} from '@/lib/tools/implementations/encode-base64';

describe('encodeTextToBase64', () => {
  it('returns empty string for empty input', () => {
    expect(encodeTextToBase64('')).toBe('');
  });

  it('encodes ASCII text', () => {
    expect(encodeTextToBase64('hello world')).toBe('aGVsbG8gd29ybGQ=');
  });

  it('encodes UTF-8 multi-byte characters', () => {
    expect(encodeTextToBase64('café')).toBe('Y2Fmw6k=');
    expect(encodeTextToBase64('你好')).toBe('5L2g5aW9');
  });

  it('produces URL-safe output when requested (no +/= and replaces / -> _)', () => {
    // The text ">>>?" classically encodes to "Pj4+Pw==" (contains + and =).
    const std = encodeTextToBase64('>>>?');
    expect(std).toBe('Pj4+Pw==');
    const safe = encodeTextToBase64('>>>?', { urlSafe: true });
    expect(safe).toBe('Pj4-Pw');
    expect(safe).not.toMatch(/[+/=]/);
  });

  it('wraps lines at 76 chars when requested', () => {
    const long = 'a'.repeat(200);
    const wrapped = encodeTextToBase64(long, { wrap: true });
    for (const line of wrapped.split('\n')) {
      expect(line.length).toBeLessThanOrEqual(76);
    }
  });
});

describe('encodeBytesToBase64 / decodeBase64ToBytes round-trip', () => {
  it('round-trips arbitrary bytes', () => {
    const bytes = new Uint8Array([0, 1, 2, 3, 254, 255, 128, 64]);
    const b64 = encodeBytesToBase64(bytes);
    const round = decodeBase64ToBytes(b64);
    expect(Array.from(round)).toEqual(Array.from(bytes));
  });

  it('round-trips a large buffer (>200 KB) without stack overflow', () => {
    const big = new Uint8Array(250_000);
    for (let i = 0; i < big.length; i++) big[i] = i & 0xff;
    const b64 = encodeBytesToBase64(big);
    const round = decodeBase64ToBytes(b64);
    expect(round.length).toBe(big.length);
    expect(round[0]).toBe(0);
    expect(round[big.length - 1]).toBe((big.length - 1) & 0xff);
  });
});

describe('decodeBase64ToText', () => {
  it('decodes standard base64', () => {
    expect(decodeBase64ToText('aGVsbG8gd29ybGQ=')).toBe('hello world');
  });

  it('decodes URL-safe base64 (no padding)', () => {
    expect(decodeBase64ToText('Pj4-Pw')).toBe('>>>?');
  });

  it('decodes UTF-8 properly', () => {
    expect(decodeBase64ToText('Y2Fmw6k=')).toBe('café');
  });

  it('tolerates whitespace / line wraps', () => {
    const wrapped = 'aGVsbG8g\nd29ybGQ=';
    expect(decodeBase64ToText(wrapped)).toBe('hello world');
  });

  it('throws on invalid input', () => {
    expect(() => decodeBase64ToBytes('not!valid!base64!')).toThrow();
  });
});

describe('data URI helpers', () => {
  it('toDataUri builds a clean data URI (no newlines in payload)', () => {
    const b64 = 'aGVsbG8g\nd29ybGQ=';
    expect(toDataUri(b64, 'text/plain')).toBe('data:text/plain;base64,aGVsbG8gd29ybGQ=');
  });

  it('toDataUri falls back to octet-stream when mime is empty', () => {
    expect(toDataUri('aGk=', '')).toBe('data:application/octet-stream;base64,aGk=');
  });

  it('parseDataUri extracts mime + base64 payload', () => {
    const r = parseDataUri('data:image/png;base64,iVBORw0KGgo=');
    expect(r).toEqual({ mime: 'image/png', base64: 'iVBORw0KGgo=' });
  });

  it('parseDataUri returns null for non-data inputs', () => {
    expect(parseDataUri('hello world')).toBeNull();
    expect(parseDataUri('http://x')).toBeNull();
  });
});

describe('sniffMimeAndExt', () => {
  it('detects PNG via magic bytes', () => {
    const png = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
    expect(sniffMimeAndExt(png)).toEqual({ mime: 'image/png', ext: 'png' });
  });

  it('detects JPEG', () => {
    const jpg = new Uint8Array([0xff, 0xd8, 0xff, 0xe0]);
    expect(sniffMimeAndExt(jpg)).toEqual({ mime: 'image/jpeg', ext: 'jpg' });
  });

  it('detects PDF', () => {
    const pdf = new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d]);
    expect(sniffMimeAndExt(pdf)).toEqual({ mime: 'application/pdf', ext: 'pdf' });
  });

  it('falls back to octet-stream for unknown bytes', () => {
    const random = new Uint8Array([0x00, 0x01, 0x02, 0x03]);
    expect(sniffMimeAndExt(random)).toEqual({ mime: 'application/octet-stream', ext: 'bin' });
  });
});
