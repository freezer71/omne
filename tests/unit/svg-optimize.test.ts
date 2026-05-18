import { describe, it, expect, vi } from 'vitest';

vi.mock('svgo', () => ({
  optimize: vi.fn((input: string) => ({ data: input.replace(/\s+/g, ' ').trim() })),
}));

import { optimizeSvg } from '@/lib/tools/implementations/svg-optimize';

describe('optimizeSvg (with svgo mocked)', () => {
  it('returns empty data for empty input', async () => {
    const r = await optimizeSvg('');
    expect(r.data).toBe('');
    expect(r.before).toBe(0);
    expect(r.after).toBe(0);
  });

  it('reports before and after byte counts in UTF-8', async () => {
    const markup = '<svg xmlns="http://www.w3.org/2000/svg">\n  <rect/>\n</svg>';
    const r = await optimizeSvg(markup);
    expect(r.before).toBeGreaterThan(0);
    expect(r.after).toBeGreaterThan(0);
    expect(r.after).toBeLessThan(r.before); // our mock collapses whitespace
  });

  it('computes savings as a fraction in [0, 1]', async () => {
    const markup = '<svg xmlns="http://www.w3.org/2000/svg">    <rect/>    </svg>';
    const r = await optimizeSvg(markup);
    expect(r.savings).toBeGreaterThan(0);
    expect(r.savings).toBeLessThanOrEqual(1);
  });

  it('passes plugin configuration to svgo.optimize', async () => {
    const { optimize } = await import('svgo');
    await optimizeSvg('<svg></svg>', { precision: 2, cleanupIds: false, removeViewBox: true, multipass: true });
    const call = (optimize as ReturnType<typeof vi.fn>).mock.calls.at(-1);
    expect(call).toBeDefined();
    const [, options] = call!;
    expect(options.multipass).toBe(true);
    expect(options.floatPrecision).toBe(2);
    const preset = options.plugins[0];
    expect(preset.name).toBe('preset-default');
    expect(preset.params.overrides.cleanupIds).toBe(false);
    expect(preset.params.overrides.removeViewBox).toEqual({});
  });
});
