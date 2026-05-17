import { describe, it, expect } from 'vitest';
import { getToolMetadata } from '@/lib/tools/metadata';

describe('getToolMetadata (façade)', () => {
  it('returns the English SEO title and description for /pdf/merge', async () => {
    const meta = await getToolMetadata('pdf', 'merge', 'en');
    expect(meta.title).toMatch(/merge pdf/i);
    expect(meta.description).toMatch(/combine/i);
  });

  it('returns the French SEO title and description for /pdf/merge', async () => {
    const meta = await getToolMetadata('pdf', 'merge', 'fr');
    expect(meta.title).toMatch(/fusionner/i);
    expect(meta.description).toMatch(/fusionnez/i);
  });

  it('returns an empty object for an unknown tool', async () => {
    const meta = await getToolMetadata('pdf', 'nope', 'en');
    expect(meta).toEqual({});
  });

  it('returns an empty object for an unknown category', async () => {
    const meta = await getToolMetadata('xyz', 'whatever', 'en');
    expect(meta).toEqual({});
  });
});
