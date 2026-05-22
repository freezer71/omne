import { describe, it, expect } from 'vitest';
import { getMatchRanges, mergeRanges } from '@/lib/tools/highlight';

describe('getMatchRanges', () => {
  it('returns empty for empty input', () => {
    expect(getMatchRanges('', 'anything')).toEqual([]);
    expect(getMatchRanges('text', '')).toEqual([]);
    expect(getMatchRanges('text', '   ')).toEqual([]);
  });

  it('finds a single substring', () => {
    const ranges = getMatchRanges('Merge PDFs', 'merge');
    expect(ranges).toEqual([[0, 5]]);
  });

  it('handles diacritics in haystack', () => {
    const ranges = getMatchRanges('Détourer une image', 'detourer');
    expect(ranges).toHaveLength(1);
    const [s, e] = ranges[0]!;
    expect('Détourer une image'.slice(s, e)).toBe('Détourer');
  });

  it('matches multiple terms', () => {
    const ranges = getMatchRanges('Merge multiple PDF files', 'merge pdf');
    const mapped = ranges.map(([s, e]) => 'Merge multiple PDF files'.slice(s, e).toLowerCase());
    expect(mapped).toContain('merge');
    expect(mapped).toContain('pdf');
  });

  it('finds all occurrences of a term', () => {
    const ranges = getMatchRanges('json to json', 'json');
    expect(ranges).toHaveLength(2);
  });

  it('merges overlapping ranges', () => {
    const merged = mergeRanges([[0, 5], [3, 8], [10, 12]]);
    expect(merged).toEqual([[0, 8], [10, 12]]);
  });
});
