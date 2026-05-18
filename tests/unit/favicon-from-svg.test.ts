/**
 * @vitest-environment jsdom
 */
import { describe, it, expect } from 'vitest';
import { buildIco } from '@/lib/tools/implementations/favicon-from-svg';

const tinyPng = (marker: number) =>
  new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, marker, marker, marker, marker]);

describe('buildIco', () => {
  it('produces a valid ICO header for one PNG', () => {
    const out = buildIco([{ size: 32, bytes: tinyPng(0x01) }]);
    // ICONDIR: reserved=0, type=1, count=1 (all little-endian)
    expect(out[0]).toBe(0);
    expect(out[1]).toBe(0);
    expect(out[2]).toBe(1);
    expect(out[3]).toBe(0);
    expect(out[4]).toBe(1);
    expect(out[5]).toBe(0);
  });

  it('produces a header for three PNGs at 16/32/48', () => {
    const out = buildIco([
      { size: 16, bytes: tinyPng(0x01) },
      { size: 32, bytes: tinyPng(0x02) },
      { size: 48, bytes: tinyPng(0x03) },
    ]);
    expect(out[4]).toBe(3); // count
    // Directory entry 0: width=16, height=16
    expect(out[6]).toBe(16);
    expect(out[7]).toBe(16);
    // Directory entry 1: width=32
    expect(out[6 + 16]).toBe(32);
    // Directory entry 2: width=48
    expect(out[6 + 32]).toBe(48);
  });

  it('writes width=0 for sizes >= 256 (the ICO spec uses 0 to mean 256)', () => {
    const out = buildIco([{ size: 256, bytes: tinyPng(0x01) }]);
    expect(out[6]).toBe(0);
    expect(out[7]).toBe(0);
  });

  it('embedded payload is reachable at the declared offset', () => {
    const payload = tinyPng(0x42);
    const out = buildIco([{ size: 16, bytes: payload }]);
    const view = new DataView(out.buffer, out.byteOffset, out.byteLength);
    const offset = view.getUint32(6 + 12, true);
    const length = view.getUint32(6 + 8, true);
    expect(length).toBe(payload.length);
    for (let i = 0; i < payload.length; i++) {
      expect(out[offset + i]).toBe(payload[i]);
    }
  });
});
