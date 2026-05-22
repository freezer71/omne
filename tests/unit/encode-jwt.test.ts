import { describe, it, expect } from 'vitest';
import {
  decodeJwt,
  formatUnixSeconds,
  SAMPLE_JWT,
} from '@/lib/tools/implementations/encode-jwt';

describe('decodeJwt', () => {
  it('decodes the sample token', () => {
    const r = decodeJwt(SAMPLE_JWT, 1_700_000_001);
    expect(r.header).toEqual({ alg: 'HS256', typ: 'JWT' });
    expect(r.payload).toEqual({
      sub: '123',
      name: 'Jane',
      iat: 1_700_000_000,
      exp: 2_700_000_000,
    });
    expect(r.signature).toBe('L8i6g4tFCXJpvA8YjQNVPFhO4xMzlqgyVZxXJZmU3xQ');
    expect(r.iat).toBe(1_700_000_000);
    expect(r.exp).toBe(2_700_000_000);
    expect(r.status).toBe('valid');
  });

  it('flags expired tokens', () => {
    const r = decodeJwt(SAMPLE_JWT, 2_700_000_001);
    expect(r.status).toBe('expired');
  });

  it('flags not-yet-valid tokens (nbf in the future)', () => {
    // Header {"alg":"none"} -> "eyJhbGciOiJub25lIn0"
    // Payload {"nbf":2000000000} -> manually base64url-encoded
    const header = 'eyJhbGciOiJub25lIn0';
    const payload = Buffer.from(JSON.stringify({ nbf: 2_000_000_000 }))
      .toString('base64')
      .replace(/=+$/, '')
      .replace(/\+/g, '-')
      .replace(/\//g, '_');
    const token = `${header}.${payload}.sig`;
    const r = decodeJwt(token, 1_000_000_000);
    expect(r.nbf).toBe(2_000_000_000);
    expect(r.status).toBe('notYetValid');
  });

  it('returns status "unknown" when neither exp nor nbf are present', () => {
    const header = 'eyJhbGciOiJub25lIn0'; // {"alg":"none"}
    const payload = 'eyJzdWIiOiIxMjMifQ'; // {"sub":"123"}
    const token = `${header}.${payload}.s`;
    const r = decodeJwt(token);
    expect(r.status).toBe('unknown');
    expect(r.exp).toBeUndefined();
    expect(r.nbf).toBeUndefined();
  });

  it('throws when the token has the wrong number of segments', () => {
    expect(() => decodeJwt('a.b')).toThrow(/3 dot-separated segments/);
    expect(() => decodeJwt('a.b.c.d')).toThrow(/3 dot-separated segments/);
  });

  it('throws for an empty token', () => {
    expect(() => decodeJwt('')).toThrow();
  });

  it('throws when header or payload is not valid JSON', () => {
    // First two segments base64-decode to "??" — not JSON.
    expect(() => decodeJwt('Pz8.Pz8.sig')).toThrow();
  });

  it('throws when header is empty', () => {
    expect(() => decodeJwt('.eyJzdWIiOiIxIn0.sig')).toThrow();
  });

  it('handles UTF-8 in claims', () => {
    // payload = {"name":"café"}
    const payload = Buffer.from(JSON.stringify({ name: 'café' }))
      .toString('base64')
      .replace(/=+$/, '')
      .replace(/\+/g, '-')
      .replace(/\//g, '_');
    const r = decodeJwt(`eyJhbGciOiJub25lIn0.${payload}.s`);
    expect(r.payload['name']).toBe('café');
  });
});

describe('formatUnixSeconds', () => {
  it('renders a UTC date for a known epoch', () => {
    expect(formatUnixSeconds(1_700_000_000)).toMatch(/2023-11-14 22:13:20 UTC/);
  });

  it('returns the input for NaN', () => {
    expect(formatUnixSeconds(Number.NaN)).toBe('NaN');
  });
});
