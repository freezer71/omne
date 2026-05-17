import { describe, it, expect } from 'vitest';
import {
  filterTools,
  matchesQuery,
  normalizeForSearch,
  type SearchableTool,
} from '@/lib/tools/search';

const merge: SearchableTool = {
  id: 'merge',
  category: 'pdf',
  href: '/pdf/merge',
  name: 'Merge PDFs',
  description: 'Combine multiple PDFs into one.',
  keywords: ['merge', 'combine', 'fusion', 'fusionner'],
  status: 'stable',
};
const compress: SearchableTool = {
  id: 'compress',
  category: 'image',
  href: '/image/compress',
  name: 'Compress image',
  description: 'Reduce image file size.',
  keywords: ['image', 'compress', 'compresser', 'réduire'],
  status: 'stable',
};
const trim: SearchableTool = {
  id: 'trim',
  category: 'video',
  href: '/video/trim',
  name: 'Trim video',
  description: 'Cut a clip out of a video.',
  keywords: ['video', 'trim', 'cut', 'découper'],
  status: 'stable',
};
const tools: SearchableTool[] = [merge, compress, trim];

describe('normalizeForSearch', () => {
  it('lowercases and strips diacritics', () => {
    expect(normalizeForSearch('Découper')).toBe('decouper');
    expect(normalizeForSearch('FUSIONNER')).toBe('fusionner');
    expect(normalizeForSearch('  Élégant  ')).toBe('  elegant  ');
  });
});

describe('matchesQuery', () => {
  it('returns true for empty/whitespace query', () => {
    expect(matchesQuery(merge, '')).toBe(true);
    expect(matchesQuery(merge, '   ')).toBe(true);
  });

  it('matches on tool name (case-insensitive)', () => {
    expect(matchesQuery(merge, 'merge')).toBe(true);
    expect(matchesQuery(merge, 'MERGE')).toBe(true);
  });

  it('matches on description', () => {
    expect(matchesQuery(merge, 'combine')).toBe(true);
  });

  it('matches on French keyword', () => {
    expect(matchesQuery(merge, 'fusion')).toBe(true);
  });

  it('is accent-insensitive in both directions', () => {
    expect(matchesQuery(trim, 'decouper')).toBe(true);
    expect(matchesQuery(trim, 'découper')).toBe(true);
    expect(matchesQuery(compress, 'reduire')).toBe(true);
  });

  it('requires every space-separated term to match somewhere', () => {
    expect(matchesQuery(compress, 'image compress')).toBe(true);
    expect(matchesQuery(merge, 'image compress')).toBe(false);
  });

  it('returns false when no term matches', () => {
    expect(matchesQuery(merge, 'xyzzy')).toBe(false);
  });
});

describe('filterTools', () => {
  it('returns all tools for empty query', () => {
    expect(filterTools(tools, '')).toHaveLength(tools.length);
    expect(filterTools(tools, '   ')).toHaveLength(tools.length);
  });

  it('filters to the merge tool when searching "fusion"', () => {
    const result = filterTools(tools, 'fusion');
    expect(result).toHaveLength(1);
    expect(result[0]?.id).toBe('merge');
  });

  it('returns an empty list when nothing matches', () => {
    expect(filterTools(tools, 'totalement-absent')).toEqual([]);
  });

  it('returns a copy (does not mutate the input)', () => {
    const original = [...tools];
    const result = filterTools(tools, '');
    expect(result).not.toBe(tools);
    expect(tools).toEqual(original);
  });
});
