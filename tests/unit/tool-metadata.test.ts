import { describe, it, expect } from 'vitest';
import { getToolMetadata } from '@/lib/tools/metadata';

describe('getToolMetadata', () => {
  it('returns the English title and description for /pdf/merge', async () => {
    const meta = await getToolMetadata('pdf', 'merge', 'en');
    expect(meta.title).toBe('Merge PDFs');
    expect(meta.description).toMatch(/combine/i);
  });

  it('returns the French title and description for /pdf/merge', async () => {
    const meta = await getToolMetadata('pdf', 'merge', 'fr');
    expect(meta.title).toMatch(/fusionner/i);
    expect(meta.description).toMatch(/combinez|combinent/i);
  });

  it('returns an empty object for an unknown tool', async () => {
    const meta = await getToolMetadata('pdf', 'nope', 'en');
    expect(meta).toEqual({});
  });
});
