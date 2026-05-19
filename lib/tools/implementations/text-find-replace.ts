export type FindReplaceOptions = {
  regex: boolean;
  caseSensitive: boolean;
  wholeWord: boolean;
};

export type FindReplaceMatch = {
  index: number;
  length: number;
  match: string;
};

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function buildPattern(needle: string, options: FindReplaceOptions): RegExp | null {
  if (!needle) return null;
  let source = options.regex ? needle : escapeRegex(needle);
  if (options.wholeWord) source = `\\b(?:${source})\\b`;
  const flags = `g${options.caseSensitive ? '' : 'i'}`;
  try {
    return new RegExp(source, flags);
  } catch {
    return null;
  }
}

export function findOccurrences(input: string, needle: string, options: FindReplaceOptions): FindReplaceMatch[] {
  const re = buildPattern(needle, options);
  if (!re) return [];
  const matches: FindReplaceMatch[] = [];
  let safety = 0;
  for (const m of input.matchAll(re)) {
    safety++;
    if (safety > 100000) break;
    matches.push({ index: m.index ?? 0, length: m[0].length, match: m[0] });
  }
  return matches;
}

export function replaceOccurrences(input: string, needle: string, replacement: string, options: FindReplaceOptions): string {
  const re = buildPattern(needle, options);
  if (!re) return input;
  return input.replace(re, replacement);
}
