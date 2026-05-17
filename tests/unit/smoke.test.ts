import { describe, it, expect } from 'vitest';

describe('smoke: vitest unit runner (node env)', () => {
  it('runs a basic assertion', () => {
    expect(1 + 1).toBe(2);
  });

  it('supports async assertions', async () => {
    const value = await Promise.resolve('omne');
    expect(value).toBe('omne');
  });

  it('runs in node environment (no window)', () => {
    expect(typeof globalThis.window).toBe('undefined');
  });
});
