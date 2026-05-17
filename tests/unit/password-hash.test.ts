import { describe, expect, it } from 'vitest';
import { hashText } from '@/lib/tools/implementations/password-hash';

describe('hashText (SHA family via Web Crypto)', () => {
  // Known test vectors (empty string)
  it('SHA-1 of empty string in hex matches known vector', async () => {
    await expect(hashText('', 'SHA-1', 'hex')).resolves.toBe(
      'da39a3ee5e6b4b0d3255bfef95601890afd80709',
    );
  });

  it('SHA-256 of empty string in hex matches known vector', async () => {
    await expect(hashText('', 'SHA-256', 'hex')).resolves.toBe(
      'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
    );
  });

  // Known test vectors ("abc")
  it('SHA-1 of "abc" matches known vector', async () => {
    await expect(hashText('abc', 'SHA-1', 'hex')).resolves.toBe(
      'a9993e364706816aba3e25717850c26c9cd0d89d',
    );
  });

  it('SHA-256 of "abc" matches known vector', async () => {
    await expect(hashText('abc', 'SHA-256', 'hex')).resolves.toBe(
      'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad',
    );
  });

  it('SHA-512 of "abc" produces a 128-char hex string', async () => {
    const out = await hashText('abc', 'SHA-512', 'hex');
    expect(out).toMatch(/^[a-f0-9]{128}$/);
  });

  it('SHA-384 produces a 96-char hex string', async () => {
    const out = await hashText('abc', 'SHA-384', 'hex');
    expect(out).toMatch(/^[a-f0-9]{96}$/);
  });

  it('base64 output is shorter than hex output for the same input', async () => {
    const hex = await hashText('abc', 'SHA-256', 'hex');
    const b64 = await hashText('abc', 'SHA-256', 'base64');
    expect(b64.length).toBeLessThan(hex.length);
    expect(b64).toMatch(/^[A-Za-z0-9+/]+=*$/);
  });

  it('utf-8 input produces consistent output', async () => {
    const a = await hashText('café', 'SHA-256', 'hex');
    const b = await hashText('café', 'SHA-256', 'hex');
    expect(a).toBe(b);
    expect(a).toMatch(/^[a-f0-9]{64}$/);
  });
});
